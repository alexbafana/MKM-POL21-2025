"use client";

import { ChallengeDefinition, ChallengeSetInfo } from "~~/types/mfssia";

interface ChallengeProgressTrackerProps {
  challengeSet: ChallengeSetInfo;
  currentChallenge?: string | null;
  overallConfidence: number | null;
  oracleConnectionState: "disconnected" | "connecting" | "connected" | "reconnecting" | "error";
  oracleVerificationState: "idle" | "requested" | "processing" | "success" | "failed" | "error";
  oracleMessage: string | null;
  did?: string | null;
}

/**
 * Get short code from full challenge code (e.g., "mfssia:C-A-1" -> "C-A-1")
 */
const getShortCode = (code: string): string => {
  return code.replace("mfssia:", "");
};

/**
 * Factor class badge color
 */
const getFactorClassColor = (factorClass: string): string => {
  switch (factorClass) {
    case "SourceIntegrity":
      return "badge-primary";
    case "ProcessIntegrity":
      return "badge-secondary";
    case "DataIntegrity":
      return "badge-accent";
    default:
      return "badge-ghost";
  }
};

/**
 * ChallengeProgressTracker - Shows challenge set details and verification progress
 */
export const ChallengeProgressTracker = ({
  challengeSet,
  currentChallenge,
  overallConfidence,
  oracleConnectionState,
  oracleVerificationState,
  oracleMessage,
  did,
}: ChallengeProgressTrackerProps) => {
  const mandatoryChallenges = challengeSet.challenges.filter(c => c.mandatory);
  const optionalChallenges = challengeSet.challenges.filter(c => !c.mandatory);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-base-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-semibold">{challengeSet.name}</h3>
            <p className="text-xs font-mono text-base-content/50">{challengeSet.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                oracleConnectionState === "connected"
                  ? "bg-success"
                  : oracleConnectionState === "error"
                    ? "bg-error"
                    : "bg-warning animate-pulse"
              }`}
            />
            <span className="text-xs capitalize">{oracleConnectionState}</span>
          </div>
        </div>

        {/* DID */}
        {did && <div className="text-xs font-mono text-base-content/60 truncate">{did}</div>}

        {/* Progress */}
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span>Progress</span>
            <span>0/{mandatoryChallenges.length} challenges</span>
          </div>
          <progress
            className={`progress w-full h-2 ${
              oracleVerificationState === "success" ? "progress-success" : "progress-primary"
            }`}
            value={0}
            max="100"
          />
        </div>

        {/* Confidence */}
        {overallConfidence !== null && (
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span>Confidence</span>
              <span className={overallConfidence >= 0.85 ? "text-success" : "text-warning"}>
                {(overallConfidence * 100).toFixed(0)}%
              </span>
            </div>
            <progress
              className={`progress w-full h-2 ${overallConfidence >= 0.85 ? "progress-success" : "progress-warning"}`}
              value={overallConfidence * 100}
              max="100"
            />
          </div>
        )}

        {/* Oracle Message */}
        {oracleMessage && (
          <div
            className={`mt-3 p-2 rounded text-xs whitespace-pre-wrap break-words ${
              oracleVerificationState === "success"
                ? "bg-success/10 text-success"
                : oracleVerificationState === "failed"
                  ? "bg-error/10 text-error"
                  : "bg-info/10 text-info"
            }`}
          >
            {oracleMessage}
          </div>
        )}
      </div>

      {/* Challenges */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Challenges</h4>

        {mandatoryChallenges.map(challenge => (
          <ChallengeCard key={challenge.code} challenge={challenge} isActive={currentChallenge === challenge.code} />
        ))}

        {optionalChallenges.length > 0 && (
          <>
            <h4 className="text-xs font-medium text-base-content/50 mt-4">Optional</h4>
            {optionalChallenges.map(challenge => (
              <ChallengeCard
                key={challenge.code}
                challenge={challenge}
                isActive={currentChallenge === challenge.code}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Individual challenge card
 */
const ChallengeCard = ({ challenge, isActive }: { challenge: ChallengeDefinition; isActive: boolean }) => {
  return (
    <div className={`rounded-lg p-3 border ${isActive ? "bg-info/10 border-info/30" : "bg-base-100 border-base-300"}`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold">{getShortCode(challenge.code)}</span>
          <span className="font-medium text-sm">{challenge.name}</span>
        </div>
        <span className={`badge badge-xs ${getFactorClassColor(challenge.factorClass)}`}>{challenge.factorClass}</span>
      </div>

      {/* Description */}
      <p className="text-xs text-base-content/70 mb-2">{challenge.description}</p>

      {/* Evidence */}
      <div className="flex flex-wrap gap-1">
        <span className="text-xs text-base-content/50">Evidence:</span>
        {challenge.expectedEvidence.map(field => (
          <code key={field} className="text-xs bg-base-200 px-1.5 py-0.5 rounded">
            {field}
          </code>
        ))}
      </div>

      {/* Oracle */}
      <div className="flex items-center gap-2 mt-2 text-xs text-base-content/50">
        <span>Oracle:</span>
        <span className="font-mono">{challenge.oracleEndpoint}</span>
      </div>
    </div>
  );
};
