const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO = /^[A-Za-z0-9._-]{1,100}$/;

export type RepoInput = { ok: true; owner: string; repo: string; url: string } | { ok: false; message: string };

/** Client-side mirror of the backend's parse_repo_url so obvious mistakes are caught before a request is made. */
export function parseRepoInput(input: string): RepoInput {
  const raw = input.trim();
  if (!raw) return { ok: false, message: "Enter a GitHub repository URL." };

  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return { ok: false, message: "That doesn't look like a valid URL." };
  }
  const host = url.hostname.toLowerCase();
  if (!["http:", "https:"].includes(url.protocol) || !["github.com", "www.github.com"].includes(host)) {
    return { ok: false, message: "Only github.com repository URLs are supported." };
  }
  if (url.username || url.password || url.port || url.search) {
    return { ok: false, message: "Remove credentials, ports, or query parameters from the URL." };
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 2) return { ok: false, message: "Use the form https://github.com/owner/repository." };

  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, "");
  if (!OWNER.test(owner) || !REPO.test(repo) || repo === "." || repo === "..") {
    return { ok: false, message: "The owner or repository name contains invalid characters." };
  }
  return { ok: true, owner, repo, url: `https://github.com/${owner}/${repo}` };
}
