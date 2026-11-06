from math import log10

from .schemas import Evidence, HealthIndicator

WEIGHTS = {"maintenance_activity": 3, "development_consistency": 2, "issue_management": 2, "community_engagement": 1,
           "release_activity": 1, "documentation_quality": 1, "contribution_accessibility": 1}

METHODOLOGY = [
    "Every score is a transparent heuristic computed only from the evidence items listed beside it; it is not an objective measure of project quality.",
    "Indicators with insufficient evidence are reported as 'unknown' and excluded from the overall score rather than guessed.",
    "Overall score = weighted mean of available indicators; weights: " + ", ".join(f"{k} {v}" for k, v in WEIGHTS.items()) + ".",
    "Maintenance status uses days since the last commit (or push): <=90 active, <=180 slowing, <=365 dormant, otherwise inactive; archived repositories are always 'archived'.",
    "Young repositories are judged over their actual lifetime (consistency window = min(6, age in months)), and release activity is not scored for projects under 180 days old.",
    "Thresholds suit typical libraries and tools; stable, feature-complete projects may legitimately show low activity.",
]


def _tiers(x, tiers, default):
    return next((s for lim, s in tiers if x <= lim), default)


def _level(s: int | None) -> str:
    return "unknown" if s is None else "strong" if s >= 70 else "fair" if s >= 40 else "weak"


def maintenance_status(V: dict) -> str:
    if V.get("archived"):
        return "archived"
    d = next((V[i] for i in ("days_since_last_commit", "days_since_last_push") if V.get(i) is not None), None)
    return "unknown" if d is None else _tiers(d, [(90, "active"), (180, "slowing"), (365, "dormant")], "inactive")


