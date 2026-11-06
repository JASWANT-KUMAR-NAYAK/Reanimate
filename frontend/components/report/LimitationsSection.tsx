import { Info, TriangleAlert } from "lucide-react";
import { Card, Section } from "../ui";

export function LimitationsSection({ limitations }: { limitations: string[] }) {
  return (
    <Section
      id="limitations"
      title="Limitations"
      icon={TriangleAlert}
      description="Missing data, unavailable services and known constraints that affect how far this analysis can be trusted."
    >
      <Card>
        {limitations.length === 0 ? (
          <p className="p-5 text-sm text-muted">No limitations were reported.</p>
        ) : (
          <ul className="divide-y divide-line">
            {limitations.map((l) => (
              <li key={l} className="flex items-start gap-3 px-5 py-3 text-sm text-muted">
                <Info className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden />
                {l}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Section>
  );
}
