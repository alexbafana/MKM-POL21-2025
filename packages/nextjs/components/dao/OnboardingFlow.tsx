"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  GovernanceIcon,
  IdentityIcon,
  LockIcon,
  SpinnerIcon,
  UnlockIcon,
} from "./Icons";
import { StepIndicator } from "./StepIndicator";
import { Address, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { RoleKey, useOnboarding } from "~~/hooks/useOnboarding";

interface OnboardingFlowProps {
  roleKey: RoleKey;
  title: string;
  description: string;
  icon: React.ReactNode;
  accentColor: "primary" | "warning" | "accent" | "success";
}

const STEPS = [
  { id: 1, title: "Connect", description: "Wallet" },
  { id: 2, title: "Verify", description: "Identity" },
  { id: 3, title: "Token", description: "Access" },
  { id: 4, title: "Assign", description: "Role" },
  { id: 5, title: "Complete", description: "Done" },
];

/**
 * OnboardingFlow - Reusable onboarding component for different role types
 * Handles the multi-step onboarding process including identity verification and role assignment
 */
/**
 * Event Log Panel Component
 * Displays API calls and oracle events in a collapsible panel
 */
const EventLogPanel = ({
  apiCallLog,
  oracleEventLog,
  oracleMessage,
  oracleConnectionState,
  oracleVerificationState,
}: {
  apiCallLog: any[];
  oracleEventLog: any[];
  oracleMessage: string | null;
  oracleConnectionState: string;
  oracleVerificationState: string;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-success";
      case "error":
        return "text-error";
      case "warning":
        return "text-warning";
      case "event":
        return "text-info";
      default:
        return "text-base-content/70";
    }
  };

  const getConnectionStatusColor = () => {
    switch (oracleConnectionState) {
      case "connected":
        return "badge-success";
      case "connecting":
      case "reconnecting":
        return "badge-warning";
      case "error":
        return "badge-error";
      default:
        return "badge-ghost";
    }
  };

  const getVerificationStatusColor = () => {
    switch (oracleVerificationState) {
      case "success":
        return "badge-success";
      case "processing":
      case "requested":
        return "badge-warning";
      case "failed":
      case "error":
        return "badge-error";
      default:
        return "badge-ghost";
    }
  };

  return (
    <div className="mt-4 border border-base-300 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-base-200 flex items-center justify-between hover:bg-base-300 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Event Log</span>
          <span className={`badge badge-sm ${getConnectionStatusColor()}`}>{oracleConnectionState}</span>
          <span className={`badge badge-sm ${getVerificationStatusColor()}`}>{oracleVerificationState}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-base-content/50">{apiCallLog.length + oracleEventLog.length} events</span>
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 bg-base-100 max-h-64 overflow-y-auto">
          {/* Oracle Status */}
          {oracleMessage && (
            <div
              className={`mb-3 p-2 rounded-lg border ${
                oracleVerificationState === "success"
                  ? "bg-success/10 border-success/20"
                  : oracleVerificationState === "failed"
                    ? "bg-error/10 border-error/20"
                    : "bg-info/10 border-info/20"
              }`}
            >
              <div className="flex items-start gap-2">
                {oracleVerificationState !== "failed" && oracleVerificationState !== "success" && (
                  <SpinnerIcon className="w-4 h-4 text-info animate-spin mt-0.5" />
                )}
                <span
                  className={`text-sm whitespace-pre-wrap break-words ${
                    oracleVerificationState === "success"
                      ? "text-success"
                      : oracleVerificationState === "failed"
                        ? "text-error"
                        : "text-info"
                  }`}
                >
                  {oracleMessage}
                </span>
              </div>
            </div>
          )}

          {/* Combined Event Log */}
          <div className="space-y-1">
            {[...apiCallLog, ...oracleEventLog]
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 20)
              .map((log, index) => (
                <div key={index} className="text-xs font-mono p-2 rounded bg-base-200">
                  <div className="flex items-start gap-2">
                    <span className="text-base-content/40 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    {"type" in log ? (
                      <>
                        <span className={`font-semibold ${getStatusColor(log.type)}`}>[{log.type.toUpperCase()}]</span>
                        <span className="text-base-content/70">{log.endpoint}:</span>
                        <span className="text-base-content">{log.message}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-accent">[ORACLE]</span>
                        <span className="text-base-content">{log.event}</span>
                      </>
                    )}
                  </div>
                  {log.details && (
                    <pre className="mt-1 text-[10px] text-base-content/50 overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
          </div>

          {apiCallLog.length === 0 && oracleEventLog.length === 0 && (
            <div className="text-center text-base-content/50 text-sm py-4">No events yet</div>
          )}
        </div>
      )}
    </div>
  );
};

