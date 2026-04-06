import type { ReviewResult, Finding } from "./reviewer.js";

const SEVERITY_EMOJI: Record<Finding["severity"], string> = {
  high: "🔴",
  medium: "🟡",
  low: "🔵",
};

const RISK_EMOJI: Record<ReviewResult["overall_risk"], string> = {
  high: "🔴",
  medium: "🟡",
  low: "🔵",
  none: "✅",
};

export function formatComment(result: ReviewResult): string {
  const lines: string[] = [];

  lines.push(`## Embr PR Review`);
  lines.push(``);
  lines.push(
    `${RISK_EMOJI[result.overall_risk]} **Overall risk: ${result.overall_risk.toUpperCase()}**`
  );
  lines.push(``);
  lines.push(result.summary);

  if (result.findings.length === 0) {
    lines.push(``);
    lines.push(`No significant issues found.`);
    return lines.join("\n");
  }

  // Group by severity
  const high = result.findings.filter((f) => f.severity === "high");
  const medium = result.findings.filter((f) => f.severity === "medium");
  const low = result.findings.filter((f) => f.severity === "low");

  for (const [label, group] of [
    ["High", high],
    ["Medium", medium],
    ["Low", low],
  ] as const) {
    if (group.length === 0) continue;
    lines.push(``);
    lines.push(`### ${SEVERITY_EMOJI[label.toLowerCase() as Finding["severity"]]} ${label} severity (${group.length})`);
    lines.push(``);

    for (const finding of group) {
      lines.push(
        `**\`${finding.file}\` ${finding.line_range}** — \`${finding.category}\``
      );
      lines.push(finding.explanation);
      lines.push(`> 💡 ${finding.suggestion}`);
      lines.push(``);
    }
  }

  lines.push(`---`);
  lines.push(`*Reviewed by [Embr AI](https://embr.io)*`);

  return lines.join("\n");
}
