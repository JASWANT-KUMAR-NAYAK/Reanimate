"use client";

import { LoaderCircle, Search } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { EXAMPLE_REPOS } from "@/lib/config";
import { parseRepoInput } from "@/lib/validate";

export function RepoForm({
  value,
  onChange,
  onSubmit,
  loading,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (url: string) => void;
  loading: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus({ preventScroll: true }), []);

  function submit(raw: string) {
    const parsed = parseRepoInput(raw);
    if (!parsed.ok) {
      setError(parsed.message);
      inputRef.current?.focus();
      return;
    }
    setError(null);
    onSubmit(parsed.url);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit(value);
  }

  function runExample(repo: string) {
    const url = `https://github.com/${repo}`;
    onChange(url);
    submit(url);
  }

  return (
    <div>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="repo-url" className="sr-only">
            GitHub repository URL
          </label>
          <input
            ref={inputRef}
            id="repo-url"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={value}
            disabled={loading}
            onChange={(e) => {
              onChange(e.target.value);
              if (error) setError(null);
            }}
            placeholder="https://github.com/owner/repository"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "repo-url-error" : undefined}
            className="h-12 w-full rounded-lg border border-line-strong bg-surface px-4 font-mono text-sm placeholder:text-subtle focus:border-accent disabled:opacity-60 aria-[invalid=true]:border-rose-500/70"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />}
          {loading ? "Analyzing…" : "Analyze Repository"}
        </button>
      </form>

      {error && (
        <p id="repo-url-error" role="alert" className="mt-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
        <span>Try an example:</span>
        {EXAMPLE_REPOS.map((repo) => (
          <button
            key={repo}
            type="button"
            disabled={loading}
            onClick={() => runExample(repo)}
            className="rounded-md border border-line bg-surface px-2.5 py-1 font-mono text-xs hover:border-accent/60 hover:text-fg disabled:opacity-50"
          >
            {repo}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-subtle">Public repositories only. Reanimate reads GitHub&apos;s public API data and never runs repository code.</p>
    </div>
  );
}
