"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zeroAddress } from "viem";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { DAOIcon, InstitutionIcon, UserIcon } from "~~/components/dao";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import deployedContracts from "~~/contracts/deployedContracts";

/* Minimal ABI for reading roles */
const MKMP_ABI = [
  {
    type: "function",
    name: "hasRole",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint32" }],
  },
] as const;

/** Resolve current MKMP address from Scaffold-ETH map */
const useMkmpAddress = (): `0x${string}` | undefined => {
  const chainId = useChainId();
  return deployedContracts?.[chainId as keyof typeof deployedContracts]?.MKMPOL21?.address as `0x${string}` | undefined;
};

/**
 * Onboarding Page - Entry point for the MKMPOL21 DAO
 * Automatically redirects users with roles to the Dashboard
 */
export default function OnboardingPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const mkmpAddress = useMkmpAddress();

  const { data: roleRaw, isFetching } = useReadContract({
    abi: MKMP_ABI,
    address: mkmpAddress,
    functionName: "hasRole",
    args: [address ?? zeroAddress],
    query: {
      enabled: Boolean(address && mkmpAddress),
      refetchOnMount: true,
    },
  });

  const hasRole = roleRaw ? Number(roleRaw) !== 0 : false;

  // Redirect to dashboard if user has a role
  useEffect(() => {
    if (isConnected && !isFetching && hasRole) {
      router.push("/dashboard");
    }
  }, [isConnected, isFetching, hasRole, router]);

  // Show loading while checking role
  const isCheckingRole = isConnected && isFetching;

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col">
      {/* Hero Section - Full viewport height */}
      <section className="flex-1 relative overflow-hidden bg-gradient-to-br from-base-100 via-base-200/50 to-base-100 flex items-center justify-center">
        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(14,165,233,0.12),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.08),transparent_60%)]" />
        </div>

        {/* Floating orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/6 w-96 h-96 bg-primary/8 rounded-full blur-3xl animate-float" />
          <div
            className="absolute bottom-1/4 right-1/6 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-float"
            style={{ animationDelay: "1.5s", animationDuration: "7s" }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-secondary/5 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: "5s" }}
          />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-16">
          <div className="text-center">
            {/* Logo */}
            <div className="animate-fade-in mb-10">
              <div className="inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-gradient-to-br from-primary/20 via-accent/15 to-success/20 shadow-2xl backdrop-blur-sm border border-white/10 glow-blue">
                <DAOIcon className="w-14 h-14 text-primary drop-shadow-lg" />
              </div>
            </div>

            {/* Title */}
            <div className="animate-fade-in mb-8">
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-4">
                <span className="text-gradient">MKMPOL21</span>
              </h1>
              <p className="text-2xl md:text-3xl font-light text-base-content/60 tracking-wide">
                Public Data Governance
              </p>
            </div>

            {/* Divider */}
            <div className="animate-fade-in-delay-1 w-32 h-1 bg-gradient-to-r from-primary via-accent to-success mx-auto rounded-full mb-12" />

            {/* Content based on state */}
            {!isConnected ? (
              /* Not connected - show connect prompt */
              <div className="animate-fade-in-delay-2 flex flex-col items-center gap-6">
                <p className="text-lg text-base-content/50 font-medium">Connect your wallet to begin</p>
                <RainbowKitCustomConnectButton />
              </div>
            ) : isCheckingRole ? (
              /* Checking role - show loading */
              <div className="animate-fade-in-delay-2 flex flex-col items-center gap-6">
                <div className="flex items-center gap-3">
                  <span className="loading loading-spinner loading-md text-primary"></span>
                  <p className="text-lg text-base-content/50 font-medium">Checking your DAO membership...</p>
                </div>
              </div>
            ) : (
              /* Connected but no role - show onboarding options */
              <div className="animate-fade-in-delay-2">
                <p className="text-lg text-base-content/50 mb-10 font-medium">Select your onboarding path</p>

                {/* Onboarding Cards */}
                <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                  {/* Individual Onboarding */}
                  <Link
                    href="/onboarding/individual"
                    className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-base-100 to-base-200/80 border border-accent/20 shadow-xl hover:shadow-2xl hover:shadow-accent/20 transition-all duration-500 hover:-translate-y-2 hover:border-accent/40"
                  >
                    {/* Glow effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative p-10">
                      {/* Icon */}
                      <div className="mb-8 flex justify-center">
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-accent/15 to-accent/5 text-accent group-hover:from-accent group-hover:to-accent/80 group-hover:text-white transition-all duration-500 shadow-lg group-hover:shadow-accent/40 group-hover:scale-110">
                          <UserIcon className="w-12 h-12" />
                        </div>
                      </div>

                      {/* Text */}
                      <h3 className="text-2xl font-bold mb-3 group-hover:text-accent transition-colors duration-300">
                        Individual
                      </h3>
                      <p className="text-base-content/60 text-sm leading-relaxed">
                        Join as a data contributor and participate in DAO governance
                      </p>

                      {/* Arrow indicator */}
                      <div className="mt-6 flex justify-center">
                        <div className="w-10 h-10 rounded-full border-2 border-accent/30 flex items-center justify-center group-hover:border-accent group-hover:bg-accent/10 transition-all duration-300">
                          <svg
                            className="w-5 h-5 text-accent/50 group-hover:text-accent group-hover:translate-x-0.5 transition-all duration-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Institution Onboarding */}
                  <Link
                    href="/onboarding/institution"
                    className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-base-100 to-base-200/80 border border-success/20 shadow-xl hover:shadow-2xl hover:shadow-success/20 transition-all duration-500 hover:-translate-y-2 hover:border-success/40"
                  >
                    {/* Glow effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-success/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative p-10">
                      {/* Icon */}
                      <div className="mb-8 flex justify-center">
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-success/15 to-success/5 text-success group-hover:from-success group-hover:to-success/80 group-hover:text-white transition-all duration-500 shadow-lg group-hover:shadow-success/40 group-hover:scale-110">
                          <InstitutionIcon className="w-12 h-12" />
                        </div>
                      </div>

                      {/* Text */}
                      <h3 className="text-2xl font-bold mb-3 group-hover:text-success transition-colors duration-300">
                        Institution
                      </h3>
                      <p className="text-base-content/60 text-sm leading-relaxed">
                        Register your organization to provide and validate data
                      </p>

                      {/* Arrow indicator */}
                      <div className="mt-6 flex justify-center">
                        <div className="w-10 h-10 rounded-full border-2 border-success/30 flex items-center justify-center group-hover:border-success group-hover:bg-success/10 transition-all duration-300">
                          <svg
                            className="w-5 h-5 text-success/50 group-hover:text-success group-hover:translate-x-0.5 transition-all duration-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-base-100 to-transparent" />
      </section>
    </div>
  );
}
