import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import { NEUTRAL_TONE } from "@/lib/styles";

export function Badge({ tone = NEUTRAL_TONE, className, children }: { tone?: string; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset", tone, className)}>
      {children}
    </span>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-xl border border-line bg-surface", className)}>{children}</div>;
}

export function Section({
  id,
  title,
  icon: Icon,
  description,
  actions,
  children,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={`${id}-title`} className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Icon className="size-5 text-accent" aria-hidden />
            {title}
          </h2>
          {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Evidence IDs rendered as buttons that jump to the matching row in the evidence explorer. */
export function EvidenceRefs({ ids, onSelect }: { ids: string[]; onSelect: (id: string) => void }) {
  if (ids.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-subtle">Evidence:</span>
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          aria-label={`Show evidence ${id}`}
          className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-muted transition-colors hover:border-accent/60 hover:text-accent"
        >
          {id}
        </button>
      ))}
    </div>
  );
}
