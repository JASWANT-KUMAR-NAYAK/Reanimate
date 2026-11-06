from datetime import datetime

from .evidence import build_evidence
from .github_client import RawRepoData
from .health_analyzer import METHODOLOGY, analyze_health
from .schemas import AnalysisReport, Evidence, HealthIndicator, RepoMetadata, Roadmap, RoadmapItem

STATIC_LIMITATIONS = [
    "Commit, release, contributor and issue figures come from the most recent 100 (releases: 20) records GitHub returned, not the full history.",
    "Only public GitHub data is used; private discussions, chat channels and off-GitHub activity are invisible to this analysis.",
]
_ORDER = {"high": 0, "medium": 1, "low": 2}


def build_roadmap(evidence: list[Evidence], indicators: list[HealthIndicator], status: str) -> Roadmap:
    V = {e.id: e.observed_value for e in evidence}
    score = {i.key: i.score for i in indicators}
    road = Roadmap(immediate=[], short_term=[], long_term=[])
    stale = status in ("dormant", "inactive")

    def add(bucket, title, description, priority, reason, ids, complexity, who, outcome):
        getattr(road, bucket).append(RoadmapItem(title=title, description=description, priority=priority, reason=reason,
                                                 evidence_ids=[i for i in ids if i in V], complexity=complexity,
                                                 contributor_type=who, expected_outcome=outcome))

    if V.get("archived"):
        add("immediate", "Decide whether to unarchive or hand over the project",
            "The repository is archived. Either unarchive it under active maintainers or transfer it to a team that will maintain it.",
            "high", "Archived repositories cannot receive changes, so no revival is possible until this is resolved.",
            ["archived"], "low", "Owner / maintainer", "The project can accept contributions again.")
    if "license" in V and not V["license"]:
        add("immediate", "Add an open-source license",
            "No license was detected. Choose a license (for example via choosealicense.com) and add a LICENSE file.",
            "high", "Without a license, others have no legal right to reuse or contribute to the code.",
            ["license"], "low", "Maintainer", "Contributors and downstream users can legally engage with the project.")
    if stale:
        add("immediate", "Publish a maintenance status and recruit a triage owner",
            f"Add a short status note to the README and name at least one person responsible for triage. The last commit was {V.get('days_since_last_commit', V.get('days_since_last_push'))} days ago.",
            "high", "Long silence makes users assume the project is dead and discourages contributions.",
            ["days_since_last_commit", "days_since_last_push"], "low", "Maintainer or volunteer triager",
            "Users know whether help is wanted and who to talk to.")
    if (V.get("open_prs") or 0) >= 5:
        add("immediate" if stale else "short_term", f"Review the {V['open_prs']} open pull requests",
            "Merge, request changes on, or close each open PR so contributors get a response.",
            "high" if stale else "medium", "Unreviewed pull requests are the fastest way to lose contributors.",
            ["open_prs", "days_since_last_commit"], "medium", "Maintainer / reviewer", "Contributors receive feedback and valuable changes land.")
    if (V.get("open_issues") or 0) >= 50 or (V.get("median_issue_close_days") or 0) > 90:
        add("short_term", "Triage the issue backlog",
            f"Label issues, close duplicates and stale reports, and mark approachable ones as 'good first issue'. {V.get('open_issues', 0)} issues are open.",
            "medium", "A large or slow-moving backlog hides real problems and discourages new reporters.",
            ["open_issues", "median_issue_close_days"], "medium", "Triager / community member", "A smaller, labelled backlog with clear starter tasks.")
    if V.get("has_contributing") is False:
        add("short_term", "Add a CONTRIBUTING guide",
            "Document how to set up the project, run tests and submit changes.",
            "medium", "No CONTRIBUTING file was found, so newcomers must guess how to help.",
            ["has_contributing", "readme_mentions_contributing"], "low", "Any contributor", "New contributors can submit a first pull request without asking.")
    
    if V.get("has_issue_template") is False:
        add(
            "short_term",
            "Add an issue template",
            "Create an issue template that asks for reproduction steps, versions and expected behavior.",
            "low",
            "No issue template was detected.",
            ["has_issue_template"],
            "low",
            "Any contributor",
            "Higher-quality and more actionable bug reports."
        )

    if V.get("has_pr_template") is False:
        add(
            "short_term",
            "Add a pull-request template",
            "Create a PR template that asks contributors to summarize changes and provide test evidence.",
            "low",
            "No pull-request template was detected.",
            ["has_pr_template"],
            "low",
            "Any contributor",
            "More consistent pull requests and easier reviews."
        )

    if score.get("documentation_quality") is not None and score["documentation_quality"] < 50:
        add("short_term", "Improve the README",
            "Add installation, usage examples and a project overview with clear sections.",
            "medium", "README analysis shows missing basics.",
            ["readme_length", "readme_headings", "readme_has_install_usage"], "low", "Technical writer / new contributor", "Newcomers can understand and run the project quickly.")
    if "description" in V and (not V["description"] or not V.get("topics")):
        add("short_term", "Add a repository description and topics",
            "Fill in the GitHub description and a few topics that match the project's domain.",
            "low", "Missing metadata reduces discoverability.", ["description", "topics"], "low", "Maintainer", "The project appears in more searches.")
    if V.get("release_count") == 0 and (V.get("repo_age_days") or 0) >= 180 or (V.get("days_since_last_release") or 0) > 365:
        add("short_term", "Cut a new release",
            "Tag and publish a release (with notes) so users can adopt the latest code.",
            "medium", "No recent release was observed on GitHub.",
            ["release_count", "days_since_last_release"], "medium", "Maintainer", "A visible release signals that the project is maintained.")
    if (V.get("top_contributor_share") or 0) >= 0.7:
        add("long_term", "Reduce key-person risk by recruiting co-maintainers",
            f"One contributor authored {round(V['top_contributor_share'] * 100)}% of sampled commits. Offer review or triage rights to regular contributors.",
            "medium", "Project health depends heavily on a single person.",
            ["top_contributor_share", "contributors_count"], "high", "Maintainer + community", "Maintenance continues if one person steps away.")
    if score.get("development_consistency") is not None and score["development_consistency"] < 40:
        add("long_term", "Establish a regular maintenance cadence",
            "Schedule recurring triage and release windows (for example monthly) so activity is steady.",
            "low", "Commits are concentrated in few periods.", ["active_months", "consistency_window_months"],
            "medium", "Maintainer", "Predictable activity that contributors can plan around.")
    if V.get("has_code_of_conduct") is False:
        add("long_term", "Adopt a code of conduct",
            "Add a CODE_OF_CONDUCT file (for example the Contributor Covenant).",
            "low", "No code of conduct was found.", ["has_code_of_conduct"], "low", "Maintainer", "A clearer, safer community for new contributors.")
    for items in (road.immediate, road.short_term, road.long_term):
        items.sort(key=lambda i: _ORDER[i.priority])
    return road


