import { useState } from "react";

interface ReviewFormProps {
  onSubmit: (data: {
    repoUrl: string;
    prNumber: number;
    additionalComments: string;
  }) => void;
  loading: boolean;
}

export function ReviewForm({ onSubmit, loading }: ReviewFormProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const [prNumber, setPrNumber] = useState("");
  const [additionalComments, setAdditionalComments] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(prNumber, 10);
    if (!repoUrl || isNaN(num) || num <= 0) return;
    onSubmit({ repoUrl, prNumber: num, additionalComments });
  };

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <div className="form-row">
        <div>
          <label htmlFor="repoUrl">GitHub Repository URL</label>
          <input
            id="repoUrl"
            type="text"
            placeholder="https://github.com/owner/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        <div className="pr-number">
          <label htmlFor="prNumber">PR Number</label>
          <input
            id="prNumber"
            type="number"
            placeholder="42"
            min={1}
            value={prNumber}
            onChange={(e) => setPrNumber(e.target.value)}
            disabled={loading}
            required
          />
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="comments">
          Additional Instructions{" "}
          <span style={{ fontWeight: 400 }}>(optional)</span>
        </label>
        <textarea
          id="comments"
          placeholder="e.g. Pay special attention to error handling and SQL injection risks..."
          value={additionalComments}
          onChange={(e) => setAdditionalComments(e.target.value)}
          disabled={loading}
        />
      </div>

      <button type="submit" className="primary" disabled={loading}>
        {loading ? "Reviewing…" : "Review PR"}
      </button>
    </form>
  );
}
