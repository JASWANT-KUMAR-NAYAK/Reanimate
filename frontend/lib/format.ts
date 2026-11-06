import type { Evidence } from "./types";

export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

const dateFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });
const compactFmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const relFmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
export const formatCompact = (n: number) => compactFmt.format(n);

export function relativeTime(iso: string, now = Date.now()): string {
  const days = Math.round((new Date(iso).getTime() - now) / 86_400_000);
  const abs = Math.abs(days);
  if (abs < 1) return "today";
  if (abs < 30) return relFmt.format(days, "day");
  if (abs < 365) return relFmt.format(Math.round(days / 30), "month");
  return relFmt.format(Math.round(days / 365), "year");
}

export function formatDuration(seconds: number): string {
  if (seconds < 90) return `${seconds} seconds`;
  return `${Math.ceil(seconds / 60)} minutes`;
}

/** Human-readable evidence value; units are inferred from the evidence ID naming used by the backend. */
export function formatEvidenceValue(e: Evidence): string {
  const v = e.observed_value;
  if (v === null) return "None / not detected";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string") return v;
  if (e.id.endsWith("_share")) return `${Math.round(v * 100)}%`;
  const unit = e.id.includes("days") ? " days" : e.id.includes("months") ? " months" : e.id.endsWith("_length") ? " characters" : "";
  return `${v.toLocaleString("en-US")}${unit}`;
}
