"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";
import type { AnalysisReport } from "@/lib/types";
import { AIInsightsSection } from "./report/AIInsightsSection";
import { EvidenceExplorer, type FocusRequest } from "./report/EvidenceExplorer";
import { HealthOverview } from "./report/HealthOverview";
import { LimitationsSection } from "./report/LimitationsSection";
import { RepoOverview } from "./report/RepoOverview";
import { RoadmapSection } from "./report/RoadmapSection";
import { Download } from "lucide-react";
import { downloadMarkdownReport } from "@/lib/export";


type CopyState = "idle" | "copied" | "failed";

export function ReportView({ report }: { report: AnalysisReport }) {
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const [copy, setCopy] = useState<CopyState>("idle");

  useEffect(() => {
    if (copy === "idle") return;
    const t = setTimeout(() => setCopy("idle"), 2500);
    return () => clearTimeout(t);
  }, [copy]);

  const focusEvidence = (id: string) => setFocus((f) => ({ id, nonce: (f?.nonce ?? 0) + 1 }));

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  }

  return (
    <div className="space-y-12 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-subtle">Analysis report</p>
          <p className="text-sm text-muted">Generated {formatDateTime(report.generated_at)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span role="status" className="text-sm text-muted">
            {copy === "copied" && "Report JSON copied to clipboard"}
            {copy === "failed" && "Copy failed. Your browser blocked clipboard access."}
          </span>
          <button
            type="button"
            onClick={copyJson}
            className="inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-surface-2 px-3 py-1.5 text-sm font-medium hover:border-accent/60"
          >
            {copy === "copied" ? <Check className="size-4 text-accent" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            Copy report as JSON
          </button>
          <button
            type="button"
            onClick={() => downloadMarkdownReport(report)}
            className="inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-surface-2 px-3 py-1.5 text-sm font-medium hover:border-accent/60"
          >
            <Download className="size-4" aria-hidden />
            Download report as Markdown
          </button>
        </div>
      </div>

      <RepoOverview repo={report.repository} />
      <HealthOverview report={report} onEvidence={focusEvidence} />
      <AIInsightsSection report={report} onEvidence={focusEvidence} />
      <EvidenceExplorer evidence={report.evidence} focus={focus} />
      <RoadmapSection roadmap={report.roadmap} onEvidence={focusEvidence} />
      <LimitationsSection limitations={report.limitations} />
    </div>
  );
}
