/** Mirrors backend/app/schemas.py. Timestamps are ISO-8601 strings. */

export type Level = "strong" | "fair" | "weak" | "unknown";
export type Priority = "high" | "medium" | "low";
export type Complexity = "low" | "medium" | "high";
export type Confidence = "high" | "medium" | "low";
export type MaintenanceStatus = "archived" | "active" | "slowing" | "dormant" | "inactive" | "unknown";
export type EvidenceKind = "observed" | "derived";
export type EvidenceValue = string | number | boolean | null;

export interface RepoMetadata {
  owner: string;
  name: string;
  full_name: string;
  url: string;
  description: string | null;
  stars: number;
  forks: number;
  default_branch: string;
  created_at: string;
  pushed_at: string | null;
  language: string | null;
  topics: string[];
  archived: boolean;
  license: string | null;
}

export interface Evidence {
  id: string;
  category: string;
  kind: EvidenceKind;
  observed_value: EvidenceValue;
  source: string;
  observed_at: string | null;
  indicates: string;
  limitation: string | null;
}

export interface HealthIndicator {
  key: string;
  name: string;
  score: number | null;
  level: Level;
  rationale: string;
  method: string;
  evidence_ids: string[];
}

export interface RoadmapItem {
  title: string;
  description: string;
  priority: Priority;
  reason: string;
  evidence_ids: string[];
  complexity: Complexity;
  contributor_type: string;
  expected_outcome: string;
}

export interface Roadmap {
  immediate: RoadmapItem[];
  short_term: RoadmapItem[];
  long_term: RoadmapItem[];
}

export interface AIInsight {
  title: string;
  explanation: string;
  evidence_ids: string[];
  confidence: Confidence;
}

export interface AIInsights {
  summary: string;
  findings: AIInsight[];
  opportunities: AIInsight[];
  model: string;
  generated_at: string;
}

export interface AnalysisReport {
  repository: RepoMetadata;
  maintenance_status: MaintenanceStatus;
  status_summary: string;
  overall_score: number | null;
  indicators: HealthIndicator[];
  evidence: Evidence[];
  roadmap: Roadmap;
  ai_insights: AIInsights | null;
  limitations: string[];
  methodology: string[];
  generated_at: string;
}