def build_report(raw: RawRepoData, now: datetime) -> AnalysisReport:
    r = raw.repo
    evidence = build_evidence(raw, now)
    indicators, overall, status = analyze_health(evidence)
    V = {e.id: e.observed_value for e in evidence}
    d = next((V[i] for i in ("days_since_last_commit", "days_since_last_push") if V.get(i) is not None), None)
    summary = {"archived": "This repository is archived and read-only.",
               "unknown": "Not enough activity data to judge maintenance status."}.get(status, f"Status is {status}: last commit or push was {d} days ago.")
    return AnalysisReport(
        repository=RepoMetadata(
            owner=r["owner"]["login"], name=r["name"], full_name=r["full_name"], url=r["html_url"],
            description=r.get("description"), stars=r.get("stargazers_count", 0), forks=r.get("forks_count", 0),
            default_branch=r.get("default_branch", "main"), created_at=r["created_at"], pushed_at=r.get("pushed_at"),
            language=r.get("language"), topics=r.get("topics") or [], archived=bool(r.get("archived")),
            license=(r.get("license") or {}).get("spdx_id") or (r.get("license") or {}).get("name")),
        maintenance_status=status, status_summary=summary, overall_score=overall, indicators=indicators, evidence=evidence,
        roadmap=build_roadmap(evidence, indicators, status), limitations=raw.limitations + STATIC_LIMITATIONS,
        methodology=METHODOLOGY, generated_at=now)
