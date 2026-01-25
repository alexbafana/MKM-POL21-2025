"use client";

import { useState } from "react";
import Link from "next/link";
import { ChallengeEvidenceCard } from "~~/components/dao/ChallengeEvidenceCard";
import { ChallengeProgressTracker } from "~~/components/dao/ChallengeProgressTracker";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  IdentityIcon,
  LockIcon,
  SpinnerIcon,
  UnlockIcon,
} from "~~/components/dao/Icons";
import { RDFArtifactEvidenceModal } from "~~/components/dao/RDFArtifactEvidenceModal";
import { StepIndicator } from "~~/components/dao/StepIndicator";
import { Address, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useArtifactIntegrity } from "~~/hooks/useArtifactIntegrity";

const STEPS = [
  { id: 1, title: "Connect", description: "Wallet" },
  { id: 2, title: "Select", description: "Challenge Set" },
  { id: 3, title: "Instance", description: "Create" },
  { id: 4, title: "Evidence", description: "Collect" },
  { id: 5, title: "Verify", description: "Oracle" },
  { id: 6, title: "Complete", description: "Attestation" },
];

/**
 * Artifact Integrity Verification Page
 * Allows users to submit RDF artifact evidence to MFSSIA for integrity verification
 * Uses Example-A challenge set for baseline RDF artifact integrity
 */
