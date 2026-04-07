# Embr PR Reviewer

AI-powered pull request reviewer — enter a GitHub repo URL and PR number, get structured code review feedback powered by an Embr Foundry agent.

## Features

- **GitHub PR integration** — paste a repo URL + PR number and the diff is fetched automatically
- **Custom instructions** — tell the reviewer what to focus on (security, error handling, etc.)
- **Structured findings** — results grouped by severity (high/medium/low) with file, line range, explanation, and fix suggestions
- **Foundry agent powered** — uses an Embr Foundry agent for intelligent code review

## Architecture

```
React Frontend  →  Express Backend  →  GitHub API (fetch diff)
                                    →  Foundry /public/chat (SSE review)
```

## Local Development

### Prerequisites

- Node.js 20+
- An Embr project with a Foundry agent configured

### Setup

```bash
# Install all dependencies
npm run install:all

# Copy and configure environment variables
cp .env.example server/.env
# Edit server/.env with your EMBR_API_URL and EMBR_PROJECT_ID

# Start both frontend and backend in dev mode
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API calls to the backend on port 3001.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `EMBR_API_URL` | Your Embr API base URL (e.g., `https://api.your-domain.embr-test.windows-int.net`) |
| `EMBR_PROJECT_ID` | Your Embr project ID |
| `PORT` | Server port (default: 3001) |

## Deploy to Embr

```bash
embr login
embr quickstart deploy owner/embr-pr-reviewer
```

Set the environment variables (`EMBR_API_URL`, `EMBR_PROJECT_ID`) in your Embr project settings.

## Production Build

```bash
npm run build    # Builds both client and server
npm start        # Starts the Express server (serves React build + API)
```
