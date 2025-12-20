"use client";

import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

/**
 * Onboarding step types
 */
export type OnboardingStep = "connect" | "verify" | "token" | "assign" | "complete";

/**
 * Role definitions for the MKMPOL21 DAO
 */
export const ROLES = {
  MEMBER_INSTITUTION: { name: "Member_Institution", value: 1152, index: 0 },
  ORDINARY_USER: { name: "Ordinary_User", value: 1153, index: 1 },
  MFSSIA_GUARDIAN: { name: "MFSSIA_Guardian_Agent", value: 3074, index: 2 },
  ELIZA_EXTRACTOR: { name: "Eliza_Data_Extractor_Agent", value: 3075, index: 3 },
  DATA_VALIDATOR: { name: "Data_Validator", value: 1156, index: 4 },
  MKMPOL21_OWNER: { name: "MKMPOL21Owner", value: 1029, index: 5 },
  CONSORTIUM: { name: "Consortium", value: 1030, index: 6 },
  VALIDATION_COMMITTEE: { name: "Validation_Committee", value: 1031, index: 7 },
  DISPUTE_RESOLUTION: { name: "Dispute_Resolution_Board", value: 1032, index: 8 },
} as const;

export type RoleKey = keyof typeof ROLES;

interface OnboardingState {
  currentStep: OnboardingStep;
  isVerifying: boolean;
  isVerified: boolean;
  verificationError: string | null;
  accessToken: string | null;
  isAcquiringToken: boolean;
  tokenError: string | null;
  isAssigning: boolean;
  assignmentError: string | null;
  isComplete: boolean;
  txHash: string | null;
}

/**
 * Hook for managing the onboarding flow
 * Handles MFSSIA mock verification, token acquisition, and role assignment
 */
export function useOnboarding(roleKey: RoleKey) {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "MKMPOL21" });

  const [state, setState] = useState<OnboardingState>({
    currentStep: "connect",
    isVerifying: false,
    isVerified: false,
    verificationError: null,
    accessToken: null,
    isAcquiringToken: false,
    tokenError: null,
    isAssigning: false,
    assignmentError: null,
    isComplete: false,
    txHash: null,
  });

  // Get the target role
  const targetRole = ROLES[roleKey];

  // Update step based on connection status
  const updateStep = useCallback(() => {
    if (!isConnected) {
      setState(prev => ({ ...prev, currentStep: "connect" }));
    } else if (!state.isVerified) {
      setState(prev => ({ ...prev, currentStep: "verify" }));
    } else if (!state.accessToken) {
      setState(prev => ({ ...prev, currentStep: "token" }));
    } else if (!state.isComplete) {
      setState(prev => ({ ...prev, currentStep: "assign" }));
    } else {
      setState(prev => ({ ...prev, currentStep: "complete" }));
    }
  }, [isConnected, state.isVerified, state.accessToken, state.isComplete]);

  /**
   * Mock MFSSIA identity verification
   * Simulates a call to the MFSSIA service to verify user identity
   */
  const verifyIdentity = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isVerifying: true,
      verificationError: null,
    }));

    try {
      // Mock verification delay (simulates API call to MFSSIA)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock success - in production this would call the actual MFSSIA service
      setState(prev => ({
        ...prev,
        isVerifying: false,
        isVerified: true,
        currentStep: "token",
      }));

      return true;
    } catch {
      setState(prev => ({
        ...prev,
        isVerifying: false,
        verificationError: "Identity verification failed. Please try again.",
      }));
      return false;
    }
  }, []);

  /**
   * Mock MFSSIA access token acquisition
   * Simulates acquiring an access token from MFSSIA
   */
  const acquireAccessToken = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isAcquiringToken: true,
      tokenError: null,
    }));

    try {
      // Mock token acquisition delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Generate mock token
      const mockToken = `mfssia_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      setState(prev => ({
        ...prev,
        isAcquiringToken: false,
        accessToken: mockToken,
        currentStep: "assign",
      }));

      return mockToken;
    } catch {
      setState(prev => ({
        ...prev,
        isAcquiringToken: false,
        tokenError: "Failed to acquire access token. Please try again.",
      }));
      return null;
    }
  }, []);

  /**
   * Assign role to the user
   * Calls the MKMPOL21 smart contract to assign the role
   */
  const assignRole = useCallback(async () => {
    if (!address) {
      setState(prev => ({
        ...prev,
        assignmentError: "Wallet not connected",
      }));
      return false;
    }

    setState(prev => ({
      ...prev,
      isAssigning: true,
      assignmentError: null,
    }));

    try {
      const txHash = await writeContractAsync({
        functionName: "assignRole",
        args: [address, targetRole.value],
      });

      setState(prev => ({
        ...prev,
        isAssigning: false,
        isComplete: true,
        currentStep: "complete",
        txHash: txHash ?? null,
      }));

      return true;
    } catch (error: any) {
      const errorMessage = error?.shortMessage || error?.message || "Role assignment failed";
      setState(prev => ({
        ...prev,
        isAssigning: false,
        assignmentError: errorMessage,
      }));
      return false;
    }
  }, [address, targetRole.value, writeContractAsync]);

  /**
   * Reset the onboarding flow
   */
  const reset = useCallback(() => {
    setState({
      currentStep: isConnected ? "verify" : "connect",
      isVerifying: false,
      isVerified: false,
      verificationError: null,
      accessToken: null,
      isAcquiringToken: false,
      tokenError: null,
      isAssigning: false,
      assignmentError: null,
      isComplete: false,
      txHash: null,
    });
  }, [isConnected]);

  /**
   * Get the current step number (1-based)
   */
  const getStepNumber = useCallback(() => {
    const steps: OnboardingStep[] = ["connect", "verify", "token", "assign", "complete"];
    return steps.indexOf(state.currentStep) + 1;
  }, [state.currentStep]);

  return {
    // State
    ...state,
    isMining,
    targetRole,

    // Actions
    verifyIdentity,
    acquireAccessToken,
    assignRole,
    reset,
    updateStep,
    getStepNumber,

    // Connection status
    address,
    isConnected,
  };
}
