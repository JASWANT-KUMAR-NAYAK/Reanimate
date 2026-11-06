import { Bot, Lightbulb, Sparkles } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { CONFIDENCE_STYLE } from "@/lib/styles";
import type { AIInsight, AnalysisReport } from "@/lib/types";
import { Badge, Card, EvidenceRefs, Section } from "../ui";

function InsightCard({ insight, onEvidence }: { insight: AIInsight; onEvidence: (id: string) => void }) {
  const conf = CONFIDENCE_STYLE[insight.confidence];
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-medium">{insight.title}</h4>
        <Badge tone={conf.tone}>{conf.label}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted">{insight.explanation}</p>
      <div className="mt-3">
        <EvidenceRefs ids={insight.evidence_ids} onSelect={onEvidence} />
      </div>
    </Card>
  );
}

function InsightList({ title, icon: Icon, items, empty, onEvidence }: { title: string; icon: typeof Bot; items: AIInsight[]; empty: string; onEvidence: (id: string) => void }) {
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
        <Icon className="size-4" aria-hidden />
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-4 text-sm text-subtle">{empty}</p>
      ) : (
        <div className="space-y-3">
          {items.map((i) => (
            <InsightCard key={i.title} insight={i} onEvidence={onEvidence} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AIInsightsSection({ report, onEvidence }: { report: Pick<AnalysisReport, "ai_insights" | "limitations">; onEvidence: (id: string) => void }) {
  const ai = report.ai_insights;
  const reasons = report.limitations.filter((l) => l.startsWith("AI insights"));

  return (
    <Section
      id="ai-insights"
      title="AI insights"
      icon={Sparkles}
      description="An interpretation of the evidence by an open-weight model. Treat it as informed commentary, not established fact."
    >
      {ai ? (
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
              <Badge tone="bg-violet-500/10 text-violet-300 ring-violet-500/30">AI interpretation</Badge>
              {ai.model && <span className="font-mono">{ai.model}</span>}
              <span>· generated {formatDateTime(ai.generated_at)}</span>
            </div>
            <p className="mt-3 text-base leading-relaxed">{ai.summary}</p>
            <p className="mt-3 text-xs text-subtle">Every finding below cites evidence IDs. Select one to inspect the underlying observation.</p>
          </Card>
          <div className="grid gap-6 lg:grid-cols-2">
            <InsightList title="Findings" icon={Bot} items={ai.findings} empty="The model reported no findings for this evidence." onEvidence={onEvidence} />
            <InsightList title="Contributor opportunities" icon={Lightbulb} items={ai.opportunities} empty="The model reported no contributor opportunities." onEvidence={onEvidence} />
          </div>
        </div>
      ) : (
        <Card className="p-5">
          <p className="font-medium">AI insights are not available for this report</p>
          <p className="mt-1 text-sm text-muted">
            The deterministic analysis is complete: the health indicators, evidence and revival roadmap on this page do not depend on the AI model.
          </p>
          {reasons.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-subtle">
              {reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </Section>
  );
}
