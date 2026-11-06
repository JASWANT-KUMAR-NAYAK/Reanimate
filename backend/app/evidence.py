import re
from datetime import datetime, timedelta
from statistics import median

from .github_client import RawRepoData
from .schemas import Evidence

_INSTALL = re.compile(r"\b(install(ation)?|getting started|quick ?start|usage)\b", re.I)
_CONTRIB = re.compile(r"\bcontribut(e|ing|ion|ors?)\b", re.I)
_COMMUNITY_FILES = [
    ("contributing", "has_contributing", "A CONTRIBUTING file tells newcomers how to propose changes."),
    ("code_of_conduct", "has_code_of_conduct", "A code of conduct signals a welcoming, moderated community."),
    ("issue_template", "has_issue_template", "Issue templates raise the quality of bug reports."),
    ("pull_request_template", "has_pr_template", "A PR template standardises what contributors submit."),
]


def _dt(s: str | None) -> datetime | None:
    return datetime.fromisoformat(s) if s else None


def _commit_info(c: dict) -> tuple[datetime | None, str | None]:
    cm = c.get("commit") or {}
    when = _dt((cm.get("committer") or {}).get("date") or (cm.get("author") or {}).get("date"))
    return when, (c.get("author") or {}).get("login") or (cm.get("author") or {}).get("name")


