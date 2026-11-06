from .conftest import mock_github, iso


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_full_report(client, gh):
    mock_github(gh)
    r = client.post("/api/analyze", json={"url": "https://github.com/octo/demo"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["repository"]["full_name"] == "octo/demo"
    assert body["maintenance_status"] == "active" and body["overall_score"] >= 70
    assert {i["key"] for i in body["indicators"]} >= {"maintenance_activity", "documentation_quality", "contribution_accessibility"}
    assert any(e["id"] == "median_issue_close_days" for e in body["evidence"])
    assert body["limitations"] and body["methodology"]


def test_invalid_url(client):
    r = client.post("/api/analyze", json={"url": "https://example.com/a/b"})
    assert r.status_code == 422 and r.json()["error"]["code"] == "invalid_url"


def test_missing_url_field(client):
    assert client.post("/api/analyze", json={}).status_code == 422


def test_repo_not_found(client, gh):
    gh.get("https://api.github.com/repos/octo/demo").respond(404, json={"message": "Not Found"})
    r = client.post("/api/analyze", json={"url": "https://github.com/octo/demo"})
    assert r.status_code == 404 and r.json()["error"]["code"] == "repo_not_found"


def test_rate_limited(client, gh):
    gh.get("https://api.github.com/repos/octo/demo").respond(403, headers={"x-ratelimit-remaining": "0", "retry-after": "120"}, json={})
    r = client.post("/api/analyze", json={"url": "https://github.com/octo/demo"})
    assert r.status_code == 429 and r.headers["retry-after"] == "120" and "GITHUB_TOKEN" in r.json()["error"]["message"]


def test_optional_endpoint_failures_degrade_gracefully(client, gh):
    mock_github(gh)
    base = "https://api.github.com/repos/octo/demo"
    gh.get(f"{base}/releases").respond(500)
    gh.get(f"{base}/community/profile").respond(403, headers={"x-ratelimit-remaining": "0"})
    r = client.post("/api/analyze", json={"url": "https://github.com/octo/demo"})
    assert r.status_code == 200
    body = r.json()
    assert any("Releases unavailable" in l for l in body["limitations"]) and any("Community profile unavailable" in l for l in body["limitations"])
    assert next(i for i in body["indicators"] if i["key"] == "release_activity")["level"] == "unknown"


def test_empty_repository(client, gh):
    mock_github(gh, commits=[], readme=None, releases=[], contributors=[], closed=[])
    gh.get("https://api.github.com/repos/octo/demo/contributors").respond(204)
    r = client.post("/api/analyze", json={"url": "https://github.com/octo/demo"})
    assert r.status_code == 200, r.text
    assert next(i for i in r.json()["indicators"] if i["key"] == "documentation_quality")["score"] == 0


def test_timeout_maps_to_504(client, gh):
    import httpx
    gh.get("https://api.github.com/repos/octo/demo").mock(side_effect=httpx.ReadTimeout("slow"))
    r = client.post("/api/analyze", json={"url": "https://github.com/octo/demo"})
    assert r.status_code == 504 and r.json()["error"]["code"] == "github_timeout"


def test_private_repo_is_rejected(client, gh):
    from .conftest import repo_json
    mock_github(gh, repo=repo_json(private=True))
    assert client.post("/api/analyze", json={"url": "https://github.com/octo/demo"}).status_code == 404


def test_unexpected_error_hides_internals(client, gh, monkeypatch):
    mock_github(gh)
    monkeypatch.setattr("app.routes.build_report", lambda *a: 1 / 0)
    r = client.post("/api/analyze", json={"url": "https://github.com/octo/demo"})
    assert r.status_code == 500 and "division" not in r.text and "Traceback" not in r.text


def test_cors_exposes_retry_after_to_browsers(client):
    r = client.get("/health", headers={"Origin": "http://localhost:3000"})
    assert "Retry-After" in r.headers["access-control-expose-headers"]
