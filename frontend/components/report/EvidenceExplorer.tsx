"use client";

import { ChevronDown, Database, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn, formatDateTime, formatEvidenceValue } from "@/lib/format";
import { KIND_STYLE } from "@/lib/styles";
import type { Evidence, EvidenceKind } from "@/lib/types";
import { Badge, Card, Section } from "../ui";

export interface FocusRequest {
  id: string;
  nonce: number;
}

const controlClass = "h-9 rounded-md border border-line-strong bg-surface px-3 text-sm focus:border-accent";

export function EvidenceExplorer({ evidence, focus }: { evidence: Evidence[]; focus: FocusRequest | null }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [kind, setKind] = useState<"all" | EvidenceKind>("all");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [highlight, setHighlight] = useState<string | null>(null);

  const categories = useMemo(() => [...new Set(evidence.map((e) => e.category))].sort(), [evidence]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return evidence.filter(
      (e) =>
        (category === "all" || e.category === category) &&
        (kind === "all" || e.kind === kind) &&
        (!q || [e.id, e.category, e.source, e.indicates, formatEvidenceValue(e)].some((s) => s.toLowerCase().includes(q))),
    );
  }, [evidence, query, category, kind]);

  useEffect(() => {
    if (!focus) return;
    setQuery("");
    setCategory("all");
    setKind("all");
    setOpen((prev) => new Set(prev).add(focus.id));
    setHighlight(focus.id);
    const scroll = setTimeout(() => document.getElementById(`evidence-${focus.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
    const clear = setTimeout(() => setHighlight(null), 2500);
    return () => {
      clearTimeout(scroll);
      clearTimeout(clear);
    };
  }, [focus]);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const allOpen = visible.length > 0 && visible.every((e) => open.has(e.id));

  return (
    <Section
      id="evidence"
      title="Evidence explorer"
      icon={Database}
      description="Every claim in this report traces back to an item below. Observed items are raw GitHub data; derived items are computed from them."
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <label htmlFor="evidence-search" className="sr-only">
            Search evidence
          </label>
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-subtle" aria-hidden />
          <input
            id="evidence-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search evidence…"
            className={cn(controlClass, "w-full pl-9")}
          />
        </div>
        <label className="sr-only" htmlFor="evidence-category">
          Filter by category
        </label>
        <select id="evidence-category" value={category} onChange={(e) => setCategory(e.target.value)} className={controlClass}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="evidence-kind">
          Filter by type
        </label>
        <select id="evidence-kind" value={kind} onChange={(e) => setKind(e.target.value as "all" | EvidenceKind)} className={controlClass}>
          <option value="all">Observed &amp; derived</option>
          <option value="observed">Observed only</option>
          <option value="derived">Derived only</option>
        </select>
        <button
          type="button"
          disabled={visible.length === 0}
          onClick={() => setOpen(allOpen ? new Set() : new Set(visible.map((e) => e.id)))}
          className={cn(controlClass, "hover:border-accent/60 disabled:opacity-50")}
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>
      <p className="mb-3 text-xs text-subtle" aria-live="polite">
        Showing {visible.length} of {evidence.length} evidence items
      </p>

      {visible.length === 0 ? (
        <Card className="p-5 text-sm text-muted">No evidence matches these filters.</Card>
      ) : (
        <ul className="space-y-2">
          {visible.map((e) => {
            const isOpen = open.has(e.id);
            return (
              <li
                key={e.id}
                id={`evidence-${e.id}`}
                className={cn("scroll-mt-28 rounded-lg border bg-surface transition-colors", highlight === e.id ? "border-accent ring-1 ring-accent/60" : "border-line")}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`evidence-${e.id}-details`}
                  onClick={() => toggle(e.id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left"
                >
                  <ChevronDown className={cn("mt-1 size-4 shrink-0 text-subtle transition-transform", isOpen && "rotate-180")} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="font-mono text-sm">{e.id}</code>
                      <Badge tone={KIND_STYLE[e.kind].tone}>{KIND_STYLE[e.kind].label}</Badge>
                      <span className="text-xs text-subtle">{e.category}</span>
                    </div>
                    <p className="mt-1 break-words text-sm text-muted">{formatEvidenceValue(e)}</p>
                  </div>
                </button>
                {isOpen && (
                  <dl id={`evidence-${e.id}-details`} className="grid gap-3 border-t border-line px-4 py-3 text-sm sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-subtle">What this indicates</dt>
                      <dd className="mt-0.5">{e.indicates}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-subtle">Source</dt>
                      <dd className="mt-0.5 break-all font-mono text-xs">{e.source}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-subtle">Observed at</dt>
                      <dd className="mt-0.5">{e.observed_at ? formatDateTime(e.observed_at) : "Not time-specific"}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-subtle">Limitations</dt>
                      <dd className="mt-0.5">{e.limitation ?? "None recorded"}</dd>
                    </div>
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
