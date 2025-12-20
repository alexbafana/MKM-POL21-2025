"use client";

import { AdminIcon, OnboardingFlow } from "~~/components/dao";

/**
 * Admin Onboarding Page
 * Onboarding flow for DAO administrators (MKMPOL21Owner role)
 * Role value: 1029, Index: 5
 */
export default function AdminOnboardingPage() {
  return (
    <OnboardingFlow
      roleKey="MKMPOL21_OWNER"
      title="Admin Onboarding"
      description="Complete the onboarding process to become a DAO administrator"
      icon={<AdminIcon className="w-10 h-10" />}
      accentColor="warning"
    />
  );
}
