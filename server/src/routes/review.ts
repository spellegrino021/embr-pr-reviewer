import { Router, Request, Response } from "express";
import { fetchPrDiff, parseGitHubUrl } from "../services/github.js";
import { reviewDiff, ReviewResult } from "../services/agent.js";

export const reviewRouter = Router();

interface ReviewRequest {
  repoUrl: string;
  prNumber: number;
  additionalComments?: string;
  githubToken?: string;
}

reviewRouter.post("/review", async (req: Request, res: Response) => {
  try {
    const { repoUrl, prNumber, additionalComments, githubToken } =
      req.body as ReviewRequest;

    if (!repoUrl || !prNumber) {
      res.status(400).json({ error: "repoUrl and prNumber are required" });
      return;
    }

    // Parse GitHub URL
    const { owner, repo } = parseGitHubUrl(repoUrl);

    // Fetch the PR diff
    const prDiff = await fetchPrDiff(owner, repo, prNumber, githubToken);

    if (!prDiff.diff.trim()) {
      res.json({
        summary: "No reviewable diff found (binary files only?).",
        overall_risk: "none",
        findings: [],
        filesChanged: prDiff.files.length,
      } satisfies ReviewResult & { filesChanged: number });
      return;
    }

    // Review the diff with the Foundry agent
    const result = await reviewDiff(prDiff.diff, additionalComments);

    res.json({
      ...result,
      filesChanged: prDiff.files.length,
      diffLength: prDiff.diff.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Review error:", message);
    res.status(500).json({ error: message });
  }
});
