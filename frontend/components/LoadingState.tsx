"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "./ui";

const STEPS = [
  "Fetching repository data from the GitHub API",
  "Extracting evidence and computing health indicators",
  "Generating AI insights, when enabled on the server (this step can take a minute or more)",
];

export function LoadingState({ repo, onCancel }: { repo: string; onCancel: () => void }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Card className="mt-8 p-5" >
      <div role="status" aria-live="polite" className="flex items-start gap-3">
        <LoaderCircle className="mt-0.5 size-5 shrink-0 animate-spin text-accent" aria-hidden />
        <div className="flex-1">
          <p className="font-medium">
            Analyzing <span className="font-mono text-accent">{repo}</span>
          </p>
          <p className="mt-0.5 text-sm text-muted">{elapsed}s elapsed. The server performs these steps in a single request:</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted">
            {STEPS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
        <button type="button" onClick={onCancel} className="rounded-md border border-line-strong px-3 py-1.5 text-sm hover:border-rose-500/60">
          Cancel
        </button>
      </div>
      <div className="mt-4 h-1 overflow-hidden rounded bg-line" aria-hidden>
        <div className="h-full w-1/3 animate-pulse rounded bg-accent/70" />
      </div>
    </Card>
  );
}
