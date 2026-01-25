"use client";

import { ChallengeDefinition } from "~~/types/mfssia";

/**
 * Evidence status for a challenge
 */
export type ChallengeEvidenceStatus =
  | "pending"
  | "collecting"
  | "collected"
  | "submitting"
  | "submitted"
  | "verified"
  | "failed";

/**
 * Collected evidence for a challenge
 */
export interface CollectedEvidence {
  challengeCode: string;
  data: Record<string, any>;
  collectedAt: string;
}

interface ChallengeEvidenceCardProps {
  challenge: ChallengeDefinition;
  evidenceStatus: ChallengeEvidenceStatus;
  collectedEvidence: CollectedEvidence | null;
  onCollectEvidence: (challengeCode: string) => void;
  isCollecting: boolean;
  error: string | null;
  oracleResult?: {
    passed: boolean;
    confidence: number;
    message?: string;
  } | null;
  /** Whether batch submission is in progress */
  isBatchSubmitting?: boolean;
}

/**
 * Get short code from full challenge code (e.g., "mfssia:C-A-1" -> "C-A-1")
 */
const getShortCode = (code: string): string => {
  return code.replace("mfssia:", "");
};

/**
 * Factor class badge styling
 * Supports Example-A (RDF Artifact Integrity) factor classes
 */
const getFactorClassStyle = (factorClass: string): string => {
  switch (factorClass) {
    case "SourceIntegrity":
      return "badge-primary";
    case "ContentIntegrity":
      return "badge-secondary";
    case "TemporalValidity":
      return "badge-accent";
    case "AuthorAuthenticity":
      return "badge-info";
    case "Provenance":
      return "badge-warning";
    case "DistributionIntegrity":
      return "badge-success";
    case "ProcessIntegrity":
      return "badge-secondary";
    case "DataIntegrity":
      return "badge-accent";
    default:
      return "badge-ghost";
  }
};

/**
 * Status badge styling and text
 */
const getStatusConfig = (status: ChallengeEvidenceStatus): { class: string; text: string; icon: string } => {
  switch (status) {
    case "pending":
      return { class: "badge-ghost", text: "Pending", icon: "○" };
    case "collecting":
      return { class: "badge-warning", text: "Collecting...", icon: "◔" };
    case "collected":
      return { class: "badge-info", text: "Ready to Submit", icon: "●" };
    case "submitting":
      return { class: "badge-warning", text: "Submitting...", icon: "◔" };
    case "submitted":
      return { class: "badge-info", text: "Submitted", icon: "●" };
    case "verified":
      return { class: "badge-success", text: "Verified", icon: "✓" };
    case "failed":
      return { class: "badge-error", text: "Failed", icon: "✗" };
    default:
      return { class: "badge-ghost", text: "Unknown", icon: "?" };
  }
};

/**
 * ChallengeEvidenceCard - Interactive card for collecting and submitting evidence for a single challenge
 */
