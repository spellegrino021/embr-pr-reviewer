# embr-pr-reviewer

A GitHub Action that automatically reviews pull requests using your Embr agent via the Foundry Responses API. Posts findings as a PR comment, grouped by severity.

## What it does

On every PR open or push, the action:
1. Fetches the diff from GitHub
2. Sends it to your Embr agent via `/applications/{agent}/protocols/openai/responses`
3. Gets back structured findings (severity, category, file, line range, explanation, suggestion)
4. Posts a formatted comment on the PR — or updates the existing one on re-runs

**Example output:**

> ## Embr PR Review
> 🟡 **Overall risk: MEDIUM**
>
> This PR adds a new chat endpoint and refactors auth handling. Logic is mostly sound but there's a credential exposure risk and one unhandled error path.
>
> ### 🔴 High severity (1)
> **`src/api/chat.ts` L14** — `security`
> API key is concatenated into the log string and will appear in CloudWatch.
> > 💡 Use `req.headers['api-key'] ? '[REDACTED]' : 'missing'` in the log statement.

---

## Setup

### 1. Create the repo

```bash
git clone https://github.com/your-org/embr-pr-reviewer
cd embr-pr-reviewer
npm install
```

### 2. Add GitHub secrets

In your GitHub repo → Settings → Secrets and variables → Actions, add:

| Secret | Value |
|--------|-------|
| `EMBR_API_KEY` | Your Embr API key |
| `EMBR_BASE_URL` | `https://api.stpelleg.embr-test.windows-int.net` (or your Embr base URL) |
| `EMBR_AGENT_ID` | The agent/application ID to use for reviews |

`GITHUB_TOKEN` is provided automatically by GitHub Actions — you don't need to add it.

### 3. Push and open a PR

The workflow triggers on `pull_request` events (opened, synchronize, reopened). Open any PR and the bot will comment within ~30 seconds.

---

## Using it in another repo

You don't have to run the reviewer in the same repo it reviews. To use it as a reusable action from another repo:

```yaml
# .github/workflows/pr-review.yml in the target repo
name: Embr PR Review
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  review:
    uses: your-org/embr-pr-reviewer/.github/workflows/pr-review.yml@main
    secrets:
      EMBR_API_KEY: ${{ secrets.EMBR_API_KEY }}
      EMBR_BASE_URL: ${{ secrets.EMBR_BASE_URL }}
      EMBR_AGENT_ID: ${{ secrets.EMBR_AGENT_ID }}
```

---

## Local testing

```bash
cp .env.example .env
# fill in .env values

# Run against a real PR
PR_NUMBER=42 GITHUB_REPOSITORY=your-org/your-repo npx tsx src/index.ts
```

---

## Customising the review prompt

Edit the prompt in `src/reviewer.ts` to focus on what matters for your codebase — security rules, naming conventions, architectural constraints, etc. The structured output schema is in the same file; add or remove fields to match what you want the agent to return.

## Why the Responses API and not Threads/Runs?

The Responses API is a single HTTP call — no thread creation, no polling. It works with a plain API key (no `agents/action` RBAC role required) and is OpenAI-compatible, so the standard `openai` npm package works out of the box. For a stateless, single-shot use case like PR review, it's the right tool.
