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
const EMBR_API_KEY = process.env.EMBR_API_KEY;

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

  const url = `${EMBR_API_URL}/public/chat`;

  console.log(`[agent] Calling Foundry: POST ${url}`);
  console.log(`[agent] Project ID: ${EMBR_PROJECT_ID}`);
  console.log(`[agent] Message count: 2, user content length: ${userContent.length}`);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Project-Id": EMBR_PROJECT_ID!,
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      projectId: EMBR_PROJECT_ID,
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

  console.log(`[agent] Foundry response status: ${response.status}, content-type: ${response.headers.get("content-type")}`);

  // Parse SSE stream — collect all content chunks
  const body = response.body;
  if (!body) throw new Error("No response body from Foundry agent");

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";
  let buffer = "";
  let lineCount = 0;
  let eventCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // keep incomplete line in buffer

    let currentEvent = "";

    for (const line of lines) {
      lineCount++;

      // Log first 20 raw lines for debugging
      if (lineCount <= 20) {
        console.log(`[agent] SSE line ${lineCount}: ${JSON.stringify(line)}`);
      }

      if (line.startsWith("event:")) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        const data = line.slice(5).trim();
        if (data === "[DONE]") {
          console.log(`[agent] Received [DONE] signal`);
          continue;
        }

        eventCount++;

        // Log every event type we see
        if (eventCount <= 10) {
          console.log(`[agent] Event #${eventCount} type="${currentEvent}" data=${data.slice(0, 200)}`);
        }

        // Process all recognized event types
        if (
          currentEvent === "token" ||
          currentEvent === "content" ||
          currentEvent === "message" ||
          currentEvent === ""
        ) {
          try {
            const parsed = JSON.parse(data);
            // Handle various SSE payload shapes
            const contentChunk =
              parsed.content ??
              parsed.choices?.[0]?.delta?.content ??
              parsed.choices?.[0]?.message?.content ??
              parsed.text ??
              "";
            if (contentChunk) {
              fullContent += contentChunk;
            } else if (eventCount <= 5) {
              console.log(`[agent] Parsed JSON but no content found. Keys: ${Object.keys(parsed).join(", ")}`);
            }
          } catch {
            if (eventCount <= 5) {
              console.log(`[agent] Non-JSON data line: ${data.slice(0, 100)}`);
            }
          }
        } else {
          if (eventCount <= 10) {
            console.log(`[agent] Skipping unrecognized event type: "${currentEvent}"`);
          }
        }
      } else if (line.trim() === "") {
        currentEvent = ""; // reset on blank line (SSE event boundary)
      }
    }
  }

  console.log(`[agent] Stream complete. Lines: ${lineCount}, Events: ${eventCount}, Content length: ${fullContent.length}`);
  if (fullContent.length > 0) {
    console.log(`[agent] Content preview: ${fullContent.slice(0, 200)}`);
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
