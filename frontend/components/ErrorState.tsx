import { RotateCcw, TriangleAlert } from "lucide-react";
import { ApiError, type ApiErrorCode } from "@/lib/api";
import { formatDuration } from "@/lib/format";

const COPY: Partial<Record<ApiErrorCode, { title: string; hint?: string; retry: boolean }>> = {
  invalid_url: { title: "Invalid repository URL", hint: "Use the form https://github.com/owner/repository.", retry: false },
  validation: { title: "Invalid repository URL", hint: "Use the form https://github.com/owner/repository.", retry: false },
  repo_not_found: { title: "Repository not found", hint: "Check the spelling. Only public repositories can be analyzed.", retry: false },
  github_rate_limited: { title: "GitHub rate limit reached", retry: true },
  github_timeout: { title: "GitHub took too long to respond", retry: true },
  github_unavailable: { title: "GitHub is unavailable", retry: true },
  timeout: { title: "The analysis timed out", retry: true },
  network: { title: "Can't reach the Reanimate API", retry: true },
  bad_response: { title: "Unexpected response from the API", retry: true },
  internal_error: { title: "The analysis failed on the server", retry: true },
};

export function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const api = error instanceof ApiError ? error : null;
  const copy = (api && COPY[api.code]) || { title: "Something went wrong", retry: true };
  const hint =
    api?.code === "github_rate_limited" && api.retryAfter
      ? `Try again in about ${formatDuration(api.retryAfter)}, or set GITHUB_TOKEN on the backend for a much higher limit.`
      : copy.hint;

  return (
    <div role="alert" className="mt-8 rounded-xl border border-rose-500/30 bg-rose-500/5 p-5">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-rose-300" aria-hidden />
        <div className="flex-1">
          <p className="font-medium text-rose-100">{copy.title}</p>
          <p className="mt-1 text-sm text-rose-100/80">{error.message}</p>
          {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
        </div>
        {copy.retry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm hover:border-accent/60"
          >
            <RotateCcw className="size-4" aria-hidden />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
