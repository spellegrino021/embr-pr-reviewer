import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.EMBR_API_KEY,
  baseURL: process.env.EMBR_BASE_URL,
  defaultHeaders: {
    "api-key": process.env.EMBR_API_KEY,
  },
});

const AGENT_ID = process.env.EMBR_AGENT_ID!;

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

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "2-3 sentence summary of the PR and overall quality",
    },
    overall_risk: {
      type: "string",
      enum: ["high", "medium", "low", "none"],
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["high", "medium", "low"] },
          category: {
            type: "string",
            enum: ["bug", "security", "performance", "style", "logic"],
          },
          file: { type: "string" },
          line_range: {
            type: "string",
            description: 'e.g. "L12-L18" or "L42"',
          },
          explanation: { type: "string" },
          suggestion: { type: "string" },
        },
        required: [
          "severity",
          "category",
          "file",
          "line_range",
          "explanation",
          "suggestion",
        ],
      },
    },
  },
  required: ["summary", "overall_risk", "findings"],
  additionalProperties: false,
};

export async function reviewDiff(diff: string): Promise<ReviewResult> {
  const response = await client.responses.create({
    model: AGENT_ID,
    input: [
      {
        role: "user",
        content: `Review this pull request diff. Focus on bugs, security issues, logic errors, and significant performance problems. Skip minor style nits unless they indicate a real problem.

\`\`\`diff
${diff}
\`\`\``,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "review_result",
        schema: RESPONSE_SCHEMA,
        strict: true,
      },
    },
  } as any);

  const text = (response as any).output_text ?? 
    (response as any).output?.find((b: any) => b.type === "text")?.text;
  
  if (!text) throw new Error("No text output from Responses API");
  return JSON.parse(text) as ReviewResult;
}
