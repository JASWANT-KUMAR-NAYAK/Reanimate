import pytest

from app.github_client import InvalidRepoURL, parse_repo_url


@pytest.mark.parametrize("url,expected", [
    ("https://github.com/psf/requests", ("psf", "requests")),
    ("github.com/psf/requests/", ("psf", "requests")),
    ("http://www.github.com/psf/requests.git", ("psf", "requests")),
    ("  https://github.com/a-b/c.d_e#readme ", ("a-b", "c.d_e")),
])
def test_valid(url, expected):
    assert parse_repo_url(url) == expected


@pytest.mark.parametrize("url", [
    "", "https://gitlab.com/a/b", "https://github.com/a", "https://github.com/a/b/tree/main",
    "https://evil.com/github.com/a/b", "ftp://github.com/a/b", "https://user:pw@github.com/a/b",
    "https://github.com:8080/a/b", "https://github.com/a/b?x=1", "https://github.com/-bad/repo",
    "https://github.com/a/..", "https://github.com/a/b c", "javascript:alert(1)", "https://github.com.evil.com/a/b",
])
def test_invalid(url):
    with pytest.raises(InvalidRepoURL):
        parse_repo_url(url)


def test_malformed_port_returns_invalid_repo_url():
    with pytest.raises(InvalidRepoURL, match="malformed"):
        parse_repo_url("https://github.com:invalid/owner/repo")
