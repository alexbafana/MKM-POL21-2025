"use client";

import { ChallengeDefinition, ChallengeSetInfo } from "~~/types/mfssia";

interface ChallengeSetCardProps {
  challengeSet: ChallengeSetInfo;
  isSelected?: boolean;
  onSelect?: (challengeSet: ChallengeSetInfo) => void;
  showDetails?: boolean;
  compact?: boolean;
}

/**
 * Icon for factor class
 */
const FactorClassIcon = ({ factorClass }: { factorClass: string }) => {
  switch (factorClass) {
    case "SourceIntegrity":
      return (
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
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      );
    case "ProcessIntegrity":
      return (
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
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "DataIntegrity":
      return (
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
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
          />
        </svg>
      );
    default:
      return null;
  }
};

/**
 * Status badge for challenge set
 */
const StatusBadge = ({ status }: { status: ChallengeSetInfo["status"] }) => {
  const statusConfig = {
    ACTIVE: { class: "badge-success", label: "Active" },
    DEPRECATED: { class: "badge-error", label: "Deprecated" },
  };

  const config = statusConfig[status];

  return <span className={`badge badge-sm ${config.class}`}>{config.label}</span>;
};

/**
 * Challenge item display
 */
/**
 * Get short code from full challenge code (e.g., "mfssia:C-A-1" -> "C-A-1")
 */
const getShortCode = (code: string): string => {
  return code.replace("mfssia:", "");
};

const ChallengeItem = ({ challenge, showDetails }: { challenge: ChallengeDefinition; showDetails: boolean }) => {
  return (
    <div className={`flex items-start gap-2 p-2 rounded-lg ${challenge.mandatory ? "bg-base-200" : "bg-base-200/50"}`}>
      <div className={`mt-0.5 ${challenge.mandatory ? "text-success" : "text-base-content/50"}`}>
        {challenge.mandatory ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
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
              d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-primary">{getShortCode(challenge.code)}</span>
          <span className="font-medium text-sm">{challenge.name}</span>
          <span className={`badge badge-xs ${challenge.mandatory ? "badge-primary" : "badge-ghost"}`}>
            {challenge.mandatory ? "Required" : "Optional"}
          </span>
        </div>
        {showDetails && (
          <>
            <p className="text-xs text-base-content/60 mt-1">{challenge.description}</p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs text-base-content/50">
                <FactorClassIcon factorClass={challenge.factorClass} />
                {challenge.factorClass}
              </span>
              <span className="text-xs text-base-content/40">
                Oracle: <span className="font-mono">{challenge.oracleEndpoint}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {challenge.expectedEvidence.map(field => (
                <code key={field} className="text-xs bg-base-300 px-1 py-0.5 rounded">
                  {field}
                </code>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * ChallengeSetCard - Displays information about a single challenge set
 * Can be selectable for use in the ChallengeSetSelector
 */
export const ChallengeSetCard = ({
  challengeSet,
  isSelected = false,
  onSelect,
  showDetails = true,
  compact = false,
}: ChallengeSetCardProps) => {
  const isSelectable = !!onSelect;
  const isDisabled = challengeSet.status !== "ACTIVE";

  const handleClick = () => {
    if (isSelectable && !isDisabled && onSelect) {
      onSelect(challengeSet);
    }
  };

  const mandatoryChallenges = challengeSet.challenges.filter(c => c.mandatory);
  const optionalChallenges = challengeSet.challenges.filter(c => !c.mandatory);

  return (
    <div
      className={`card bg-base-100 border-2 transition-all duration-200 ${
        isSelected
          ? "border-primary shadow-lg shadow-primary/20"
          : isDisabled
            ? "border-base-300/50 opacity-60"
            : "border-base-300 hover:border-base-content/20"
      } ${isSelectable && !isDisabled ? "cursor-pointer" : ""}`}
      onClick={handleClick}
    >
      <div className={`card-body ${compact ? "p-4" : "p-6"}`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {isSelectable && (
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isSelected ? "border-primary bg-primary" : isDisabled ? "border-base-300" : "border-base-content/30"
                }`}
              >
                {isSelected && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 text-primary-content"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            )}
            <div>
              <h3 className={`font-bold ${compact ? "text-base" : "text-lg"}`}>{challengeSet.name}</h3>
              <p className="text-xs text-base-content/50 font-mono">{challengeSet.id}</p>
            </div>
          </div>
          <StatusBadge status={challengeSet.status} />
        </div>

        {/* Description */}
        <p className={`text-base-content/70 ${compact ? "text-sm" : ""}`}>{challengeSet.description}</p>

        {/* Meta info */}
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-1 text-base-content/60">
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{(challengeSet.requiredConfidence * 100).toFixed(0)}% confidence required</span>
          </div>
          <div className="flex items-center gap-1 text-base-content/60">
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <span>{challengeSet.challenges.length} challenges</span>
          </div>
        </div>

        {/* Challenges list */}
        {showDetails && !compact && (
          <div className="space-y-3 mt-2">
            {/* Mandatory challenges */}
            {mandatoryChallenges.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-success"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Required Challenges ({mandatoryChallenges.length})
                </h4>
                <div className="space-y-2">
                  {mandatoryChallenges.map(challenge => (
                    <ChallengeItem key={challenge.code} challenge={challenge} showDetails={showDetails} />
                  ))}
                </div>
              </div>
            )}

            {/* Optional challenges */}
            {optionalChallenges.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-base-content/50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Optional Challenges ({optionalChallenges.length})
                </h4>
                <div className="space-y-2">
                  {optionalChallenges.map(challenge => (
                    <ChallengeItem key={challenge.code} challenge={challenge} showDetails={showDetails} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Compact challenge count */}
        {compact && (
          <div className="flex gap-2 text-xs">
            <span className="badge badge-sm badge-success badge-outline">{mandatoryChallenges.length} required</span>
            {optionalChallenges.length > 0 && (
              <span className="badge badge-sm badge-ghost">{optionalChallenges.length} optional</span>
            )}
          </div>
        )}

        {/* Applicable roles */}
        {showDetails && !compact && (
          <div className="mt-2">
            <h4 className="text-xs font-semibold text-base-content/60 mb-1">Applicable for:</h4>
            <div className="flex flex-wrap gap-1">
              {challengeSet.applicableRoles.map(role => (
                <span key={role} className="badge badge-xs badge-outline">
                  {role.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
