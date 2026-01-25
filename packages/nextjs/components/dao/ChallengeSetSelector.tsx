"use client";

import { useEffect, useState } from "react";
import { ChallengeSetCard } from "./ChallengeSetCard";
import { ChallengeSetInfo, getActiveChallengeSets, getChallengeSetsForRole } from "~~/types/mfssia";

interface ChallengeSetSelectorProps {
  roleKey?: string;
  selectedChallengeSet: ChallengeSetInfo | null;
  onSelect: (challengeSet: ChallengeSetInfo) => void;
  onConfirm: () => void;
  onCancel?: () => void;
  showAllSets?: boolean;
}

/**
 * ChallengeSetSelector - Allows users to choose a challenge set for verification
 * Displays available challenge sets with their details and requirements
 */
export const ChallengeSetSelector = ({
  roleKey,
  selectedChallengeSet,
  onSelect,
  onConfirm,
  onCancel,
  showAllSets = false,
}: ChallengeSetSelectorProps) => {
  const [challengeSets, setChallengeSets] = useState<ChallengeSetInfo[]>([]);
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    // Get applicable challenge sets based on role
    let sets: ChallengeSetInfo[];
    if (roleKey && !showAllSets) {
      sets = getChallengeSetsForRole(roleKey);
    } else {
      sets = getActiveChallengeSets();
    }

    // If no active sets for this role, show all active sets
    if (sets.length === 0) {
      sets = getActiveChallengeSets();
    }

    setChallengeSets(sets);
    // Don't auto-select - always let user explicitly confirm
  }, [roleKey, showAllSets]);

  const activeSets = challengeSets.filter(s => s.status === "ACTIVE");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7 text-primary"
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
            Select Verification Method
          </h2>
          <p className="text-base-content/70 mt-1">Choose how you want to verify your identity</p>
        </div>
        <button onClick={() => setShowDetails(!showDetails)} className="btn btn-sm btn-ghost gap-1">
          {showDetails ? (
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
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
              Hide Details
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
              Show Details
            </>
          )}
        </button>
      </div>

      {/* Active challenge sets */}
      {activeSets.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Available Options</h3>
          <div className="space-y-4">
            {activeSets.map(challengeSet => (
              <ChallengeSetCard
                key={challengeSet.id}
                challengeSet={challengeSet}
                isSelected={selectedChallengeSet?.id === challengeSet.id}
                onSelect={onSelect}
                showDetails={showDetails}
                compact={!showDetails}
              />
            ))}
          </div>
        </div>
      )}

      {/* No sets available */}
      {activeSets.length === 0 && (
        <div className="alert alert-warning">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>No verification methods are currently available for your role.</span>
        </div>
      )}

      {/* Selected set summary */}
      {selectedChallengeSet && (
        <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-primary"
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
            <span className="font-semibold">Selected: {selectedChallengeSet.name}</span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-base-content/70">
            <span>{selectedChallengeSet.challenges.filter(c => c.mandatory).length} required challenges</span>
            <span>Confidence threshold: {(selectedChallengeSet.requiredConfidence * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <button onClick={onCancel} className="btn btn-ghost flex-1">
            Cancel
          </button>
        )}
        <button onClick={onConfirm} disabled={!selectedChallengeSet} className="btn btn-primary flex-1 gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          Continue with Selected
        </button>
      </div>
    </div>
  );
};