export const ChallengeEvidenceCard = ({
  challenge,
  evidenceStatus,
  collectedEvidence,
  onCollectEvidence,
  isCollecting,
  error,
  oracleResult,
  isBatchSubmitting = false,
}: ChallengeEvidenceCardProps) => {
  const statusConfig = getStatusConfig(evidenceStatus);
  const canCollect = evidenceStatus === "pending" || evidenceStatus === "failed";
  const isProcessing = isCollecting || isBatchSubmitting;

  return (
    <div
      className={`card bg-base-100 border-2 transition-all duration-300 ${
        evidenceStatus === "verified"
          ? "border-success/50 bg-success/5"
          : evidenceStatus === "failed"
            ? "border-error/50 bg-error/5"
            : evidenceStatus === "collected" || evidenceStatus === "submitted"
              ? "border-info/50 bg-info/5"
              : "border-base-300"
      }`}
    >
      <div className="card-body p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                evidenceStatus === "verified"
                  ? "bg-success/20 text-success"
                  : evidenceStatus === "failed"
                    ? "bg-error/20 text-error"
                    : evidenceStatus === "collected" || evidenceStatus === "submitted"
                      ? "bg-info/20 text-info"
                      : isProcessing
                        ? "bg-warning/20 text-warning animate-pulse"
                        : "bg-base-200 text-base-content/50"
              }`}
            >
              {isProcessing ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                statusConfig.icon
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-primary">{getShortCode(challenge.code)}</span>
                <span className="font-semibold">{challenge.name}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`badge badge-xs ${getFactorClassStyle(challenge.factorClass)}`}>
                  {challenge.factorClass}
                </span>
                <span className={`badge badge-xs ${statusConfig.class}`}>{statusConfig.text}</span>
              </div>
            </div>
          </div>

          {/* Mandatory indicator */}
          {challenge.mandatory && <span className="badge badge-sm badge-primary badge-outline">Required</span>}
        </div>

        {/* Description */}
        <p className="text-sm text-base-content/70 mt-2">{challenge.description}</p>

        {/* Expected Evidence Fields */}
        <div className="mt-3">
          <p className="text-xs font-semibold text-base-content/60 mb-1">Expected Evidence:</p>
          <div className="flex flex-wrap gap-1">
            {challenge.expectedEvidence.map(field => (
              <code
                key={field}
                className={`text-xs px-2 py-0.5 rounded ${
                  collectedEvidence?.data[field] !== undefined
                    ? "bg-success/20 text-success"
                    : "bg-base-200 text-base-content/60"
                }`}
              >
                {field}
                {collectedEvidence?.data[field] !== undefined && " ✓"}
              </code>
            ))}
          </div>
        </div>

        {/* Oracle endpoint */}
        <div className="flex items-center gap-2 mt-2 text-xs text-base-content/50">
          <span>Oracle:</span>
          <span className="font-mono">{challenge.oracleEndpoint}</span>
        </div>

        {/* Collected Evidence Preview */}
        {collectedEvidence && (
          <div className="mt-3 p-3 bg-base-200 rounded-lg">
            <p className="text-xs font-semibold text-base-content/60 mb-2">Collected Evidence:</p>
            <div className="space-y-1">
              {Object.entries(collectedEvidence.data).map(([key, value]) => (
                <div key={key} className="flex items-start gap-2 text-xs">
                  <span className="font-mono text-primary min-w-[100px]">{key}:</span>
                  <span className="font-mono text-base-content/70 break-all truncate max-w-[200px]">
                    {typeof value === "string" && value.length > 50 ? `${value.substring(0, 50)}...` : String(value)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-base-content/40 mt-2">
              Collected at: {new Date(collectedEvidence.collectedAt).toLocaleTimeString()}
            </p>
          </div>
        )}

        {/* Oracle Result */}
        {oracleResult && (
          <div
            className={`mt-3 p-3 rounded-lg ${
              oracleResult.passed ? "bg-success/10 border border-success/20" : "bg-error/10 border border-error/20"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`font-semibold text-sm ${oracleResult.passed ? "text-success" : "text-error"}`}>
                {oracleResult.passed ? "✓ Verified" : "✗ Failed"}
              </span>
              <span className="text-xs text-base-content/60">
                Confidence: {(oracleResult.confidence * 100).toFixed(0)}%
              </span>
            </div>
            {oracleResult.message && <p className="text-xs text-base-content/70 mt-1">{oracleResult.message}</p>}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="alert alert-error mt-3 py-2">
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          {canCollect && (
            <button
              onClick={() => onCollectEvidence(challenge.code)}
              disabled={isProcessing}
              className="btn btn-primary btn-sm flex-1 gap-2"
            >
              {isCollecting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Collecting...
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
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  Collect Evidence
                </>
              )}
            </button>
          )}

          {/* Show collected status when evidence is ready */}
          {evidenceStatus === "collected" && !isBatchSubmitting && (
            <div className="flex-1 flex items-center justify-center gap-2 text-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-success font-medium">Evidence Collected</span>
            </div>
          )}

          {/* Show submitting status during batch submission */}
          {(evidenceStatus === "collected" || evidenceStatus === "submitting") && isBatchSubmitting && (
            <div className="flex-1 flex items-center justify-center gap-2 text-sm">
              <svg className="w-4 h-4 animate-spin text-warning" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-warning">Submitting to Oracle...</span>
            </div>
          )}

          {/* Show waiting status after submission */}
          {evidenceStatus === "submitted" && (
            <div className="flex-1 flex items-center justify-center gap-2 text-sm">
              <svg className="w-4 h-4 animate-spin text-info" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-info">Waiting for Oracle...</span>
            </div>
          )}

          {/* Show verified status */}
          {evidenceStatus === "verified" && (
            <div className="flex-1 flex items-center justify-center gap-2 text-sm">
              <span className="text-success font-semibold">✓ Challenge Complete</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
