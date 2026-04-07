export interface Finding {
  severity: "high" | "medium" | "low";
  category: "bug" | "security" | "performance" | "style" | "logic";
  file: string;
  line_range: string;
  explanation: string;
  suggestion: string;
}

export interface ReviewResult {
  summary: string;
  overall_risk: "high" | "medium" | "low" | "none";
  findings: Finding[];
}

const EMBR_API_URL = process.env.EMBR_API_URL;
const EMBR_PROJECT_ID = process.env.EMBR_PROJECT_ID;

const SYSTEM_PROMPT = `You are a senior code reviewer. You review pull request diffs and return structured findings.

For each finding, provide:
- severity: "high", "medium", or "low"
- category: "bug", "security", "performance", "style", or "logic"
- file: the filename
- line_range: e.g. "L12-L18" or "L42"
- explanation: what the issue is
- suggestion: how to fix it

Return your response as JSON with this exact structure:
{
  "summary": "2-3 sentence summary of the PR and overall quality",
  "overall_risk": "high" | "medium" | "low" | "none",
  "findings": [{ severity, category, file, line_range, explanation, suggestion }]
}

Focus on bugs, security issues, logic errors, and significant performance problems. Skip minor style nits unless they indicate a real problem. Return ONLY the JSON, no markdown fences.`;

/**
 * Calls the Foundry /public/chat SSE endpoint and collects the full response.
 * The SSE event type is on the `event:` line, NOT in the JSON data payload.
 */
export async function reviewDiff(
  diff: string,
  additionalComments?: string
): Promise<ReviewResult> {
  if (!EMBR_API_URL || !EMBR_PROJECT_ID) {
    throw new Error(
      "Missing EMBR_API_URL or EMBR_PROJECT_ID environment variables"
    );
  }

  let userContent = `Review this pull request diff:\n\n\`\`\`diff\n${diff}\n\`\`\``;

  if (additionalComments?.trim()) {
    userContent += `\n\nAdditional reviewer instructions:\n${additionalComments}`;
  }

  const url = `${EMBR_API_URL}/projects/${EMBR_PROJECT_ID}/public/chat`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Foundry agent error (${response.status}): ${text}`);
  }

  // Parse SSE stream — collect all content chunks
  const body = response.body;
  if (!body) throw new Error("No response body from Foundry agent");

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // keep incomplete line in buffer

    let currentEvent = "";

    for (const line of lines) {
      if (line.startsWith("event:")) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;

        // Only process content events
        if (
          currentEvent === "content" ||
          currentEvent === "message" ||
          currentEvent === ""
        ) {
          try {
            const parsed = JSON.parse(data);
            // Handle various SSE payload shapes
            const chunk =
              parsed.content ??
              parsed.choices?.[0]?.delta?.content ??
              parsed.choices?.[0]?.message?.content ??
              parsed.text ??
              "";
            fullContent += chunk;
          } catch {
            // Non-JSON data line, skip
          }
        }
      } else if (line.trim() === "") {
        currentEvent = ""; // reset on blank line (SSE event boundary)
      }
    }
  }

  if (!fullContent.trim()) {
    throw new Error("No content received from Foundry agent");
  }

  // Strip markdown code fences if the agent wrapped the JSON
  let cleaned = fullContent.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  try {
    return JSON.parse(cleaned) as ReviewResult;
  } catch {
    throw new Error(
      `Failed to parse agent response as JSON. Raw response:\n${cleaned.slice(0, 500)}`
    );
  }
}
