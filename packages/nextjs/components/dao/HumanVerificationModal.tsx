"use client";

import { useEffect, useState } from "react";
import { ChallengeDefinition, ChallengeSetInfo } from "~~/types/mfssia";

interface HumanVerificationModalProps {
  isOpen: boolean;
  onVerify: (evidence: { interactionTimestamp: string; timeToInteract: number; userAgent: string }) => void;
  onClose: () => void;
  /** Currently selected challenge set (for display purposes) */
  challengeSet?: ChallengeSetInfo | null;
  /** The specific challenge being verified */
  currentChallenge?: ChallengeDefinition | null;
}

/**
 * HumanVerificationModal - Modal for verifying human interaction
 * Collects timing evidence to prevent bot registration
 * Evidence is submitted to MFSSIA Challenge C-A-2 (Liveness Check)
 */
export const HumanVerificationModal = ({
  isOpen,
  onVerify,
  onClose,
  challengeSet,
  currentChallenge,
}: HumanVerificationModalProps) => {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (isOpen && !startTime) {
      // Record when the modal opens (start time for interaction measurement)
      const start = Date.now();
      setStartTime(start);
      console.log("[Human Verification] Modal opened at:", new Date(start).toISOString());
    }

    if (!isOpen) {
      // Reset when modal closes
      setStartTime(null);
      setIsVerified(false);
      setTimeElapsed(0);
    }
  }, [isOpen, startTime]);

  // Update timer display
  useEffect(() => {
    if (!startTime || isVerified) return;

    const interval = setInterval(() => {
      setTimeElapsed(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, isVerified]);

  const handleVerifyClick = () => {
    if (!startTime) return;

    const endTime = Date.now();
    const timeToInteract = endTime - startTime;

    console.log("[Human Verification] Interaction completed:");
    console.log("  - Start time:", new Date(startTime).toISOString());
    console.log("  - End time:", new Date(endTime).toISOString());
    console.log("  - Time to interact:", timeToInteract, "ms");
    console.log("  - Valid range: 500ms - 30000ms");
    console.log("  - Status:", timeToInteract >= 500 && timeToInteract <= 30000 ? "VALID" : "WARNING");

    // Generate evidence
    const evidence = {
      interactionTimestamp: new Date(endTime).toISOString(),
      timeToInteract, // milliseconds from modal open to click
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "unknown",
    };

    console.log("[Human Verification] Evidence generated:", JSON.stringify(evidence, null, 2));

    setIsVerified(true);

    // Small delay for UX feedback
    setTimeout(() => {
      onVerify(evidence);
    }, 500);
  };

  if (!isOpen) return null;

  // Get the liveness challenge if available
  const livenessChallenge = challengeSet?.challenges.find(
    c => c.code === "mfssia:C-A-2" || c.name.toLowerCase().includes("liveness"),
  );

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-2xl mb-4">Human Verification</h3>

        {!isVerified ? (
          <>
            {/* Challenge Set Info */}
            {challengeSet && (
              <div className="bg-primary/5 rounded-xl p-4 mb-4 border border-primary/20">
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
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <span className="font-semibold text-sm">{challengeSet.name}</span>
                </div>
                <p className="text-xs text-base-content/60 font-mono">{challengeSet.id}</p>
              </div>
            )}

            {/* Current Challenge Info */}
            {(currentChallenge || livenessChallenge) && (
              <div className="bg-accent/5 rounded-xl p-4 mb-4 border border-accent/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-accent"
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
                  </div>
                  <div>
                    <span className="font-medium text-sm">
                      {currentChallenge?.name || livenessChallenge?.name || "Liveness Check"}
                    </span>
                    <span className="badge badge-xs badge-accent ml-2">In Progress</span>
                  </div>
                </div>
                <p className="text-xs text-base-content/70">
                  {currentChallenge?.description ||
                    livenessChallenge?.description ||
                    "Behavioral analysis to verify human interaction patterns"}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="badge badge-xs badge-outline">
                    {currentChallenge?.factorClass || livenessChallenge?.factorClass || "ProcessIntegrity"}
                  </span>
                  <span className="text-xs text-base-content/50 font-mono">
                    {currentChallenge?.code || livenessChallenge?.code || "mfssia:C-A-2"}
                  </span>
                </div>
              </div>
            )}

            <p className="py-2 text-base-content/80">
              To ensure the integrity of our DAO, we need to verify that you are a human user and not an automated bot.
            </p>

            <div className="bg-base-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-base-content/70 mb-2">
                <strong>How it works:</strong>
              </p>
              <ul className="list-disc list-inside text-sm text-base-content/70 space-y-1">
                <li>We measure the time it takes you to read and click</li>
                <li>We verify your browser information</li>
                <li>No personal data is collected or stored</li>
                <li>Valid interaction time: 0.5 - 30 seconds</li>
              </ul>
            </div>

            {/* Timer and Debug Info */}
            {startTime && (
              <div className="bg-info/10 rounded-lg p-3 mb-4 border border-info/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-info">Interaction Timer</span>
                  <span className="text-lg font-mono font-bold text-info">{(timeElapsed / 1000).toFixed(1)}s</span>
                </div>
                <progress
                  className="progress progress-info w-full h-2"
                  value={Math.min(timeElapsed / 300, 100)}
                  max="100"
                ></progress>
                <p className="text-xs text-info/70 mt-2">
                  User Agent: {typeof window !== "undefined" ? window.navigator.userAgent.slice(0, 40) : "unknown"}...
                </p>
              </div>
            )}

            <div className="alert alert-info mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <span className="text-sm">Click the button below when you&apos;re ready to continue</span>
            </div>

            <div className="modal-action flex gap-2">
              <button className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn-primary flex-1" onClick={handleVerifyClick}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                I am human
              </button>
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-success">Verification successful!</p>
            <p className="text-sm text-base-content/70 mt-2">Proceeding to submit evidence...</p>
          </div>
        )}
      </div>
    </div>
  );
};
