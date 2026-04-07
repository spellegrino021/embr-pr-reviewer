import { useState } from "react";
import { ReviewForm } from "./components/ReviewForm";
import { ReviewResults } from "./components/ReviewResults";
import type { ReviewResult } from "./types";

function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResult | null>(null);

  const handleSubmit = async (data: {
    repoUrl: string;
    prNumber: number;
    additionalComments: string;
  }) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || `Request failed (${res.status})`);
      }

      setResult(json as ReviewResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1>🔥 Embr PR Reviewer</h1>
      <p className="subtitle">
        AI-powered code review — paste a GitHub PR and get structured feedback
      </p>

      <ReviewForm onSubmit={handleSubmit} loading={loading} />

      {error && <div className="error-message">{error}</div>}

      {loading && (
        <div className="loading">
          <div className="spinner" />
          <p>Analyzing your pull request…</p>
          <p style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
            This usually takes 10–30 seconds
          </p>
        </div>
      )}

      {result && <ReviewResults result={result} />}
    </>
  );
}

export default App;
