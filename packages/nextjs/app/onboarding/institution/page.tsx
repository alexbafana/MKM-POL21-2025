"use client";

import { InstitutionIcon, OnboardingFlow } from "~~/components/dao";

/**
 * Institution Onboarding Page
 * Onboarding flow for organizations and data-providing institutions (Member_Institution role)
 * Role value: 1152, Index: 0
 */
export default function InstitutionOnboardingPage() {
  return (
    <OnboardingFlow
      roleKey="MEMBER_INSTITUTION"
      title="Institution Onboarding"
      description="Complete the onboarding process to register your organization as a DAO member institution"
      icon={<InstitutionIcon className="w-10 h-10" />}
      accentColor="success"
    />
  );
}
