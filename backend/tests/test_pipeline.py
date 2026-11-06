from datetime import datetime

from app.evidence import build_evidence
from app.github_client import RawRepoData
from app.health_analyzer import analyze_health
from app.report_generator import build_report

from .conftest import NOW, commits_json, iso, repo_json


def raw(**kw):
    base = dict(repo=repo_json(), readme="# A\n## Install\nx" * 1, commits=commits_json([2, 10, 40, 70]), releases=[], pulls=[],
                contributors=[{"login": "a", "contributions": 90}, {"login": "b", "contributions": 10}], closed_issues=[],
                community={"files": {}})
    return RawRepoData(**(base | kw))


def by_id(ev):
    return {e.id: e for e in ev}


def test_evidence_values_and_derivation():
    ev = by_id(build_evidence(raw(), NOW))
    assert ev["days_since_last_commit"].observed_value == 2 and ev["days_since_last_commit"].kind == "derived"
    assert ev["commits_90d"].observed_value == 4
    assert ev["top_contributor_share"].observed_value == 0.9
    assert ev["has_contributing"].observed_value is False
    assert all(e.source and e.indicates for e in ev.values())


def test_missing_data_produces_no_fabricated_evidence():
    ev = by_id(build_evidence(raw(commits=None, releases=None, contributors=None, community=None, readme=None, pulls=None), NOW))
    assert not {"latest_commit", "release_count", "contributors_count", "has_contributing", "readme_length"} & ev.keys()
    inds, _, status = analyze_health(list(ev.values()))
    scores = {i.key: i.score for i in inds}
    assert scores["development_consistency"] is None and scores["release_activity"] is None and scores["documentation_quality"] is None
    assert status == "active"  # falls back to pushed_at


def test_young_repo_is_judged_on_its_lifetime():
    r = raw(repo=repo_json(created_at=iso(45)), commits=commits_json([1, 20]))
    inds, _, _ = analyze_health(build_evidence(r, NOW))
    scores = {i.key: i.score for i in inds}
    assert scores["development_consistency"] == 100 and scores["release_activity"] is None


def test_abandoned_repo_scores_low_and_gets_urgent_roadmap():
    r = raw(repo=repo_json(pushed_at=iso(900), license=None), commits=commits_json([900, 950]), pulls=[{}] * 7, closed_issues=[])
    rep = build_report(r, NOW)
    assert rep.maintenance_status == "inactive" and rep.overall_score < 40
    titles = [i.title for i in rep.roadmap.immediate]
    assert any("license" in t for t in titles) and any("maintenance status" in t for t in titles) and any("pull requests" in t for t in titles)
    assert all(i.evidence_ids for i in rep.roadmap.immediate)
    assert {i.priority for i in rep.roadmap.immediate} <= {"high"}


def test_archived_repo():
    rep = build_report(raw(repo=repo_json(archived=True)), NOW)
    assert rep.maintenance_status == "archived"
    assert next(i for i in rep.indicators if i.key == "maintenance_activity").score == 0
    assert "unarchive" in rep.roadmap.immediate[0].title


def test_roadmap_references_only_existing_evidence():
    rep = build_report(raw(), NOW)
    ids = {e.id for e in rep.evidence}
    for bucket in (rep.roadmap.immediate, rep.roadmap.short_term, rep.roadmap.long_term):
        for item in bucket:
            assert set(item.evidence_ids) <= ids
    assert isinstance(rep.generated_at, datetime) and rep.methodology


def test_tiny_readme_is_not_rated_fair():
    inds, _, _ = analyze_health(build_evidence(raw(readme="# tiny"), NOW))
    assert next(i for i in inds if i.key == "documentation_quality").score < 40


def test_zero_documentation_score_still_recommends_readme_improvements():
    from app.schemas import Evidence, HealthIndicator
    from app.report_generator import build_roadmap

    evidence = [Evidence(id="readme_length", category="documentation", kind="observed", observed_value=0,
                         source="GitHub README endpoint", indicates="No README was found.")]
    indicators = [HealthIndicator(key="documentation_quality", name="Documentation quality", score=0,
                                  level="weak", rationale="No README.", method="README checks", evidence_ids=["readme_length"])]
    roadmap = build_roadmap(evidence, indicators, "active")
    assert any(item.title == "Improve the README" for item in roadmap.short_term)


def test_missing_contributor_count_is_not_scored_as_zero():
    from app.schemas import Evidence

    evidence = [
        Evidence(id="authors_90d", category="community", kind="observed", observed_value=5,
                 source="GitHub commits", indicates="Five recent authors."),
        Evidence(id="stars", category="community", kind="observed", observed_value=0,
                 source="GitHub repository", indicates="No stars."),
    ]
    indicators, _, _ = analyze_health(evidence)
    community = next(item for item in indicators if item.key == "community_engagement")
    assert community.score == 60
    assert "unknown contributors" in community.rationale
