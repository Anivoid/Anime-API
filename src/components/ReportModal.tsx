"use client";

import { useState } from "react";

interface ReportModalProps {
  commentId: string;
  onClose: () => void;
  onReported?: () => void;
}

const REASONS = [
  "Spam or advertising",
  "Harassment or bullying",
  "Hate speech",
  "Inappropriate content",
  "Spoiler without warning",
  "Off-topic",
  "Other",
];

export function ReportModal({ commentId, onClose, onReported }: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, reason, details }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit report");
      }

      setSuccess(true);
      onReported?.();
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-void-dark border border-void-gray rounded-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Report Comment</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="text-green-400 text-4xl mb-3">✓</div>
            <p className="text-white">Report submitted successfully</p>
            <p className="text-gray-500 text-sm mt-1">Our team will review it shortly</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Reason *</label>
              <div className="space-y-2">
                {REASONS.map((r) => (
                  <label key={r} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="w-4 h-4 text-void-red bg-void-black border-void-gray focus:ring-void-red"
                    />
                    <span className="text-gray-300 text-sm">{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Additional details (optional)</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full bg-void-black border border-void-gray rounded-lg p-2 text-white text-sm placeholder-gray-500 focus:border-void-red focus:outline-none resize-none"
                rows={3}
                placeholder="Provide more context about this report..."
              />
            </div>

            {error && <p className="text-void-red text-sm mb-4">{error}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!reason || submitting}
                className="flex-1 bg-void-red py-2 rounded-lg text-white font-medium hover:bg-void-red-dark disabled:opacity-50 transition-colors"
              >
                {submitting ? "Submitting..." : "Submit Report"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-void-gray rounded-lg text-gray-400 hover:text-white hover:border-void-red/50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
