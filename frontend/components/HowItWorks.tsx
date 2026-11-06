import { Bot, Database, FileSearch, Gauge } from "lucide-react";
import { Card } from "./ui";

const STEPS = [
  { icon: Database, title: "Collect", text: "Reads public GitHub data: metadata, commits, releases, issues, pull requests, contributors, README and community files." },
  { icon: FileSearch, title: "Extract evidence", text: "Every observation gets an ID, a source, and its limitations, and is labelled observed or derived." },
  { icon: Gauge, title: "Score health", text: "Seven transparent heuristics rate maintenance, consistency, community, issues, releases, docs and contribution access." },
  { icon: Bot, title: "Interpret", text: "An optional local open-weight model explains patterns and cites evidence IDs. The revival roadmap comes from deterministic rules." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="mt-16 scroll-mt-24">
      <h2 id="how-title" className="text-lg font-semibold tracking-tight">
        How the analysis works
      </h2>
      <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <li key={title}>
            <Card className="h-full p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icon className="size-4 text-accent" aria-hidden />
                <span className="text-subtle">{i + 1}.</span> {title}
              </div>
              <p className="mt-2 text-sm text-muted">{text}</p>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}
