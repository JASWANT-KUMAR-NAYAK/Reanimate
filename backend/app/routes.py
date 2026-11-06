from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from .ai_service import AIServiceError, generate_insights
from .config import Settings, get_settings
from .github_client import GitHubClient, parse_repo_url
from .report_generator import build_report
from .schemas import AnalysisReport, AnalyzeRequest

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@router.post("/api/analyze", response_model=AnalysisReport)
async def analyze(req: AnalyzeRequest, settings: Settings = Depends(get_settings)) -> AnalysisReport:
    owner, repo = parse_repo_url(req.url)
    async with GitHubClient(settings) as gh:
        raw = await gh.collect(owner, repo)
    report = build_report(raw, datetime.now(timezone.utc))
    if settings.gemma_api_key:
        try:
            report.ai_insights = await generate_insights(report, settings)
        except AIServiceError as exc:
            report.limitations.append(f"AI insights unavailable: {exc}")
    else:
     report.limitations.append(
        "AI insights are disabled. Set GEMMA_API_KEY in backend/.env to enable them."
    )
    return report