def analyze_health(evidence: list[Evidence]) -> tuple[list[HealthIndicator], int | None, str]:
    V = {e.id: e.observed_value for e in evidence}
    out: list[HealthIndicator] = []

    def ind(key, name, method, score, why, *ids):
        s = None if score is None else max(0, min(100, round(score)))
        out.append(HealthIndicator(key=key, name=name, score=s, level=_level(s), rationale=why, method=method,
                                   evidence_ids=[i for i in ids if i in V]))

    days = next((V[i] for i in ("days_since_last_commit", "days_since_last_push") if V.get(i) is not None), None)
    if V.get("archived"):
        s, why = 0, "The repository is archived (read-only)."
    elif days is None:
        s, why = None, "No commit or push date is available."
    else:
        s, why = _tiers(days, [(30, 100), (90, 80), (180, 55), (365, 30)], 10), f"Last activity was {days} days ago."
    ind("maintenance_activity", "Maintenance activity", "Recency of last commit: <=30d 100, <=90d 80, <=180d 55, <=365d 30, else 10; archived = 0.",
        s, why, "archived", "days_since_last_commit", "days_since_last_push")

    active, window = V.get("active_months"), V.get("consistency_window_months")
    s, why = (None, "Commit history is unavailable.") if active is None or not window else (
        100 * active / window, f"Commits landed in {active} of the last {window} month(s) examined.")
    ind("development_consistency", "Development consistency", "Share of 30-day periods (up to 6, limited by repo age) containing a commit.",
        s, why, "active_months", "consistency_window_months", "repo_age_days")

    c, a, st = V.get("contributors_count"), V.get("authors_90d"), V.get("stars")
    community_points = []
    if c is not None:
        community_points.append((50, min(c, 10) * 5))
    if a is not None:
        community_points.append((30, min(a, 5) * 6))
    if st is not None:
        community_points.append((20, min(log10(st + 1) / 3, 1) * 20))
    s = None if not community_points else 100 * sum(points for _, points in community_points) / sum(weight for weight, _ in community_points)
    ind("community_engagement", "Community engagement", "Up to 50 pts for contributors (10+), 30 for distinct authors in 90 days (5+), 20 for log-scaled stars; unavailable components are excluded and the remaining points are rescaled.",
        s, f"{'unknown' if c is None else c} contributors, {'unknown' if a is None else a} distinct recent authors, {'unknown' if st is None else st} stars.",
        "contributors_count", "authors_90d", "stars", "top_contributor_share")

    med, op = V.get("median_issue_close_days"), V.get("open_issues")
    if med is not None:
        s = _tiers(med, [(7, 100), (30, 80), (90, 55)], 30) - (15 if (op or 0) > 200 else 8 if (op or 0) > 50 else 0)
        why = f"Median time to close sampled issues is {med} days; {op} issues are open."
    elif op:
        s, why = 20, f"{op} issues are open and no closed issues were observed in the sample."
    else:
        s, why = None, "No issue activity was observed."
    ind("issue_management", "Issue management", "Median days to close: <=7d 100, <=30d 80, <=90d 55, else 30; minus 8 if >50 open, 15 if >200 open.",
        s, why, "median_issue_close_days", "open_issues", "open_prs")

    d = V.get("days_since_last_release")
    if d is not None:
        s, why = _tiers(d, [(180, 100), (365, 75), (730, 45)], 20), f"The latest release was {d} days ago."
    elif V.get("release_count") == 0 and (V.get("repo_age_days") or 0) >= 180:
        s, why = 25, "No GitHub releases were found (the project may release through tags or a package registry)."
    else:
        s, why = None, "Release cadence cannot be judged (young repository or release data unavailable)."
    ind("release_activity", "Release activity", "Latest release age: <=180d 100, <=365d 75, <=730d 45, else 20; none on a repo >=180 days old 25.",
        s, why, "days_since_last_release", "release_count", "releases_365d", "repo_age_days")

    n = V.get("readme_length")
    if n is None:
        s, why = None, "README data is unavailable."
    elif n == 0:
        s, why = 0, "No README was found."
    else:
        h = V.get("readme_headings") or 0
        s = (30 if n >= 200 else 10) + (20 if n >= 1500 else 10 if n >= 500 else 0) + (25 if V.get("readme_has_install_usage") else 0) \
            + (15 if h >= 4 else 7 if h >= 2 else 0) + (5 if V.get("description") else 0) + (5 if V.get("topics") else 0)
        why = f"README has {n} characters and {h} headings; install/usage mentioned: {bool(V.get('readme_has_install_usage'))}."
    ind("documentation_quality", "Documentation quality", "README present 30 (10 if under 200 chars), length 1500+ chars 20 (500+ 10), install/usage 25, 4+ headings 15 (2+ 7), description 5, topics 5.",
        s, why, "readme_length", "readme_headings", "readme_has_install_usage", "description", "topics")

    checks = [(25, 25 if V.get("license") else 0)]
    if "has_contributing" in V:
        checks += [(30, 30 if V["has_contributing"] else 0), (15, 15 if V["has_code_of_conduct"] else 0),
                   (15, 15 if V["has_issue_template"] else 0), (15, 15 if V["has_pr_template"] else 0)]
    elif "readme_mentions_contributing" in V:
        checks.append((15, 15 if V["readme_mentions_contributing"] else 0))
    done = sum(e for _, e in checks)
    ind("contribution_accessibility", "Contribution accessibility",
        "License 25, CONTRIBUTING 30, code of conduct 15, issue template 15, PR template 15; scaled to the checks that could be observed.",
        100 * done / sum(w for w, _ in checks),
        f"{done} of {sum(w for w, _ in checks)} available points" + ("" if "has_contributing" in V else " (community profile unavailable, partial check)."),
        "license", "has_contributing", "has_code_of_conduct", "has_issue_template", "has_pr_template", "readme_mentions_contributing")

    scored = [(WEIGHTS[i.key], i.score) for i in out if i.score is not None]
    overall = round(sum(w * s for w, s in scored) / sum(w for w, _ in scored)) if scored else None
    return out, overall, maintenance_status(V)
