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
  filesChanged?: number;
  diffLength?: number;
}
