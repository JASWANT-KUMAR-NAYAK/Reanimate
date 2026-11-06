from datetime import datetime, timedelta, timezone

import pytest
import respx
from fastapi.testclient import TestClient

from app.main import app
from app.config import Settings, get_settings

NOW = datetime(2026, 10, 29, tzinfo=timezone.utc)
iso = lambda days_ago: (NOW - timedelta(days=days_ago)).strftime("%Y-%m-%dT%H:%M:%SZ")  # noqa: E731


def repo_json(**kw):
    base = {"full_name": "octo/demo", "name": "demo", "owner": {"login": "octo"}, "html_url": "https://github.com/octo/demo",
            "description": "A demo", "stargazers_count": 1200, "forks_count": 80, "open_issues_count": 12,
            "default_branch": "main", "created_at": iso(1500), "pushed_at": iso(3), "language": "Python",
            "topics": ["cli"], "archived": False, "private": False, "license": {"spdx_id": "MIT"}}
    return base | kw


def commits_json(days_ago_list, author="alice"):
    return [{"sha": str(i), "author": {"login": author if i % 2 else "bob"},
             "commit": {"committer": {"date": iso(d)}, "author": {"name": author, "date": iso(d)}}} for i, d in enumerate(days_ago_list)]


def mock_github(m, repo=None, *, commits=None, releases=None, pulls=None, contributors=None, closed=None, community=None, readme="# Demo\n## Installation\nUse it.\n## Contributing\nPRs welcome.\n## Usage\n## License\n" + "x" * 1600):
    base = "https://api.github.com/repos/octo/demo"
    m.get(base).respond(json=repo or repo_json())
    m.get(f"{base}/readme").respond(text=readme) if readme is not None else m.get(f"{base}/readme").respond(404, json={})
    m.get(f"{base}/commits").respond(json=commits if commits is not None else commits_json([2, 10, 40, 70, 100, 130, 160]))
    m.get(f"{base}/releases").respond(json=releases if releases is not None else [{"tag_name": "v1.0", "published_at": iso(60), "draft": False}])
    m.get(f"{base}/pulls").respond(json=pulls if pulls is not None else [{}] * 2)
    m.get(f"{base}/contributors").respond(json=contributors if contributors is not None else [{"login": f"u{i}", "contributions": 10} for i in range(12)])
    m.get(f"{base}/issues").respond(json=closed if closed is not None else [
        {"created_at": iso(20), "closed_at": iso(15)}, {"created_at": iso(30), "closed_at": iso(28)}, {"created_at": iso(9), "closed_at": iso(8), "pull_request": {}}])
    m.get(f"{base}/community/profile").respond(json=community if community is not None else {"files": {
        "contributing": {"url": "x"}, "code_of_conduct": {"url": "x"}, "issue_template": {"url": "x"}, "pull_request_template": {"url": "x"}}})


@pytest.fixture
def gh():
    with respx.mock(assert_all_called=False) as m:
        yield m


@pytest.fixture
def client():
    app.dependency_overrides[get_settings] = lambda: Settings(
        _env_file=None,
        gemma_api_key=None,
    )
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
    app.dependency_overrides.clear()