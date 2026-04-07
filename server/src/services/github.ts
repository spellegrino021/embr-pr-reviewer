import { Octokit } from "@octokit/rest";

export interface PrDiff {
  files: Array<{
    filename: string;
    patch?: string;
    status: string;
    additions: number;
    deletions: number;
  }>;
  diff: string;
}

/**
 * Fetches the diff for a pull request from GitHub.
 * Works with public repos without a token; private repos need a token.
 */
export async function fetchPrDiff(
  owner: string,
  repo: string,
  prNumber: number,
  token?: string
): Promise<PrDiff> {
  const octokit = new Octokit(token ? { auth: token } : {});

  const { data: files } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  const diff = files
    .filter((f) => f.patch)
    .map((f) => `diff --git a/${f.filename} b/${f.filename}\n${f.patch}`)
    .join("\n\n");

  return {
    files: files.map((f) => ({
      filename: f.filename,
      patch: f.patch,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
    })),
    diff,
  };
}

/** Parses "owner/repo" from a GitHub URL like https://github.com/owner/repo */
export function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const cleaned = url.replace(/\/+$/, "");
  const match = cleaned.match(
    /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/
  );
  if (!match) {
    throw new Error(
      `Invalid GitHub URL: ${url}. Expected format: https://github.com/owner/repo`
    );
  }
  return { owner: match[1], repo: match[2] };
}
