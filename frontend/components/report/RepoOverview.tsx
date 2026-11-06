import { Archive, Calendar, Clock, Code, ExternalLink, GitBranch, GitFork, Scale, Star, Telescope } from "lucide-react";
import { formatCompact, formatDate, relativeTime } from "@/lib/format";
import type { RepoMetadata } from "@/lib/types";
import { Badge, Card, Section } from "../ui";

export function RepoOverview({ repo }: { repo: RepoMetadata }) {
  const stats = [
    { icon: Star, label: "Stars", value: repo.stars.toLocaleString("en-US"), title: `${formatCompact(repo.stars)} stars` },
    { icon: GitFork, label: "Forks", value: repo.forks.toLocaleString("en-US") },
    { icon: Code, label: "Primary language", value: repo.language ?? "Not detected" },
    { icon: Clock, label: "Last push", value: repo.pushed_at ? `${formatDate(repo.pushed_at)} (${relativeTime(repo.pushed_at)})` : "Unknown" },
    { icon: Archive, label: "Archived", value: repo.archived ? "Yes (read-only)" : "No" },
    { icon: Scale, label: "License", value: repo.license ?? "None detected" },
    { icon: Calendar, label: "Created", value: formatDate(repo.created_at) },
    { icon: GitBranch, label: "Default branch", value: repo.default_branch },
  ];
  const safeUrl = repo.url.startsWith("https://github.com/") ? repo.url : null;

  return (
    <Section id="overview" title="Repository overview" icon={Telescope}>
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words text-xl font-semibold tracking-tight">
              <span className="text-muted">{repo.owner} / </span>
              {repo.name}
            </h3>
            <p className="mt-1.5 max-w-3xl text-sm text-muted">{repo.description ?? "No description provided."}</p>
          </div>
          <div className="flex items-center gap-2">
            {repo.archived && <Badge>Archived</Badge>}
            {safeUrl && (
              <a
                href={safeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-surface-2 px-3 py-1.5 text-sm hover:border-accent/60"
              >
                View on GitHub
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
          </div>
        </div>

        {repo.topics.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Repository topics">
            {repo.topics.map((t) => (
              <li key={t} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-muted">
                {t}
              </li>
            ))}
          </ul>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-line pt-5 sm:grid-cols-4">
          {stats.map(({ icon: Icon, label, value, title }) => (
            <div key={label} className="min-w-0">
              <dt className="flex items-center gap-1.5 text-xs text-subtle">
                <Icon className="size-3.5" aria-hidden />
                {label}
              </dt>
              <dd title={title} className="mt-0.5 break-words text-sm font-medium">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
    </Section>
  );
}
