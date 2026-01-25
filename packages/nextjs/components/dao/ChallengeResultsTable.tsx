"use client";

import { ChallengeSetInfo, ChallengeVerificationStatus } from "~~/types/mfssia";

interface ChallengeResultsTableProps {
  challengeSet: ChallengeSetInfo;
  challengeStatuses: ChallengeVerificationStatus[];
  overallConfidence: number;
  attestationUAL?: string;
  validityPeriod?: {
    issuedAt: string;
    expiresAt: string;
  };
  did?: string;
}

/**
 * ChallengeResultsTable - Displays the results after verification is complete
 */
export const ChallengeResultsTable = ({
  challengeSet,
  challengeStatuses,
  overallConfidence,
  attestationUAL,
  validityPeriod,
  did,
}: ChallengeResultsTableProps) => {
  const passedCount = challengeStatuses.filter(s => s.status === "passed").length;
  const failedCount = challengeStatuses.filter(s => s.status === "failed").length;
  const isSuccess = failedCount === 0 && overallConfidence >= challengeSet.requiredConfidence;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Result header */}
      <div
        className={`text-center p-6 rounded-2xl ${
          isSuccess ? "bg-success/10 border border-success/30" : "bg-error/10 border border-error/30"
        }`}
      >
        <div
          className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
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
        <h2 className={`text-2xl font-bold ${isSuccess ? "text-success" : "text-error"}`}>
          {isSuccess ? "Verification Successful" : "Verification Failed"}
        </h2>
        <p className="text-base-content/70 mt-2">
          {isSuccess
            ? "All required challenges have been verified successfully."
            : `${failedCount} challenge(s) failed verification.`}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-base-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-success">{passedCount}</div>
          <div className="text-sm text-base-content/60">Passed</div>
        </div>
        <div className="bg-base-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-error">{failedCount}</div>
          <div className="text-sm text-base-content/60">Failed</div>
        </div>
        <div className="bg-base-200 rounded-xl p-4 text-center">
          <div
            className={`text-2xl font-bold ${
              overallConfidence >= challengeSet.requiredConfidence ? "text-success" : "text-warning"
            }`}
          >
            {(overallConfidence * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-base-content/60">Confidence</div>
        </div>
      </div>

      {/* Detailed results table */}
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Challenge</th>
              <th>Status</th>
              <th>Confidence</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {challengeStatuses.map(status => {
              const definition = challengeSet.challenges.find(c => c.code === status.code);
              return (
                <tr key={status.code}>
                  <td>
                    <div>
                      <div className="font-medium">{status.name}</div>
                      <div className="text-xs text-base-content/50 font-mono">{status.code}</div>
                      {definition && (
                        <div className="flex gap-1 mt-1">
                          <span className={`badge badge-xs ${definition.mandatory ? "badge-primary" : "badge-ghost"}`}>
                            {definition.mandatory ? "Required" : "Optional"}
                          </span>
                          <span className="badge badge-xs badge-outline">{definition.factorClass}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        status.status === "passed"
                          ? "badge-success"
                          : status.status === "failed"
                            ? "badge-error"
                            : "badge-ghost"
                      }`}
                    >
                      {status.status === "passed" ? "Passed" : status.status === "failed" ? "Failed" : "Pending"}
                    </span>
                  </td>
                  <td>
                    {status.confidence !== null ? (
                      <div className="flex items-center gap-2">
                        <progress
                          className={`progress w-16 ${
                            status.confidence >= 0.85 ? "progress-success" : "progress-warning"
                          }`}
                          value={status.confidence * 100}
                          max="100"
                        ></progress>
                        <span className="text-sm font-mono">{(status.confidence * 100).toFixed(0)}%</span>
                      </div>
                    ) : (
                      <span className="text-base-content/50">-</span>
                    )}
                  </td>
                  <td>
                    <span className="text-sm text-base-content/70">{status.message || "-"}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Attestation details */}
      {isSuccess && (
        <div className="bg-base-200 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Attestation Details
          </h3>

          <div className="space-y-2 text-sm">
            {did && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-base-content/60">Your DID</span>
                <span className="font-mono text-xs truncate max-w-[250px]" title={did}>
                  {did}
                </span>
              </div>
            )}
            <div className="flex items-start justify-between gap-2">
              <span className="text-base-content/60">Challenge Set</span>
              <span className="font-mono text-xs">{challengeSet.id}</span>
            </div>
            {attestationUAL && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-base-content/60">Attestation UAL</span>
                <span className="font-mono text-xs truncate max-w-[250px]" title={attestationUAL}>
                  {attestationUAL}
                </span>
              </div>
            )}
            {validityPeriod && (
              <>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-base-content/60">Issued At</span>
                  <span className="text-xs">{formatDate(validityPeriod.issuedAt)}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-base-content/60">Expires At</span>
                  <span className="text-xs">{formatDate(validityPeriod.expiresAt)}</span>
                </div>
              </>
            )}
            <div className="flex items-start justify-between gap-2">
              <span className="text-base-content/60">Confidence Threshold Met</span>
              <span className={`badge badge-sm ${isSuccess ? "badge-success" : "badge-error"}`}>
                {isSuccess ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* What's next info */}
      <div className="alert bg-info/10 border border-info/20">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-info shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="text-sm">
          <p className="font-semibold">{isSuccess ? "What's Next?" : "What Now?"}</p>
          <p className="text-base-content/70">
            {isSuccess
              ? "Your attestation has been generated. You can now proceed with role assignment to complete your onboarding."
              : "Some challenges failed verification. You can try again or contact support if the issue persists."}
          </p>
        </div>
      </div>
    </div>
  );
};
