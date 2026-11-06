
import asyncio
import json

import httpx
import pytest

from app.ai_service import AIServiceError, generate_insights
from app.config import Settings
from app.schemas import AnalysisReport, AIInsights


GEMMA_MODEL = "gemma-4-26b-a4b-it"


class FakeAsyncClient:
    response_content = {
        "summary": "The sampled repository activity appears consistent, although the sample does not establish long-term maintenance intent.",
        "findings": [{
            "title": "Recent maintenance activity",
            "explanation": "Recent commits provide evidence of ongoing development in the sampled period.",
            "evidence_ids": ["days_since_last_commit"],
            "confidence": "high",
        }],
        "opportunities": [],
    }

    def __init__(self, *, timeout):
        self.timeout = timeout

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return None

    async def post(self, url, **kwargs):
        expected_url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{GEMMA_MODEL}:generateContent"
        )

        assert url == expected_url
        assert kwargs["headers"]["x-goog-api-key"] == "test-key"

        response = {
            "candidates": [{
                "content": {
                    "parts": [{
                        "text": json.dumps(self.response_content)
                    }]
                }
            }]
        }

        return httpx.Response(
            200,
            request=httpx.Request("POST", url),
            json=response,
        )


def make_report():
    return AnalysisReport.model_validate({
        "repository": {
            "owner": "octo",
            "name": "demo",
            "full_name": "octo/demo",
            "url": "https://github.com/octo/demo",
            "description": None,
            "stars": 1,
            "forks": 0,
            "default_branch": "main",
            "created_at": "2024-01-01T00:00:00Z",
            "pushed_at": "2026-10-28T00:00:00Z",
            "language": "Python",
            "topics": [],
            "archived": False,
            "license": None,
        },
        "maintenance_status": "active",
        "status_summary": "Recent activity was observed.",
        "overall_score": 80,
        "indicators": [],
        "evidence": [{
            "id": "days_since_last_commit",
            "category": "activity",
            "kind": "derived",
            "observed_value": 1,
            "source": "GitHub commits",
            "indicates": "Recent activity",
        }],
        "roadmap": {
            "immediate": [],
            "short_term": [],
            "long_term": [],
        },
        "limitations": [],
        "methodology": [],
        "generated_at": "2026-10-29T00:00:00Z",
    })


def gemma_settings():
    return Settings(
        _env_file=None,
        gemma_api_key="test-key",
        gemma_model=GEMMA_MODEL,
    )


def test_generate_insights_validates_evidence_and_attaches_model(monkeypatch):
    from app import ai_service

    monkeypatch.setattr(ai_service.httpx, "AsyncClient", FakeAsyncClient)

    result = asyncio.run(
        generate_insights(make_report(), gemma_settings())
    )

    assert isinstance(result, AIInsights)
    assert result.model == GEMMA_MODEL
    assert result.findings[0].evidence_ids == ["days_since_last_commit"]


def test_generate_insights_rejects_unknown_evidence(monkeypatch):
    from app import ai_service

    class InvalidClient(FakeAsyncClient):
        response_content = {
            "summary": "The repository has signals that need further investigation before drawing a conclusion.",
            "findings": [{
                "title": "Unsupported finding",
                "explanation": "This statement does not have a matching evidence item in the collected repository data.",
                "evidence_ids": ["invented_metric"],
                "confidence": "low",
            }],
            "opportunities": [],
        }

    monkeypatch.setattr(ai_service.httpx, "AsyncClient", InvalidClient)

    with pytest.raises(AIServiceError, match="evidence"):
        asyncio.run(
            generate_insights(make_report(), gemma_settings())
        )
