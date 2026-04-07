import type { ReviewResult, Finding } from "../types";

interface ReviewResultsProps {
  result: ReviewResult;
}

const RISK_EMOJI: Record<ReviewResult["overall_risk"], string> = {
  high: "🔴",
  medium: "🟡",
  low: "🔵",
  none: "✅",
};

const SEVERITY_EMOJI: Record<Finding["severity"], string> = {
  high: "🔴",
  medium: "🟡",
  low: "🔵",
};

export function ReviewResults({ result }: ReviewResultsProps) {
  const high = result.findings.filter((f) => f.severity === "high");
  const medium = result.findings.filter((f) => f.severity === "medium");
  const low = result.findings.filter((f) => f.severity === "low");

  return (
    <div>
      <div className="results-header">
        <h2>Review Results</h2>
        <span className={`risk-badge ${result.overall_risk}`}>
          {RISK_EMOJI[result.overall_risk]} {result.overall_risk} risk
        </span>
      </div>

      <p className="summary-text">{result.summary}</p>

      {result.findings.length === 0 && (
        <p style={{ color: "var(--none)" }}>
          ✅ No significant issues found.
        </p>
      )}

      {([
        ["High", high],
        ["Medium", medium],
        ["Low", low],
      ] as const).map(([label, group]) => {
        if (group.length === 0) return null;
        const sev = label.toLowerCase() as Finding["severity"];
        return (
          <div className="severity-section" key={label}>
            <h3>
              {SEVERITY_EMOJI[sev]} {label} severity ({group.length})
            </h3>
            {group.map((finding, i) => (
              <FindingCard key={`${finding.file}-${finding.line_range}-${i}`} finding={finding} />
            ))}
          </div>
        );
      })}

      {(result.filesChanged || result.diffLength) && (
        <div className="stats">
          {result.filesChanged && <span>{result.filesChanged} files changed</span>}
          {result.diffLength && <span>{result.diffLength.toLocaleString()} chars of diff</span>}
          <span>{result.findings.length} findings</span>
        </div>
      )}
    </div>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  return (
    <div className="finding-card">
      <div className="finding-header">
        <span className="finding-file">{finding.file}</span>
        <span className="finding-line">{finding.line_range}</span>
        <span className="category-tag">{finding.category}</span>
      </div>
      <p className="finding-explanation">{finding.explanation}</p>
      <div className="finding-suggestion">{finding.suggestion}</div>
    </div>
  );
}
