import { ChevronDown, Gauge } from "lucide-react";
import { cn } from "@/lib/format";
import { LEVEL_STYLE, STATUS_STYLE } from "@/lib/styles";
import type { AnalysisReport, HealthIndicator } from "@/lib/types";
import { Badge, Card, EvidenceRefs, Section } from "../ui";

function ScoreRing({ score }: { score: number | null }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const stroke = score === null ? "stroke-slate-600" : score >= 70 ? "stroke-emerald-400" : score >= 40 ? "stroke-amber-400" : "stroke-rose-400";
  return (
    <div
      role="img"
      aria-label={score === null ? "Overall health score unavailable" : `Overall health score ${score} out of 100`}
      className="relative size-36 shrink-0"
    >
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="9" className="stroke-line" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - (score ?? 0) / 100)}
          className={stroke}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums">{score ?? "—"}</span>
        <span className="text-xs text-subtle">{score === null ? "no score" : "out of 100"}</span>
      </div>
    </div>
  );
}

function IndicatorCard({ indicator, onEvidence }: { indicator: HealthIndicator; onEvidence: (id: string) => void }) {
  const level = LEVEL_STYLE[indicator.level];
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-medium">{indicator.name}</h4>
        <Badge tone={level.tone}>{level.label}</Badge>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-line"
          role="meter"
          aria-label={`${indicator.name} score`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={indicator.score ?? undefined}
          aria-valuetext={indicator.score === null ? "Unknown" : `${indicator.score} out of 100`}
        >
          <div className={cn("h-full rounded-full", level.bar)} style={{ width: `${indicator.score ?? 0}%` }} />
        </div>
        <span className={cn("w-14 text-right text-sm font-semibold tabular-nums", level.text)}>
          {indicator.score === null ? "Unknown" : `${indicator.score}/100`}
        </span>
      </div>
      <p className="mt-3 text-sm text-muted">{indicator.rationale}</p>

      <details className="group mt-3 border-t border-line pt-3">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted hover:text-fg [&::-webkit-details-marker]:hidden">
          <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />
          How this score is calculated
        </summary>
        <p className="mt-2 text-sm text-muted">{indicator.method}</p>
        <div className="mt-3">
          <EvidenceRefs ids={indicator.evidence_ids} onSelect={onEvidence} />
        </div>
      </details>
    </Card>
  );
}

export function HealthOverview({
  report,
  onEvidence,
}: {
  report: Pick<AnalysisReport, "overall_score" | "maintenance_status" | "status_summary" | "indicators" | "methodology">;
  onEvidence: (id: string) => void;
}) {
  const status = STATUS_STYLE[report.maintenance_status];
  const unknown = report.indicators.filter((i) => i.score === null).length;

  return (
    <Section
      id="health"
      title="Health overview"
      icon={Gauge}
      description="Scores are transparent heuristics computed only from the collected evidence. They are not objective measures of quality."
    >
      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <Card className="flex items-center justify-center p-5">
          <ScoreRing score={report.overall_score} />
        </Card>
        <Card className="flex flex-col justify-center gap-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-subtle">Maintenance status</span>
            <Badge tone={status.tone}>
              <span className={cn("size-1.5 rounded-full", status.dot)} aria-hidden />
              {status.label}
            </Badge>
          </div>
          <p className="text-base">{report.status_summary}</p>
          <p className="text-sm text-muted">
            The overall score is a weighted mean of the indicators that had enough evidence
            {unknown > 0 ? `; ${unknown} of ${report.indicators.length} indicator${unknown > 1 ? "s were" : " was"} excluded as unknown.` : "."}
          </p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {report.indicators.map((i) => (
          <IndicatorCard key={i.key} indicator={i} onEvidence={onEvidence} />
        ))}
      </div>

      <Card className="mt-4">
        <details className="group p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
            Scoring methodology and limitations
          </summary>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted">
            {report.methodology.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </details>
      </Card>
    </Section>
  );
}
