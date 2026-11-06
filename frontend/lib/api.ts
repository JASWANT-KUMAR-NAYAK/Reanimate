import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "./config";
import type { AnalysisReport } from "./types";

export type ApiErrorCode =
  | "network"
  | "timeout"
  | "bad_response"
  | "validation"
  | "invalid_url"
  | "repo_not_found"
  | "github_rate_limited"
  | "github_timeout"
  | "github_unavailable"
  | "internal_error"
  | "http_error";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;
  /** Seconds, from the Retry-After header on rate-limit responses. */
  readonly retryAfter?: number;

  constructor(message: string, code: ApiErrorCode, status?: number, retryAfter?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

function isAnalysisReport(v: unknown): v is AnalysisReport {
  if (!isObject(v) || !isObject(v.repository) || !isObject(v.roadmap)) return false;
  return (
    Array.isArray(v.indicators) &&
    Array.isArray(v.evidence) &&
    Array.isArray(v.limitations) &&
    Array.isArray(v.methodology) &&
    Array.isArray(v.roadmap.immediate) &&
    Array.isArray(v.roadmap.short_term) &&
    Array.isArray(v.roadmap.long_term)
  );
}

/** The backend returns {error:{code,message}} for its own errors and FastAPI's {detail:[...]} for request validation. */
function toApiError(res: Response, body: unknown): ApiError {
  const retry = Number(res.headers.get("Retry-After"));
  const retryAfter = Number.isFinite(retry) && retry > 0 ? retry : undefined;
  if (isObject(body) && isObject(body.error) && typeof body.error.message === "string") {
    const code = typeof body.error.code === "string" ? (body.error.code as ApiErrorCode) : "http_error";
    return new ApiError(body.error.message, code, res.status, retryAfter);
  }
  if (isObject(body) && Array.isArray(body.detail)) {
    return new ApiError("The request was rejected as invalid. Check the repository URL.", "validation", res.status);
  }
  return new ApiError(`The API responded with HTTP ${res.status}.`, "http_error", res.status, retryAfter);
}

export async function analyzeRepository(url: string, signal?: AbortSignal): Promise<AnalysisReport> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new ApiError("The analysis took too long and was stopped. Try again, or disable slow AI analysis on the backend.", "timeout");
    }
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(
      `Could not reach the Reanimate API at ${API_BASE_URL}. Make sure the backend is running and that its CORS_ORIGINS includes ${typeof window === "undefined" ? "this site" : window.location.origin}.`,
      "network",
    );
  }

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) throw toApiError(res, body);
  if (!isAnalysisReport(body)) throw new ApiError("The API returned a response in an unexpected format.", "bad_response", res.status);
  return { ...body, ai_insights: body.ai_insights ?? null };
}