export const OnboardingFlow = ({ roleKey, title, description, icon, accentColor }: OnboardingFlowProps) => {
  const onboarding = useOnboarding(roleKey);
  const {
    currentStep,
    isConnected,
    address,
    isVerifying,
    isVerified,
    verificationError,
    accessToken,
    isAcquiringToken,
    tokenError,
    isAssigning,
    isMining,
    assignmentError,
    isComplete,
    txHash,
    targetRole,
    verifyIdentity,
    acquireAccessToken,
    assignRole,
    reset,
    updateStep,
    getStepNumber,
    // New MFSSIA fields
    oracleConnectionState,
    oracleVerificationState,
    oracleMessage,
    oracleConfidence,
    apiCallLog,
    oracleEventLog,
    attestationUAL,
  } = onboarding;

  // Update step when connection status changes
  useEffect(() => {
    updateStep();
  }, [isConnected, isVerified, accessToken, isComplete, updateStep]);

  const colorClasses = {
    primary: {
      bg: "bg-primary/10",
      text: "text-primary",
      border: "border-primary/20",
      badge: "badge-primary",
      btn: "btn-primary",
    },
    warning: {
      bg: "bg-warning/10",
      text: "text-warning",
      border: "border-warning/20",
      badge: "badge-warning",
      btn: "btn-warning",
    },
    accent: {
      bg: "bg-accent/10",
      text: "text-accent",
      border: "border-accent/20",
      badge: "badge-accent",
      btn: "btn-accent",
    },
    success: {
      bg: "bg-success/10",
      text: "text-success",
      border: "border-success/20",
      badge: "badge-success",
      btn: "btn-success",
    },
  };

  const colors = colorClasses[accentColor];

  return (
    <div className="min-h-[calc(100vh-5rem)]">
      {/* Header */}
      <div
        className={`bg-gradient-to-r from-${accentColor}/10 via-base-200 to-${accentColor}/5 py-12 border-b border-base-300`}
      >
        <div className="max-w-4xl mx-auto px-6">
          <Link href="/" className="btn btn-ghost btn-sm mb-6 gap-2">
            <ArrowRightIcon className="w-4 h-4 rotate-180" />
            Back to Home
          </Link>

          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${colors.bg} ${colors.text}`}>{icon}</div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{title}</h1>
              <p className="text-base-content/70">{description}</p>
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
              <p className="text-base-content/70 mb-6">Connect your Ethereum wallet to begin the onboarding process</p>
              <RainbowKitCustomConnectButton />
            </div>
          </div>
        )}

        {/* Step 2: Identity Verification */}
        {currentStep === "verify" && (
          <div className="card bg-base-100 shadow-xl border border-base-300 animate-fade-in">
            <div className="card-body">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <IdentityIcon className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <h2 className="card-title text-2xl mb-1">Identity Verification</h2>
                  <p className="text-base-content/70">Verify your identity through MFSSIA</p>
                </div>
              </div>

              <div className="bg-base-200 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-base-content/70">Connected Address</span>
                  <Address address={address!} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-base-content/70">Target Role</span>
                  <span className={`badge ${colors.badge} badge-outline`}>{targetRole.name}</span>
                </div>
              </div>

              {verificationError && (
                <div className="alert alert-error mb-4">
                  <span>{verificationError}</span>
                </div>
              )}

              <div className="alert bg-info/10 border border-info/20 mb-6">
                <IdentityIcon className="w-6 h-6 text-info shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold">MFSSIA Verification</p>
                  <p className="text-base-content/70">
                    This step verifies your identity using the Multi-Factor Self-Sovereign Identity Architecture. Your
                    privacy is preserved through zero-knowledge proofs.
                  </p>
                </div>
              </div>

              <button
                onClick={verifyIdentity}
                disabled={isVerifying}
                className={`btn ${colors.btn} btn-lg w-full gap-2`}
              >
                {isVerifying ? (
                  <>
                    <SpinnerIcon className="w-5 h-5" />
                    Verifying Identity...
                  </>
                ) : (
                  <>
                    <IdentityIcon className="w-5 h-5" />
                    Verify Identity
                  </>
                )}
              </button>

              {/* Event Log Panel - shows during verification */}
              {(isVerifying || apiCallLog.length > 0 || oracleEventLog.length > 0) && (
                <EventLogPanel
                  apiCallLog={apiCallLog}
                  oracleEventLog={oracleEventLog}
                  oracleMessage={oracleMessage}
                  oracleConnectionState={oracleConnectionState}
                  oracleVerificationState={oracleVerificationState}
                />
              )}

              {/* Oracle confidence display */}
              {oracleConfidence !== null && (
                <div className="mt-4 p-3 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-base-content/70">Oracle Confidence</span>
                    <span className="font-semibold text-success">{(oracleConfidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Access Token */}
        {currentStep === "token" && (
          <div className="card bg-base-100 shadow-xl border border-base-300 animate-fade-in">
            <div className="card-body">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center">
                  <UnlockIcon className="w-8 h-8 text-success" />
                </div>
                <div>
                  <h2 className="card-title text-2xl mb-1">Acquire Access Token</h2>
                  <p className="text-base-content/70">Get your MFSSIA access token for role assignment</p>
                </div>
              </div>

              <div className="bg-success/5 rounded-xl p-4 mb-6 border border-success/20">
                <div className="flex items-center gap-2 text-success mb-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  <span className="font-semibold">Identity Verified</span>
                </div>
                <p className="text-sm text-base-content/70">
                  Your identity has been successfully verified through MFSSIA.
                </p>
              </div>

              {tokenError && (
                <div className="alert alert-error mb-4">
                  <span>{tokenError}</span>
                </div>
              )}

              <button
                onClick={acquireAccessToken}
                disabled={isAcquiringToken}
                className={`btn ${colors.btn} btn-lg w-full gap-2`}
              >
                {isAcquiringToken ? (
                  <>
                    <SpinnerIcon className="w-5 h-5" />
                    Acquiring Token...
                  </>
                ) : (
                  <>
                    <UnlockIcon className="w-5 h-5" />
                    Acquire Access Token
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Role Assignment */}
        {currentStep === "assign" && (
          <div className="card bg-base-100 shadow-xl border border-base-300 animate-fade-in">
            <div className="card-body">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-16 h-16 rounded-2xl ${colors.bg} flex items-center justify-center`}>
                  <GovernanceIcon className={`w-8 h-8 ${colors.text}`} />
                </div>
                <div>
                  <h2 className="card-title text-2xl mb-1">Assign Role</h2>
                  <p className="text-base-content/70">Complete your onboarding by receiving your role</p>
                </div>
              </div>

              <div className="bg-base-200 rounded-xl p-4 mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-base-content/70">Address</span>
                  <Address address={address!} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-base-content/70">Role</span>
                  <span className={`badge ${colors.badge}`}>{targetRole.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-base-content/70">Role Value</span>
                  <span className="font-mono text-sm">{targetRole.value}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-base-content/70">Access Token</span>
                  <span className="font-mono text-xs truncate max-w-[150px]">{accessToken}</span>
                </div>
              </div>

              {assignmentError && (
                <div className="alert alert-error mb-4">
                  <span>{assignmentError}</span>
                </div>
              )}

              <div className="alert bg-warning/10 border border-warning/20 mb-6">
                <GovernanceIcon className="w-6 h-6 text-warning shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold">Transaction Required</p>
                  <p className="text-base-content/70">
                    This action will submit a transaction to the blockchain to assign your role. Please confirm the
                    transaction in your wallet.
                  </p>
                </div>
              </div>

              <button
                onClick={assignRole}
                disabled={isAssigning || isMining}
                className={`btn ${colors.btn} btn-lg w-full gap-2`}
              >
                {isAssigning || isMining ? (
                  <>
                    <SpinnerIcon className="w-5 h-5" />
                    {isMining ? "Confirming Transaction..." : "Assigning Role..."}
                  </>
                ) : (
                  <>
                    <GovernanceIcon className="w-5 h-5" />
                    Assign Role
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Complete */}
        {currentStep === "complete" && (
          <div className="card bg-base-100 shadow-xl border border-success/30 animate-fade-in">
            <div className="card-body items-center text-center">
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-4 animate-pulse-glow">
                <CheckCircleIcon className="w-10 h-10 text-success" />
              </div>
              <h2 className="card-title text-2xl mb-2">Onboarding Complete!</h2>
              <p className="text-base-content/70 mb-6">
                You have been successfully assigned the <strong>{targetRole.name}</strong> role.
              </p>

              <div className="bg-base-200 rounded-xl p-4 mb-6 w-full">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-base-content/70">Your Address</span>
                  <Address address={address!} />
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-base-content/70">Role</span>
                  <span className={`badge ${colors.badge}`}>{targetRole.name}</span>
                </div>
                {txHash && (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-base-content/70">Transaction</span>
                    <span className="font-mono text-xs truncate max-w-[150px]">{txHash}</span>
                  </div>
                )}
                {attestationUAL && (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-base-content/70">Attestation UAL</span>
                    <span className="font-mono text-xs truncate max-w-[200px]">{attestationUAL}</span>
                  </div>
                )}
                {oracleConfidence !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-base-content/70">Oracle Confidence</span>
                    <span className="font-semibold text-success">{(oracleConfidence * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Link href="/dashboard" className="btn btn-primary flex-1 gap-2">
                  <GovernanceIcon className="w-5 h-5" />
                  Go to Dashboard
                </Link>
                <button onClick={reset} className="btn btn-outline flex-1">
                  Start Over
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
