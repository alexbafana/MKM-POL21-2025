"use client";

import { OnboardingFlow, UserIcon } from "~~/components/dao";

/**
 * Individual Onboarding Page
 * Onboarding flow for individual users (Ordinary_User role)
 * Role value: 1153, Index: 1
 */
export default function IndividualOnboardingPage() {
  return (
    <OnboardingFlow
      roleKey="ORDINARY_USER"
      title="Individual Onboarding"
      description="Join the DAO as an individual user and data contributor"
      icon={<UserIcon className="w-10 h-10" />}
      accentColor="accent"
    />
  );
}