def build_evidence(raw: RawRepoData, now: datetime) -> list[Evidence]:
    r, out = raw.repo, []
    src = f"GET /repos/{r['full_name']}"
    days = lambda d: (now - d).days  # noqa: E731

    def add(id, category, value, source, indicates, *, kind="observed", at=None, limit=None):
        out.append(Evidence(id=id, category=category, kind=kind, observed_value=value, source=source,
                            observed_at=at, indicates=indicates, limitation=limit))

    created, pushed = _dt(r["created_at"]), _dt(r.get("pushed_at"))
    age = days(created)
    add("archived", "Maintenance", bool(r.get("archived")), src, "Archived repositories are read-only and accept no new commits, issues or PRs.")
    add("created_at", "Repository", created.date().isoformat(), src, "Creation date.", at=created)
    add("repo_age_days", "Repository", age, src, "Age of the repository; used to scale expectations for young projects.", kind="derived")
    if pushed:
        add("pushed_at", "Maintenance", pushed.date().isoformat(), src, "Most recent push to any branch.", at=pushed,
            limit="Includes pushes to non-default branches.")
        add("days_since_last_push", "Maintenance", days(pushed), src, "Days since the last push.", kind="derived", at=pushed)
    add("stars", "Community", r.get("stargazers_count", 0), src, "Stars indicate interest, not maintenance quality.")
    add("forks", "Community", r.get("forks_count", 0), src, "Forks indicate reuse and potential contributors.")
    add("language", "Repository", r.get("language"), src, "Primary language as detected by GitHub.")
    add("description", "Documentation", r.get("description"), src, "A short description aids discoverability.")
    add("topics", "Documentation", ", ".join(r.get("topics") or []) or None, src, "Topics aid discoverability.")
    lic = r.get("license") or {}
    add("license", "Contribution", lic.get("spdx_id") or lic.get("name"), src,
        "A license is required for others to legally reuse or contribute to the code.",
        limit="GitHub may fail to detect non-standard license files.")

    total_open = r.get("open_issues_count", 0)
    if raw.pulls is not None:
        capped = len(raw.pulls) >= 100
        add("open_prs", "Issue management", len(raw.pulls), f"{src}/pulls", "Open pull requests awaiting review or merge.",
            limit="Count capped at 100." if capped else None)
        add("open_issues", "Issue management", max(total_open - len(raw.pulls), 0), src,
            "Open issues (GitHub's open_issues_count minus open PRs).", kind="derived")
    else:
        add("open_issues", "Issue management", total_open, src, "Open issues.", limit="Includes open pull requests; PR list was unavailable.")

    if raw.commits:
        dated = [(w, a) for w, a in map(_commit_info, raw.commits) if w]
        if dated:
            latest, oldest = max(w for w, _ in dated), min(w for w, _ in dated)
            capped = len(raw.commits) >= 100
            csrc = f"{src}/commits"
            add("latest_commit", "Development", latest.date().isoformat(), csrc, "Most recent commit on the default branch.", at=latest)
            add("days_since_last_commit", "Development", days(latest), csrc, "Days since the latest commit.", kind="derived", at=latest)
            c90 = [(w, a) for w, a in dated if w >= now - timedelta(days=90)]
            add("commits_90d", "Development", len(c90), csrc, "Commits in the last 90 days.", kind="derived",
                limit="Sample capped at 100 commits; true count may be higher." if capped and oldest >= now - timedelta(days=90) else None)
            add("authors_90d", "Community", len({a for _, a in c90 if a}), csrc, "Distinct commit authors in the last 90 days.", kind="derived")
            window = min(6, max(1, age // 30))
            if capped:
                window = min(window, max(1, days(oldest) // 30))
            add("consistency_window_months", "Development", window, csrc,
                "Number of 30-day periods used to judge commit consistency (limited by repo age and sample coverage).", kind="derived")
            add("active_months", "Development", len({days(w) // 30 for w, _ in dated if days(w) // 30 < window}), csrc,
                "Number of 30-day periods in the window containing at least one commit.", kind="derived")
    elif raw.commits == []:
        add("commits_90d", "Development", 0, f"{src}/commits", "No commits were returned for the default branch.", kind="derived")

    if raw.releases is not None:
        rel = [(_dt(x.get("published_at") or x.get("created_at")), x.get("tag_name")) for x in raw.releases if not x.get("draft")]
        rel = [(d, t) for d, t in rel if d]
        rsrc = f"{src}/releases"
        add("release_count", "Releases", len(rel), rsrc, "Published GitHub releases (most recent 20).",
            limit="Projects that only publish git tags or package-registry versions will show zero releases here.")
        if rel:
            d, tag = max(rel)
            add("latest_release", "Releases", tag, rsrc, "Most recent published release.", at=d)
            add("days_since_last_release", "Releases", days(d), rsrc, "Days since the latest release.", kind="derived", at=d)
            add("releases_365d", "Releases", sum(1 for x, _ in rel if days(x) <= 365), rsrc, "Releases published in the last 365 days.", kind="derived")

    if raw.contributors is not None:
        counts = [c.get("contributions", 0) for c in raw.contributors]
        add("contributors_count", "Community", len(counts), f"{src}/contributors", "Distinct contributors with commits.",
            limit="Capped at 100." if len(counts) >= 100 else None)
        if sum(counts):
            add("top_contributor_share", "Community", round(max(counts) / sum(counts), 2), f"{src}/contributors",
                "Share of commits by the top contributor; a high share suggests key-person risk.", kind="derived")

    if raw.closed_issues:
        spans = [(_dt(i["closed_at"]) - _dt(i["created_at"])).total_seconds() / 86400
                 for i in raw.closed_issues if i.get("closed_at") and i.get("created_at")]
        if spans:
            add("median_issue_close_days", "Issue management", round(median(spans), 1), f"{src}/issues",
                "Median days from creation to closure for recently closed issues.", kind="derived",
                limit=f"Based on {len(spans)} most recently updated closed issues, not the full history.")

    if raw.readme is not None:
        text, rsrc = raw.readme, f"{src}/readme"
        add("readme_length", "Documentation", len(text), rsrc, "README size in characters (0 = no README).",
            limit="Truncated for analysis." if raw.readme_truncated else None)
        if text:
            add("readme_headings", "Documentation", sum(1 for ln in text.splitlines() if ln.lstrip().startswith("#")), rsrc,
                "Number of markdown headings; a proxy for README structure.", kind="derived")
            add("readme_has_install_usage", "Documentation", bool(_INSTALL.search(text)), rsrc,
                "Whether the README mentions installation or usage.", kind="derived")
            add("readme_mentions_contributing", "Contribution", bool(_CONTRIB.search(text)), rsrc,
                "Whether the README mentions contributing.", kind="derived")

    if raw.community is not None:
        files = raw.community.get("files") or {}
        for key, id_, why in _COMMUNITY_FILES:
            add(id_, "Contribution", bool(files.get(key)), f"{src}/community/profile", why)
    return out
