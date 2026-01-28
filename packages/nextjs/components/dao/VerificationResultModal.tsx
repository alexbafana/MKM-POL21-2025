"use client";

import { useState } from "react";
import { CollectedEvidence } from "~~/components/dao/ChallengeEvidenceCard";
import type { ChallengeOracleResult } from "~~/hooks/useEmploymentEventVerification";
import { ChallengeSetInfo } from "~~/types/mfssia";

interface VerificationResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
  onSubmitToDKG: () => void;
  verificationState: "success" | "failed";
  confidence: number | null;
  instanceId: string | null;
  challengeResults: Record<string, ChallengeOracleResult>;
  challengeEvidence: Record<string, CollectedEvidence>;
  challengeSet: ChallengeSetInfo | null;
  dkgSubmissionState: "idle" | "submitting" | "submitted" | "error";
  dkgAssetUAL: string | null;
  onRecordOnChain?: () => void;
  onChainState?: "idle" | "recording" | "recorded" | "error";
}

const getShortCode = (code: string): string => code.replace("mfssia:", "");

export const VerificationResultModal = ({
  isOpen,
  onClose,
  onReset,
  onSubmitToDKG,
  verificationState,
  confidence,
  instanceId,
  challengeResults,
  challengeEvidence,
  challengeSet,
  dkgSubmissionState,
  dkgAssetUAL,
  onRecordOnChain,
  onChainState = "idle",
}: VerificationResultModalProps) => {
  const [expandedChallenges, setExpandedChallenges] = useState<Set<string>>(new Set());

  if (!isOpen || !challengeSet) return null;

  const isSuccess = verificationState === "success";
  const challenges = challengeSet.challenges;
  const mandatoryChallenges = challenges.filter(c => c.mandatory);
  const optionalChallenges = challenges.filter(c => !c.mandatory);

  const passedCount = Object.values(challengeResults).filter(r => r.passed).length;
  const failedCount = Object.values(challengeResults).filter(r => !r.passed).length;

  const toggleExpanded = (code: string) => {
    setExpandedChallenges(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const renderChallengeRow = (challenge: (typeof challenges)[0]) => {
    const result = challengeResults[challenge.code];
    const evidence = challengeEvidence[challenge.code];
    const isExpanded = expandedChallenges.has(challenge.code);
    const passed = result?.passed;
    const hasResult = result !== undefined;

    return (
      <div
        key={challenge.code}
        className={`border rounded-lg overflow-hidden ${
          hasResult ? (passed ? "border-success/30" : "border-error/30") : "border-base-300"
        }`}
      >
        {/* Row header */}
        <button
          onClick={() => toggleExpanded(challenge.code)}
          className="w-full flex items-center gap-3 p-3 text-left hover:bg-base-200/50 transition-colors"
        >
          {/* Status icon */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
              hasResult
                ? passed
                  ? "bg-success/20 text-success"
                  : "bg-error/20 text-error"
                : "bg-base-200 text-base-content/40"
            }`}
          >
            {hasResult ? (passed ? "\u2713" : "\u2717") : "\u2014"}
          </div>

          {/* Challenge info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-primary">{getShortCode(challenge.code)}</span>
              <span className="font-medium text-sm truncate">{challenge.name}</span>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 shrink-0">
            <span className={`badge badge-xs ${challenge.mandatory ? "badge-primary" : "badge-ghost"}`}>
              {challenge.mandatory ? "Required" : "Optional"}
            </span>
            {hasResult && (
              <span className={`badge badge-sm ${passed ? "badge-success" : "badge-error"}`}>
                {passed ? "Pass" : "Fail"}
              </span>
            )}
          </div>

          {/* Expand chevron */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 text-base-content/40 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Expanded details */}
        {isExpanded && (
          <div className="px-3 pb-3 border-t border-base-200">
            {/* Oracle message */}
            {result?.message && (
              <div className="mt-2 p-2 rounded bg-base-200 text-xs text-base-content/70">{result.message}</div>
            )}

            {/* Confidence */}
            {result && result.confidence > 0 && (
              <div className="mt-2 text-xs text-base-content/60">
                Confidence: {(result.confidence * 100).toFixed(1)}%
              </div>
            )}

            {/* Evidence payload */}
            {evidence && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-base-content/60 mb-1">Evidence Payload:</p>
                <pre className="text-xs p-2 bg-base-200 rounded overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
                  {JSON.stringify(evidence.data, null, 2)}
                </pre>
                <p className="text-xs text-base-content/40 mt-1">
                  Collected: {new Date(evidence.collectedAt).toLocaleString()}
                </p>
              </div>
            )}

            {/* No evidence submitted for this challenge */}
            {!evidence && (
              <div className="mt-2 text-xs text-base-content/40 italic">
                No evidence was submitted for this challenge.
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center ${
              isSuccess ? "bg-success/20" : "bg-error/20"
            }`}
          >
            {isSuccess ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-error"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div>
            <h3 className={`text-2xl font-bold ${isSuccess ? "text-success" : "text-error"}`}>
              {isSuccess ? "Verification Passed" : "Verification Failed"}
            </h3>
            <div className="flex items-center gap-3 mt-1">
              {confidence !== null && (
                <span className={`badge ${confidence >= 0.85 ? "badge-success" : "badge-warning"}`}>
                  {(confidence * 100).toFixed(1)}% confidence
                </span>
              )}
              {instanceId && (
                <span className="text-xs font-mono text-base-content/50">
                  {instanceId.length > 20 ? `${instanceId.slice(0, 10)}...${instanceId.slice(-8)}` : instanceId}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 bg-success/10 rounded-lg p-3 text-center border border-success/20">
            <div className="text-2xl font-bold text-success">{passedCount}</div>
            <div className="text-xs text-success/80">Passed</div>
          </div>
          <div className="flex-1 bg-error/10 rounded-lg p-3 text-center border border-error/20">
            <div className="text-2xl font-bold text-error">{failedCount}</div>
            <div className="text-xs text-error/80">Failed</div>
          </div>
          <div className="flex-1 bg-base-200 rounded-lg p-3 text-center border border-base-300">
            <div className="text-2xl font-bold text-base-content/60">
              {challenges.length - passedCount - failedCount}
            </div>
            <div className="text-xs text-base-content/50">No Result</div>
          </div>
        </div>

        {/* Required Challenges */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2">Required Challenges ({mandatoryChallenges.length})</h4>
          <div className="space-y-2">{mandatoryChallenges.map(renderChallengeRow)}</div>
        </div>

        {/* Optional Challenges */}
        {optionalChallenges.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold mb-2 text-base-content/70">
              Optional Challenges ({optionalChallenges.length})
            </h4>
            <div className="space-y-2">{optionalChallenges.map(renderChallengeRow)}</div>
          </div>
        )}

        {/* DKG Submission Status */}
        {isSuccess && dkgSubmissionState === "submitted" && (
          <div className="mb-4 space-y-3">
            <div className="alert bg-success/10 border border-success/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm">
                {dkgAssetUAL
                  ? "Successfully published to the Decentralized Knowledge Graph."
                  : "TTL content ingested by MFSSIA. DKG Knowledge Asset creation may be processed asynchronously."}
              </span>
            </div>

            {/* UAL Display */}
            {dkgAssetUAL && (
              <div className="bg-base-200 rounded-lg p-4 border border-base-300">
                <div className="text-xs text-base-content/50 mb-1">DKG Asset UAL</div>
                <div className="font-mono text-sm break-all bg-base-100 rounded p-2 border border-base-300">
                  {dkgAssetUAL}
                </div>
                <a
                  href={`https://dkg.origintrail.io/explore?ual=${encodeURIComponent(dkgAssetUAL)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-ghost gap-1 mt-2 text-accent"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  View on DKG Explorer
                </a>
              </div>
            )}

            {/* Record on Blockchain Button (Owner only) */}
            {onRecordOnChain && (
              <div className="bg-base-200 rounded-lg p-4 border border-base-300">
                <div className="text-xs text-base-content/50 mb-2">On-Chain Recording</div>
                {onChainState === "recorded" ? (
                  <div className="flex items-center gap-2 text-success text-sm">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    UAL recorded on blockchain
                  </div>
                ) : onChainState === "error" ? (
                  <div className="space-y-2">
                    <div className="text-error text-sm">Failed to record on blockchain.</div>
                    <button onClick={onRecordOnChain} className="btn btn-sm btn-error btn-outline gap-1">
                      Retry
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={onRecordOnChain}
                    disabled={onChainState === "recording"}
                    className="btn btn-sm btn-accent gap-1"
                  >
                    {onChainState === "recording" ? (
                      <>
                        <span className="loading loading-spinner loading-xs" />
                        Recording...
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                          />
                        </svg>
                        Record on Blockchain
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {dkgSubmissionState === "error" && (
          <div className="alert alert-error mb-4">
            <span className="text-sm">DKG submission failed. Please try again.</span>
          </div>
        )}

        {/* Footer */}
        <div className="modal-action">
          {isSuccess ? (
            <>
              <button
                onClick={onSubmitToDKG}
                disabled={dkgSubmissionState === "submitting" || dkgSubmissionState === "submitted"}
                className="btn btn-primary gap-2"
              >
                {dkgSubmissionState === "submitting" ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Submitting...
                  </>
                ) : dkgSubmissionState === "submitted" ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Published to DKG
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    Publish on DKG
                  </>
                )}
              </button>
              <button onClick={onClose} className="btn btn-ghost">
                Close
              </button>
            </>
          ) : (
            <>
              <button onClick={onReset} className="btn btn-primary gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Try Again
              </button>
              <button onClick={onClose} className="btn btn-ghost">
                Close
              </button>
            </>
          )}
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}>
        <button className="cursor-default">close</button>
      </div>
    </div>
  );
};
