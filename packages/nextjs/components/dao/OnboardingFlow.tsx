"use client";

import { useEffect } from "react";
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
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-base-content/70">Transaction</span>
                    <span className="font-mono text-xs truncate max-w-[150px]">{txHash}</span>
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
