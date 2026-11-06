import asyncio
import re
import time
from dataclasses import dataclass, field
from urllib.parse import urlparse

import httpx

from .config import Settings


class GitHubError(Exception):
    status, code = 502, "github_error"

    def __init__(self, message: str, retry_after: int | None = None):
        super().__init__(message)
        self.message, self.retry_after = message, retry_after


class InvalidRepoURL(GitHubError):
    status, code = 422, "invalid_url"


class RepoNotFound(GitHubError):
    status, code = 404, "repo_not_found"


class RateLimited(GitHubError):
    status, code = 429, "github_rate_limited"


class UpstreamError(GitHubError):
    status, code = 502, "github_unavailable"


class UpstreamTimeout(UpstreamError):
    status, code = 504, "github_timeout"


_OWNER = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$")
_REPO = re.compile(r"^[A-Za-z0-9._-]{1,100}$")


def parse_repo_url(url: str) -> tuple[str, str]:
    """Strictly validate a github.com repository URL and return (owner, repo)."""
    raw = url.strip()
    try:
        p = urlparse(raw if "://" in raw else f"https://{raw}")
        hostname, port = p.hostname, p.port
    except ValueError:
        raise InvalidRepoURL("The repository URL is malformed.") from None
    if p.scheme not in ("http", "https") or (hostname or "").lower() not in ("github.com", "www.github.com"):
        raise InvalidRepoURL("Only github.com repository URLs are supported.")
    if p.username or p.password or port or p.query:
        raise InvalidRepoURL("The URL must not contain credentials, a port, or query parameters.")
    parts = [s for s in p.path.split("/") if s]
    if len(parts) != 2:
        raise InvalidRepoURL("Expected a URL like https://github.com/owner/repository.")
    owner, repo = parts[0], parts[1].removesuffix(".git")
    if not _OWNER.match(owner) or not _REPO.match(repo) or repo in (".", ".."):
        raise InvalidRepoURL("The owner or repository name contains invalid characters.")
    return owner, repo


@dataclass
class RawRepoData:
    """Raw GitHub responses. None means 'could not be retrieved'; README '' means 'no README exists'."""

    repo: dict
    readme: str | None = None
    commits: list[dict] | None = None
    releases: list[dict] | None = None
    pulls: list[dict] | None = None
    contributors: list[dict] | None = None
    closed_issues: list[dict] | None = None
    community: dict | None = None
    readme_truncated: bool = False
    limitations: list[str] = field(default_factory=list)


def _retry_after(r: httpx.Response) -> int | None:
    if (ra := r.headers.get("retry-after")) and ra.isdigit():
        return int(ra)
    if (reset := r.headers.get("x-ratelimit-reset")) and reset.isdigit():
        return max(int(reset) - int(time.time()), 1)
    return None


class GitHubClient:
    def __init__(self, settings: Settings):
        self.s = settings
        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "reanimate-analyzer",
        }
        if settings.github_token:
            headers["Authorization"] = f"Bearer {settings.github_token}"
        self._http = httpx.AsyncClient(
            base_url=settings.github_api_url, headers=headers, timeout=settings.github_timeout, follow_redirects=True
        )

    async def __aenter__(self) -> "GitHubClient":
        return self

    async def __aexit__(self, *_) -> None:
        await self._http.aclose()

    async def _get(self, path: str, params: dict | None = None, raw: bool = False) -> httpx.Response:
        try:
            r = await self._http.get(
                path, params=params, headers={"Accept": "application/vnd.github.raw+json"} if raw else None
            )
        except httpx.TimeoutException:
            raise UpstreamTimeout("GitHub did not respond in time.") from None
        except httpx.HTTPError:
            raise UpstreamError("Could not reach the GitHub API.") from None
        if r.status_code == 404:
            raise RepoNotFound("Repository not found, or it is not public.")
        if r.status_code in (403, 429) and (r.headers.get("x-ratelimit-remaining") == "0" or "retry-after" in r.headers):
            raise RateLimited(
                "GitHub API rate limit reached. Set GITHUB_TOKEN on the server to raise the limit.", _retry_after(r)
            )
        if r.status_code >= 400:
            raise UpstreamError(f"GitHub returned an unexpected response ({r.status_code}).")
        return r

    async def collect(self, owner: str, repo: str) -> RawRepoData:
        base = f"/repos/{owner}/{repo}"
        meta = (await self._get(base)).json()
        if not isinstance(meta, dict) or meta.get("private"):
            raise RepoNotFound("Repository not found, or it is not public.")
        limitations: list[str] = []

        async def opt(label, path, params=None, *, raw=False, on_404=None):
            try:
                r = await self._get(base + path, params, raw)
                return r.text if raw else (r.json() if r.content else [])
            except RepoNotFound:
                if on_404 is None:
                    limitations.append(f"{label} not found.")
                return on_404
            except (GitHubError, ValueError) as e:
                limitations.append(f"{label} unavailable: {getattr(e, 'message', e)}")
                return None

        readme, commits, releases, pulls, contributors, closed, community = await asyncio.gather(
            opt("README", "/readme", raw=True, on_404=""),
            opt("Recent commits", "/commits", {"per_page": 100}),
            opt("Releases", "/releases", {"per_page": 20}),
            opt("Open pull requests", "/pulls", {"state": "open", "per_page": 100}),
            opt("Contributors", "/contributors", {"per_page": 100}),
            opt("Closed issues", "/issues", {"state": "closed", "per_page": 100, "sort": "updated"}),
            opt("Community profile", "/community/profile"),
        )
        as_list = lambda x: x if isinstance(x, list) else None  # noqa: E731
        truncated = bool(readme) and len(readme) > self.s.max_readme_chars
        closed = as_list(closed)
        return RawRepoData(
            repo=meta,
            readme=readme[: self.s.max_readme_chars] if isinstance(readme, str) else None,
            commits=as_list(commits),
            releases=as_list(releases),
            pulls=as_list(pulls),
            contributors=as_list(contributors),
            closed_issues=[i for i in closed if "pull_request" not in i] if closed is not None else None,
            community=community if isinstance(community, dict) else None,
            readme_truncated=truncated,
            limitations=limitations,
        )
