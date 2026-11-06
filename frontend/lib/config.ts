export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/+$/, "");

/** GitHub collection plus an optional local-model call can take a while; fail clearly instead of hanging forever. */
export const REQUEST_TIMEOUT_MS = 180_000;

export const EXAMPLE_REPOS = ["psf/requests", "expressjs/express"] as const;
