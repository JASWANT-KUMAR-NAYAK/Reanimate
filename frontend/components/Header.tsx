"use client";

import { HeartPulse, Menu, RotateCcw, X } from "lucide-react";
import { useState } from "react";

const SECTIONS = [
  ["overview", "Overview"],
  ["health", "Health"],
  ["ai-insights", "AI insights"],
  ["evidence", "Evidence"],
  ["roadmap", "Roadmap"],
  ["limitations", "Limitations"],
] as const;

const linkClass = "rounded-md px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg";

export function Header({ hasReport, onReset }: { hasReport: boolean; onReset: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <button type="button" onClick={onReset} className="flex items-center gap-2 text-base font-semibold tracking-tight" aria-label="Reanimate home">
          <HeartPulse className="size-5 text-accent" aria-hidden />
          Reanimate
        </button>

        {hasReport ? (
          <>
            <nav aria-label="Report sections" className="hidden items-center gap-0.5 md:flex">
              {SECTIONS.map(([id, label]) => (
                <a key={id} href={`#${id}`} className={linkClass}>
                  {label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-surface-2 px-3 py-1.5 text-sm font-medium hover:border-accent/60"
              >
                <RotateCcw className="size-4" aria-hidden />
                <span className="hidden sm:inline">Analyze another</span>
                <span className="sm:hidden">New</span>
              </button>
              <button
                type="button"
                className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg md:hidden"
                aria-expanded={open}
                aria-controls="mobile-nav"
                aria-label={open ? "Close section menu" : "Open section menu"}
                onClick={() => setOpen((o) => !o)}
              >
                {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
              </button>
            </div>
          </>
        ) : (
          <a href="#how-it-works" className={linkClass}>
            How it works
          </a>
        )}
      </div>

      {hasReport && open && (
        <nav id="mobile-nav" aria-label="Report sections" className="border-t border-line bg-bg px-4 py-2 md:hidden">
          <ul className="grid grid-cols-2 gap-1">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} onClick={() => setOpen(false)} className={`${linkClass} block`}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
