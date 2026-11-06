import type { Complexity, Confidence, Level, MaintenanceStatus, Priority } from "./types";

export const STATUS_STYLE: Record<MaintenanceStatus, { label: string; tone: string; dot: string }> = {
  active: { label: "Active", tone: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30", dot: "bg-emerald-400" },
  slowing: { label: "Slowing", tone: "bg-amber-500/10 text-amber-300 ring-amber-500/30", dot: "bg-amber-400" },
  dormant: { label: "Dormant", tone: "bg-orange-500/10 text-orange-300 ring-orange-500/30", dot: "bg-orange-400" },
  inactive: { label: "Inactive", tone: "bg-rose-500/10 text-rose-300 ring-rose-500/30", dot: "bg-rose-400" },
  archived: { label: "Archived", tone: "bg-slate-500/15 text-slate-300 ring-slate-400/30", dot: "bg-slate-400" },
  unknown: { label: "Unknown", tone: "bg-slate-500/15 text-slate-300 ring-slate-400/30", dot: "bg-slate-400" },
};

export const LEVEL_STYLE: Record<Level, { label: string; tone: string; bar: string; text: string }> = {
  strong: { label: "Strong", tone: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30", bar: "bg-emerald-400", text: "text-emerald-300" },
  fair: { label: "Fair", tone: "bg-amber-500/10 text-amber-300 ring-amber-500/30", bar: "bg-amber-400", text: "text-amber-300" },
  weak: { label: "Weak", tone: "bg-rose-500/10 text-rose-300 ring-rose-500/30", bar: "bg-rose-400", text: "text-rose-300" },
  unknown: { label: "Unknown", tone: "bg-slate-500/15 text-slate-300 ring-slate-400/30", bar: "bg-slate-500", text: "text-slate-300" },
};

export const PRIORITY_STYLE: Record<Priority, { label: string; tone: string }> = {
  high: { label: "High priority", tone: "bg-rose-500/10 text-rose-300 ring-rose-500/30" },
  medium: { label: "Medium priority", tone: "bg-amber-500/10 text-amber-300 ring-amber-500/30" },
  low: { label: "Low priority", tone: "bg-sky-500/10 text-sky-300 ring-sky-500/30" },
};

export const COMPLEXITY_LABEL: Record<Complexity, string> = { low: "Low complexity", medium: "Medium complexity", high: "High complexity" };

export const CONFIDENCE_STYLE: Record<Confidence, { label: string; tone: string }> = {
  high: { label: "High confidence", tone: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30" },
  medium: { label: "Medium confidence", tone: "bg-amber-500/10 text-amber-300 ring-amber-500/30" },
  low: { label: "Low confidence", tone: "bg-slate-500/15 text-slate-300 ring-slate-400/30" },
};

export const NEUTRAL_TONE = "bg-slate-500/15 text-slate-300 ring-slate-400/30";

export const KIND_STYLE = {
  observed: { label: "Observed", tone: "bg-sky-500/10 text-sky-300 ring-sky-500/30" },
  derived: { label: "Derived", tone: "bg-violet-500/10 text-violet-300 ring-violet-500/30" },
} as const;