export default function ArtifactIntegrityPage() {
  const integrity = useArtifactIntegrity();
  const {
    currentStep,
    address,
    isVerifying,
    verificationError,
    isAcquiringAttestation,
    attestationError,
    attestationUAL,
    did,
    selectedChallengeSet,
    showRDFArtifactModal,
    challengeEvidence,
    challengeEvidenceStatus,
    collectingChallenge,
    challengeErrors,
    challengeOracleResults,
    isBatchSubmitting,
    batchSubmitError,
    oracleConnectionState,
    oracleVerificationState,
    oracleMessage,
    oracleConfidence,
    apiCallLog,
    oracleEventLog,
    serviceEvents,
    selectChallengeSet,
    createChallengeInstance,
    collectChallengeEvidence,
    handleRDFArtifactSubmit,
    closeRDFArtifactModal,
    submitAllEvidence,
    completeVerification,
    allEvidenceCollected,
    allEvidenceSubmitted,
    reset,
    getStepNumber,
  } = integrity;

  const [showApiLog, setShowApiLog] = useState(true); // Show by default to see events

  return (
    <div className="min-h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="bg-gradient-to-r from-info/10 via-base-200 to-info/5 py-12 border-b border-base-300">
        <div className="max-w-4xl mx-auto px-6">
          <Link href="/" className="btn btn-ghost btn-sm mb-6 gap-2">
            <ArrowRightIcon className="w-4 h-4 rotate-180" />
            Back to Home
          </Link>

          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-info/10 text-info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
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
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">RDF Artifact Integrity Verification</h1>
              <p className="text-base-content/70">
                Verify the integrity of RDF artifacts using MFSSIA Example-A challenge set
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-base-100 border-b border-base-300 py-8">
        <div className="max-w-4xl mx-auto px-6">
          <StepIndicator steps={STEPS} currentStep={getStepNumber()} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Step 1: Connect Wallet */}
        {currentStep === "connect" && (
          <div className="card bg-base-100 shadow-xl border border-base-300 animate-fade-in">
            <div className="card-body items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <LockIcon className="w-8 h-8 text-primary" />
              </div>
              <h2 className="card-title text-2xl mb-2">Connect Your Wallet</h2>
              <p className="text-base-content/70 mb-6">Connect your Ethereum wallet to begin artifact verification</p>
              <RainbowKitCustomConnectButton />
            </div>
          </div>
        )}

        {/* Step 2: Select Challenge Set */}
        {currentStep === "select" && (
          <div className="card bg-base-100 shadow-xl border border-base-300 animate-fade-in">
            <div className="card-body">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-info/10 flex items-center justify-center">
                  <IdentityIcon className="w-8 h-8 text-info" />
                </div>
                <div>
                  <h2 className="card-title text-2xl mb-1">Select Verification Method</h2>
                  <p className="text-base-content/70">Choose the MFSSIA challenge set for verification</p>
                </div>
              </div>

              <div className="bg-base-200 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-base-content/70">Connected Address</span>
                  <Address address={address!} />
                </div>
              </div>

              {selectedChallengeSet && (
                <div className="bg-info/5 rounded-xl p-4 mb-6 border border-info/20">
                  <h3 className="font-semibold text-lg mb-2">{selectedChallengeSet.name}</h3>
                  <p className="text-sm text-base-content/70 mb-4">{selectedChallengeSet.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedChallengeSet.challenges.map(challenge => (
                      <span
                        key={challenge.code}
                        className={`badge badge-sm ${challenge.mandatory ? "badge-primary" : "badge-ghost"}`}
                        title={challenge.description}
                      >
                        {challenge.name}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 text-sm text-base-content/60">
                    <span className="font-medium">{selectedChallengeSet.mandatoryChallenges}</span> required challenges,{" "}
                    <span className="font-medium">{selectedChallengeSet.optionalChallenges}</span> optional
                  </div>
                </div>
              )}

              <button onClick={selectChallengeSet} className="btn btn-info btn-lg w-full gap-2">
                <UnlockIcon className="w-5 h-5" />
                Continue with Example-A
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Create Challenge Instance */}
        {currentStep === "instance" && (
          <div className="card bg-base-100 shadow-xl border border-base-300 animate-fade-in">
            <div className="card-body">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <IdentityIcon className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <h2 className="card-title text-2xl mb-1">Create Challenge Instance</h2>
                  <p className="text-base-content/70">Register DID and create verification instance</p>
                </div>
              </div>

              <div className="bg-base-200 rounded-xl p-4 mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-base-content/70">Connected Address</span>
                  <Address address={address!} />
                </div>
                {selectedChallengeSet && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-base-content/70">Challenge Set</span>
                    <span className="font-medium text-sm">{selectedChallengeSet.name}</span>
                  </div>
                )}
              </div>

              {verificationError && (
                <div className="alert alert-error mb-4">
                  <span>{verificationError}</span>
                </div>
              )}

              <div className="alert bg-info/10 border border-info/20 mb-6">
                <IdentityIcon className="w-6 h-6 text-info shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold">MFSSIA Challenge Instance</p>
                  <p className="text-base-content/70">
                    This creates a challenge instance with the MFSSIA Oracle Gateway for verifying RDF artifact
                    integrity.
                  </p>
                </div>
              </div>

              <button
                onClick={createChallengeInstance}
                disabled={isVerifying}
                className="btn btn-accent btn-lg w-full gap-2"
              >
                {isVerifying ? (
                  <>
                    <SpinnerIcon className="w-5 h-5" />
                    Creating Instance...
                  </>
                ) : (
                  <>
                    <IdentityIcon className="w-5 h-5" />
                    Create Challenge Instance
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Evidence Collection */}
        {currentStep === "evidence" && (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="card bg-base-100 shadow-xl border border-base-300">
              <div className="card-body">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-info/10 flex items-center justify-center">
                    <UnlockIcon className="w-8 h-8 text-info" />
                  </div>
                  <div>
                    <h2 className="card-title text-2xl mb-1">Collect Challenge Evidence</h2>
                    <p className="text-base-content/70">Provide RDF artifact data for integrity verification</p>
                  </div>
                </div>

                <div className="bg-info/5 rounded-xl p-4 border border-info/20">
                  <div className="flex items-center gap-2 text-info mb-2">
                    <CheckCircleIcon className="w-5 h-5" />
                    <span className="font-semibold">Challenge Instance Created</span>
                  </div>
                  <p className="text-sm text-base-content/70">
                    Click <strong>Collect Evidence</strong> on any challenge to open the RDF Artifact form. All
                    challenges will be populated from the same artifact data.
                  </p>
                </div>

                {/* Progress Summary */}
                {selectedChallengeSet && (
                  <div className="mt-4 flex items-center gap-4 text-sm">
                    <span className="text-base-content/60">Progress:</span>
                    <span className={`font-semibold ${allEvidenceCollected() ? "text-success" : "text-warning"}`}>
                      {Object.values(challengeEvidence).length} /{" "}
                      {selectedChallengeSet.challenges.filter(c => c.mandatory).length} collected
                    </span>
                    <span className="text-base-content/40">|</span>
                    <span className={`font-semibold ${allEvidenceSubmitted() ? "text-success" : "text-info"}`}>
                      {Object.values(challengeEvidenceStatus).filter(s => ["submitted", "verified"].includes(s)).length}{" "}
                      / {selectedChallengeSet.challenges.filter(c => c.mandatory).length} submitted
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Challenge Evidence Cards */}
            {selectedChallengeSet && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
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
                  Required Challenges ({selectedChallengeSet.mandatoryChallenges})
                </h3>

                {selectedChallengeSet.challenges
                  .filter(c => c.mandatory)
                  .map(challenge => (
                    <ChallengeEvidenceCard
                      key={challenge.code}
                      challenge={challenge}
                      evidenceStatus={challengeEvidenceStatus[challenge.code] || "pending"}
                      collectedEvidence={challengeEvidence[challenge.code] || null}
                      onCollectEvidence={collectChallengeEvidence}
                      isCollecting={collectingChallenge === challenge.code}
                      error={challengeErrors[challenge.code] || null}
                      oracleResult={challengeOracleResults[challenge.code] || null}
                      isBatchSubmitting={isBatchSubmitting}
                    />
                  ))}

                {/* Optional Challenges */}
                {selectedChallengeSet.challenges.filter(c => !c.mandatory).length > 0 && (
                  <>
                    <h3 className="text-lg font-semibold flex items-center gap-2 mt-6">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-base-content/50"
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
                      Optional Challenges ({selectedChallengeSet.optionalChallenges})
                    </h3>
                    <p className="text-sm text-base-content/60 mb-2">
                      These challenges are not required for verification but can provide additional assurance.
                    </p>
                    {selectedChallengeSet.challenges
                      .filter(c => !c.mandatory)
                      .map(challenge => (
                        <ChallengeEvidenceCard
                          key={challenge.code}
                          challenge={challenge}
                          evidenceStatus={challengeEvidenceStatus[challenge.code] || "pending"}
                          collectedEvidence={challengeEvidence[challenge.code] || null}
                          onCollectEvidence={collectChallengeEvidence}
                          isCollecting={collectingChallenge === challenge.code}
                          error={challengeErrors[challenge.code] || null}
                          oracleResult={challengeOracleResults[challenge.code] || null}
                          isBatchSubmitting={isBatchSubmitting}
                        />
                      ))}
                  </>
                )}

                {/* Submit All Evidence Button */}
                {allEvidenceCollected() && !allEvidenceSubmitted() && (
                  <div className="card bg-primary/5 border-2 border-primary/30 mt-4">
                    <div className="card-body">
                      <div className="flex items-center gap-2 text-primary mb-3">
                        <CheckCircleIcon className="w-6 h-6" />
                        <span className="font-bold text-lg">All Evidence Collected</span>
                      </div>
                      <p className="text-sm text-base-content/70 mb-4">
                        Submit all evidence to the Oracle in a single batch.
                      </p>

                      {batchSubmitError && (
                        <div className="alert alert-error mb-4">
                          <span className="text-sm">{batchSubmitError}</span>
                        </div>
                      )}

                      <button
                        onClick={submitAllEvidence}
                        disabled={isBatchSubmitting}
                        className="btn btn-primary btn-lg w-full gap-2"
                      >
                        {isBatchSubmitting ? (
                          <>
                            <SpinnerIcon className="w-5 h-5" />
                            Submitting Evidence...
                          </>
                        ) : (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
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
                            Submit All Evidence to Oracle
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Complete Verification Button */}
            {allEvidenceSubmitted() && (
              <div className="card bg-success/5 border-2 border-success/30">
                <div className="card-body">
                  <div className="flex items-center gap-2 text-success mb-3">
                    <CheckCircleIcon className="w-6 h-6" />
                    <span className="font-bold text-lg">All Evidence Submitted!</span>
                  </div>
                  <p className="text-sm text-base-content/70 mb-4">
                    Complete oracle verification and receive your attestation.
                  </p>

                  {attestationError && (
                    <div className="alert alert-error mb-4">
                      <span className="break-words whitespace-pre-wrap">{attestationError}</span>
                    </div>
                  )}

                  <button
                    onClick={completeVerification}
                    disabled={isAcquiringAttestation}
                    className="btn btn-success btn-lg w-full gap-2"
                  >
                    {isAcquiringAttestation ? (
                      <>
                        <SpinnerIcon className="w-5 h-5" />
                        Verifying with Oracle...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="w-5 h-5" />
                        Complete Verification & Get Attestation
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Verification in Progress */}
        {currentStep === "verification" && (
          <div className="card bg-base-100 shadow-xl border border-base-300 animate-fade-in">
            <div className="card-body">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-info/10 flex items-center justify-center">
                  <SpinnerIcon className="w-8 h-8 text-info animate-spin" />
                </div>
                <div>
                  <h2 className="card-title text-2xl mb-1">Oracle Verification</h2>
                  <p className="text-base-content/70">Waiting for oracle to verify evidence</p>
                </div>
              </div>

              {selectedChallengeSet && (
                <div className="mb-6">
                  <ChallengeProgressTracker
                    challengeSet={selectedChallengeSet}
                    currentChallenge={null}
                    overallConfidence={oracleConfidence}
                    oracleConnectionState={oracleConnectionState}
                    oracleVerificationState={oracleVerificationState}
                    oracleMessage={oracleMessage}
                    did={did}
                  />
                </div>
              )}

              {attestationError && (
                <div className="alert alert-error mb-4">
                  <span className="break-words whitespace-pre-wrap">{attestationError}</span>
                </div>
              )}

              <div className="alert bg-info/10 border border-info/20">
                <SpinnerIcon className="w-6 h-6 text-info shrink-0 animate-spin" />
                <div className="text-sm">
                  <p className="font-semibold">Processing Verification</p>
                  <p className="text-base-content/70">
                    The MFSSIA Oracle is verifying your artifact integrity evidence.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Complete */}
        {currentStep === "complete" && (
          <div className="card bg-base-100 shadow-xl border border-success/30 animate-fade-in">
            <div className="card-body items-center text-center">
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-4 animate-pulse-glow">
                <CheckCircleIcon className="w-10 h-10 text-success" />
              </div>
              <h2 className="card-title text-2xl mb-2">Verification Complete!</h2>
              <p className="text-base-content/70 mb-6">
                Your RDF artifact has been successfully verified by the MFSSIA Oracle.
              </p>

              <div className="bg-base-200 rounded-xl p-4 mb-6 w-full">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-base-content/70">Your Address</span>
                  <Address address={address!} />
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-base-content/70">Challenge Set</span>
                  <span className="badge badge-info">{selectedChallengeSet?.name}</span>
                </div>
                {attestationUAL && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-base-content/70">Attestation UAL</span>
                    <span className="font-mono text-xs truncate max-w-[200px]">{attestationUAL}</span>
                  </div>
                )}
                {oracleConfidence !== null && (
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm text-base-content/70">Confidence Score</span>
                    <span className="font-semibold text-success">{(oracleConfidence * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Link href="/dashboard" className="btn btn-primary flex-1 gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                  Go to Dashboard
                </Link>
                <button onClick={reset} className="btn btn-outline flex-1">
                  Verify Another Artifact
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Combined Event Log */}
        {(apiCallLog.length > 0 || oracleEventLog.length > 0 || serviceEvents.length > 0) && (
          <div className="card bg-base-100 shadow-xl border border-base-300 mt-8">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h3 className="card-title text-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Event Log ({apiCallLog.length + oracleEventLog.length + serviceEvents.length})
                </h3>
                <div className="flex gap-2">
                  <span
                    className={`badge badge-sm ${oracleConnectionState === "connected" ? "badge-success" : oracleConnectionState === "connecting" ? "badge-warning" : "badge-ghost"}`}
                  >
                    WS: {oracleConnectionState}
                  </span>
                  <span
                    className={`badge badge-sm ${oracleVerificationState === "success" ? "badge-success" : oracleVerificationState === "processing" ? "badge-warning" : oracleVerificationState === "failed" ? "badge-error" : "badge-ghost"}`}
                  >
                    Oracle: {oracleVerificationState}
                  </span>
                  <button onClick={() => setShowApiLog(!showApiLog)} className="btn btn-sm btn-ghost">
                    {showApiLog ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Oracle Status Message */}
              {oracleMessage && (
                <div className="mb-4 p-3 rounded-lg bg-info/10 border border-info/20">
                  <div className="flex items-center gap-2">
                    <span className="loading loading-spinner loading-sm text-info"></span>
                    <span className="text-sm text-info font-medium">{oracleMessage}</span>
                  </div>
                </div>
              )}

              {/* Oracle Confidence Display */}
              {oracleConfidence !== null && (
                <div className="mb-4 p-3 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-success font-medium">Oracle Verification Confidence</span>
                    <span className="text-lg font-bold text-success">{(oracleConfidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
              )}

              {showApiLog && (
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    {/* Combine and sort all logs by timestamp */}
                    {[
                      ...apiCallLog.map(log => ({ ...log, source: "api" as const })),
                      ...oracleEventLog.map(log => ({
                        ...log,
                        type: "event" as const,
                        source: "oracle" as const,
                        endpoint: log.event,
                        message: JSON.stringify(log.data),
                      })),
                      ...serviceEvents.map(log => ({
                        timestamp: log.timestamp,
                        type:
                          log.status === "error" || log.status === "failed"
                            ? ("error" as const)
                            : log.status === "success"
                              ? ("success" as const)
                              : ("event" as const),
                        source: "service" as const,
                        endpoint: log.type,
                        message: log.error || log.data?.message || log.type,
                        details: log.data,
                      })),
                    ]
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((log, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${
                            log.type === "error"
                              ? "bg-error/10 border-error/20"
                              : log.type === "success"
                                ? "bg-success/10 border-success/20"
                                : log.type === "warning"
                                  ? "bg-warning/10 border-warning/20"
                                  : log.type === "event"
                                    ? "bg-accent/10 border-accent/20"
                                    : "bg-info/10 border-info/20"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span
                                  className={`badge badge-sm ${
                                    log.type === "error"
                                      ? "badge-error"
                                      : log.type === "success"
                                        ? "badge-success"
                                        : log.type === "warning"
                                          ? "badge-warning"
                                          : log.type === "event"
                                            ? "badge-accent"
                                            : "badge-info"
                                  }`}
                                >
                                  {log.type.toUpperCase()}
                                </span>
                                {"source" in log && (
                                  <span className="badge badge-sm badge-outline">
                                    {log.source === "oracle" ? "ORACLE" : log.source === "service" ? "SERVICE" : "API"}
                                  </span>
                                )}
                                <span className="text-xs font-mono text-base-content/70">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="font-semibold text-sm mb-1">{log.endpoint}</p>
                              <p className="text-sm text-base-content/70 break-words">{log.message}</p>
                              {"details" in log && log.details && (
                                <details className="mt-2">
                                  <summary className="cursor-pointer text-xs text-base-content/50 hover:text-base-content">
                                    View details
                                  </summary>
                                  <pre className="text-xs mt-2 p-2 bg-base-200 rounded overflow-x-auto whitespace-pre-wrap">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </details>
                              )}
                              {"data" in log && log.data && (
                                <details className="mt-2">
                                  <summary className="cursor-pointer text-xs text-base-content/50 hover:text-base-content">
                                    View event data
                                  </summary>
                                  <pre className="text-xs mt-2 p-2 bg-base-200 rounded overflow-x-auto whitespace-pre-wrap">
                                    {JSON.stringify(log.data, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* RDF Artifact Evidence Modal */}
      <RDFArtifactEvidenceModal
        isOpen={showRDFArtifactModal}
        onSubmit={handleRDFArtifactSubmit}
        onClose={closeRDFArtifactModal}
        challengeSet={selectedChallengeSet}
      />
    </div>
  );
}
