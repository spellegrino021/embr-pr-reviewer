import { Octokit } from "@octokit/rest";
import { reviewDiff } from "./reviewer.js";
import { formatComment } from "./format.js";

async function main() {
  const requiredEnv = [
    "GITHUB_TOKEN",
    "EMBR_API_KEY",
    "EMBR_BASE_URL",
    "EMBR_AGENT_ID",
    "GITHUB_REPOSITORY",
    "PR_NUMBER",
  ];

  for (const key of requiredEnv) {
    if (!process.env[key]) {
      throw new Error(`Missing required env var: ${key}`);
    }
  }

  const [owner, repo] = process.env.GITHUB_REPOSITORY!.split("/");
  const prNumber = parseInt(process.env.PR_NUMBER!, 10);

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  // Fetch the diff
  console.log(`Fetching diff for PR #${prNumber}...`);
  const { data: files } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
  });

  // Build a unified diff string from the per-file patches
  const diff = files
    .filter((f) => f.patch) // some files (binary, too large) have no patch
    .map((f) => {
      return `diff --git a/${f.filename} b/${f.filename}\n${f.patch}`;
    })
    .join("\n\n");

  if (!diff.trim()) {
    console.log("No reviewable diff found (binary files only?). Skipping.");
    return;
  }

  console.log(
    `Reviewing ${files.length} changed files (${diff.length} chars of diff)...`
  );

  // Run the review
  const result = await reviewDiff(diff);

  console.log(
    `Review complete: ${result.overall_risk} risk, ${result.findings.length} findings`
  );

  // Format and post the comment
  const body = formatComment(result);

  // Delete any existing bot comment first (clean re-runs)
  const { data: comments } = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
  });

  const existingComment = comments.find(
    (c) =>
      c.user?.type === "Bot" && c.body?.startsWith("## Embr PR Review")
  );

  if (existingComment) {
    await octokit.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment.id,
      body,
    });
    console.log(`Updated existing review comment #${existingComment.id}`);
  } else {
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body,
    });
    console.log(`Posted new review comment`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
