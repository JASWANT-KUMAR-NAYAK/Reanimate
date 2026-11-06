from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field

Level = Literal["strong", "fair", "weak", "unknown"]
Priority = Literal["high", "medium", "low"]
Complexity = Literal["low", "medium", "high"]
MaintenanceStatus = Literal["archived", "active", "slowing", "dormant", "inactive", "unknown"]


class AnalyzeRequest(BaseModel):
    url: str = Field(min_length=1, max_length=300, description="Public GitHub repository URL")


class RepoMetadata(BaseModel):
    owner: str
    name: str
    full_name: str
    url: str
    description: str | None
    stars: int
    forks: int
    default_branch: str
    created_at: datetime
    pushed_at: datetime | None
    language: str | None
    topics: list[str]
    archived: bool
    license: str | None


class Evidence(BaseModel):
    id: str
    category: str
    kind: Literal["observed", "derived"]
    observed_value: str | int | float | bool | None
    source: str
    observed_at: datetime | None = None
    indicates: str
    limitation: str | None = None


class HealthIndicator(BaseModel):
    key: str
    name: str
    score: int | None = Field(description="0-100, or null when evidence is insufficient")
    level: Level
    rationale: str
    method: str
    evidence_ids: list[str]


class RoadmapItem(BaseModel):
    title: str
    description: str
    priority: Priority
    reason: str
    evidence_ids: list[str]
    complexity: Complexity
    contributor_type: str
    expected_outcome: str


class Roadmap(BaseModel):
    immediate: list[RoadmapItem]
    short_term: list[RoadmapItem]
    long_term: list[RoadmapItem]


class AIInsight(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    explanation: str = Field(min_length=10, max_length=1200)
    evidence_ids: list[str] = Field(min_length=1)
    confidence: Literal["high", "medium", "low"]


class AIInsights(BaseModel):
    summary: str = Field(min_length=20, max_length=1600)
    findings: list[AIInsight] = Field(default_factory=list, max_length=8)
    opportunities: list[AIInsight] = Field(default_factory=list, max_length=8)
    model: str = ""
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AnalysisReport(BaseModel):
    repository: RepoMetadata
    maintenance_status: MaintenanceStatus
    status_summary: str
    overall_score: int | None
    indicators: list[HealthIndicator]
    evidence: list[Evidence]
    roadmap: Roadmap
    ai_insights: AIInsights | None = None
    limitations: list[str]
    methodology: list[str]
    generated_at: datetime
