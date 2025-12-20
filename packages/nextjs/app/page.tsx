"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import {
  AdminIcon,
  BlockchainIcon,
  CommitteeIcon,
  DAOIcon,
  DataIcon,
  GovernanceIcon,
  IdentityIcon,
  InstitutionIcon,
  UserIcon,
} from "~~/components/dao";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

/**
 * Landing Page - Welcome page for the MKMPOL21 DAO
 * Entry point for all users before accessing the DAO dashboard
 */
export default function LandingPage() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-[calc(100vh-5rem)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-base-100 via-base-200 to-base-100 dark:from-base-100 dark:via-base-200/50 dark:to-base-100">
        {/* Animated gradient background */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(14,165,233,0.15),transparent_50%)]" />
        </div>

        {/* Decorative elements with enhanced animations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
          <div
            className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: "4s" }}
          />
          {/* Additional decorative orbs */}
          <div
            className="absolute top-1/4 right-1/4 w-48 h-48 bg-success/5 rounded-full blur-2xl animate-float"
            style={{ animationDelay: "2s", animationDuration: "5s" }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-20 lg:py-32">
          <div className="text-center">
            {/* Logo and title */}
            <div className="animate-fade-in">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 mb-8 glow-blue shadow-2xl backdrop-blur-sm border border-primary/20">
                <DAOIcon className="w-12 h-12 text-primary drop-shadow-lg" />
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 tracking-tight">
                <span className="text-gradient drop-shadow-sm">MKMPOL21</span>
                <span className="block text-base-content mt-3 text-4xl md:text-5xl lg:text-6xl font-bold">
                  Decentralized Autonomous Organization
                </span>
              </h1>
            </div>

            {/* Mission statement */}
            <div className="animate-fade-in-delay-1 max-w-4xl mx-auto">
              <div className="backdrop-blur-sm bg-base-100/30 dark:bg-base-200/30 rounded-3xl p-8 border border-base-300/50 shadow-xl mb-8">
                <p className="text-xl md:text-2xl text-base-content/90 mb-6 leading-relaxed font-medium">
                  Decentralizing the governance of economic data through{" "}
                  <span className="font-bold text-primary bg-primary/10 px-2 py-1 rounded">DAO-enabled governance</span>{" "}
                  and{" "}
                  <span className="font-bold text-accent bg-accent/10 px-2 py-1 rounded">self-sovereign identity</span>
                </p>
                <div className="w-24 h-1 bg-gradient-to-r from-primary via-accent to-success mx-auto rounded-full mb-6" />
                <p className="text-base md:text-lg text-base-content/70 leading-relaxed">
                  A transparent, accountable, and community-driven platform empowering stakeholders to collaboratively
                  manage public economic data with verified identities and decentralized decision-making
                </p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="animate-fade-in-delay-2 flex flex-col sm:flex-row gap-4 justify-center items-center">
              {isConnected ? (
                <Link
                  href="/dashboard"
                  className="btn btn-primary btn-lg gap-3 px-10 glow-blue-hover transform hover:scale-105 transition-all duration-300 shadow-2xl"
                >
                  <GovernanceIcon className="w-6 h-6" />
                  <span className="font-bold">Access DAO Dashboard</span>
                </Link>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <RainbowKitCustomConnectButton />
                  <p className="text-sm text-base-content/60">Connect to access the DAO ecosystem</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Onboarding Options Section */}
      <section className="py-20 bg-gradient-to-b from-base-200 via-base-100 to-base-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 animate-fade-in-delay-3">
            <div className="inline-block mb-4">
              <span className="text-sm font-bold uppercase tracking-wider text-primary bg-primary/10 px-4 py-2 rounded-full">
                Get Started
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-base-content via-primary to-accent bg-clip-text text-transparent">
              Join the DAO
            </h2>
            <p className="text-lg md:text-xl text-base-content/70 max-w-2xl mx-auto leading-relaxed">
              Choose your onboarding path based on your role in the economic data ecosystem
            </p>
            <div className="w-32 h-1 bg-gradient-to-r from-primary via-accent to-success mx-auto mt-6 rounded-full" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-delay-4">
            {/* Dashboard Access */}
            <Link
              href="/dashboard"
              className="card bg-base-100 shadow-xl card-hover border-2 border-primary/20 group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-primary/40"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="card-body items-center text-center relative z-10">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary group-hover:from-primary group-hover:to-primary/80 group-hover:text-primary-content transition-all duration-300 mb-4 shadow-lg group-hover:shadow-primary/50 group-hover:scale-110">
                  <GovernanceIcon className="w-9 h-9" />
                </div>
                <h3 className="card-title text-lg font-bold group-hover:text-primary transition-colors">
                  DAO Dashboard
                </h3>
                <p className="text-sm text-base-content/70 leading-relaxed">
                  Access your personalized dashboard based on your current role
                </p>
                <div className="badge badge-primary badge-outline mt-3 group-hover:badge-primary transition-all">
                  For Members
                </div>
              </div>
            </Link>

            {/* Admin Onboarding */}
            <Link
              href="/onboarding/admin"
              className="card bg-base-100 shadow-xl card-hover border-2 border-warning/20 group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-warning/40"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="card-body items-center text-center relative z-10">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-warning/10 to-warning/5 text-warning group-hover:from-warning group-hover:to-warning/80 group-hover:text-warning-content transition-all duration-300 mb-4 shadow-lg group-hover:shadow-warning/50 group-hover:scale-110">
                  <AdminIcon className="w-9 h-9" />
                </div>
                <h3 className="card-title text-lg font-bold group-hover:text-warning transition-colors">
                  Admin Onboarding
                </h3>
                <p className="text-sm text-base-content/70 leading-relaxed">
                  For DAO administrators and governance operators
                </p>
                <div className="badge badge-warning badge-outline mt-3 group-hover:badge-warning transition-all">
                  Owner Role
                </div>
              </div>
            </Link>

            {/* Individual Onboarding */}
            <Link
              href="/onboarding/individual"
              className="card bg-base-100 shadow-xl card-hover border-2 border-accent/20 group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-accent/40"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="card-body items-center text-center relative z-10">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 text-accent group-hover:from-accent group-hover:to-accent/80 group-hover:text-accent-content transition-all duration-300 mb-4 shadow-lg group-hover:shadow-accent/50 group-hover:scale-110">
                  <UserIcon className="w-9 h-9" />
                </div>
                <h3 className="card-title text-lg font-bold group-hover:text-accent transition-colors">
                  Individual Onboarding
                </h3>
                <p className="text-sm text-base-content/70 leading-relaxed">
                  For individual users and data contributors
                </p>
                <div className="badge badge-accent badge-outline mt-3 group-hover:badge-accent transition-all">
                  User Role
                </div>
              </div>
            </Link>

            {/* Institution Onboarding */}
            <Link
              href="/onboarding/institution"
              className="card bg-base-100 shadow-xl card-hover border-2 border-success/20 group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-success/40"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="card-body items-center text-center relative z-10">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-success/10 to-success/5 text-success group-hover:from-success group-hover:to-success/80 group-hover:text-success-content transition-all duration-300 mb-4 shadow-lg group-hover:shadow-success/50 group-hover:scale-110">
                  <InstitutionIcon className="w-9 h-9" />
                </div>
                <h3 className="card-title text-lg font-bold group-hover:text-success transition-colors">
                  Institution Onboarding
                </h3>
                <p className="text-sm text-base-content/70 leading-relaxed">
                  For organizations and data-providing institutions
                </p>
                <div className="badge badge-success badge-outline mt-3 group-hover:badge-success transition-all">
                  Institution Role
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-base-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Governance Infrastructure</h2>
            <p className="text-base-content/70 max-w-2xl mx-auto">
              Built on proven decentralized governance patterns with optimistic execution and multi-committee oversight
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1: Committees */}
            <div className="card bg-base-100 shadow-lg border border-base-300">
              <div className="card-body">
                <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit mb-4">
                  <CommitteeIcon className="w-8 h-8" />
                </div>
                <h3 className="card-title text-xl mb-2">Three Governance Committees</h3>
                <p className="text-base-content/70 leading-relaxed">
                  Consortium, Validation Committee, and Dispute Resolution Board work together to ensure balanced
                  decision-making
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Consortium for strategic decisions
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Validation for data quality
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Dispute Resolution for conflicts
                  </li>
                </ul>
              </div>
            </div>

            {/* Feature 2: Optimistic Governance */}
            <div className="card bg-base-100 shadow-lg border border-base-300">
              <div className="card-body">
                <div className="p-3 rounded-xl bg-accent/10 text-accent w-fit mb-4">
                  <BlockchainIcon className="w-8 h-8" />
                </div>
                <h3 className="card-title text-xl mb-2">Optimistic Governance</h3>
                <p className="text-base-content/70 leading-relaxed">
                  Efficient decision-making with challenge periods and veto mechanisms for accountability
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    3-day challenge period
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    Proposal and veto system
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    Transparent execution
                  </li>
                </ul>
              </div>
            </div>

            {/* Feature 3: Self-Sovereign Identity */}
            <div className="card bg-base-100 shadow-lg border border-base-300">
              <div className="card-body">
                <div className="p-3 rounded-xl bg-success/10 text-success w-fit mb-4">
                  <IdentityIcon className="w-8 h-8" />
                </div>
                <h3 className="card-title text-xl mb-2">Self-Sovereign Identity</h3>
                <p className="text-base-content/70 leading-relaxed">
                  MFSSIA integration ensures verified participants while preserving privacy and user control
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    MFSSIA verification
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    Privacy-preserving identity
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    Role-based access control
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data Governance Section */}
      <section className="py-20 bg-gradient-to-br from-base-200 to-base-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit mb-6">
                <DataIcon className="w-10 h-10" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Decentralized Data Governance</h2>
              <p className="text-lg text-base-content/70 mb-8 leading-relaxed">
                Our platform enables transparent management of economic data through decentralized consensus, ensuring
                data quality, accessibility, and fair distribution of governance power among stakeholders.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/roles-permissions" className="btn btn-outline btn-primary">
                  View Roles and Permissions
                </Link>
                <Link href="/committees" className="btn btn-ghost">
                  Explore Committees
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="card bg-base-100 shadow-lg p-6 text-center">
                <div className="text-4xl font-bold text-primary mb-2">9</div>
                <div className="text-sm text-base-content/70">Role Types</div>
              </div>
              <div className="card bg-base-100 shadow-lg p-6 text-center">
                <div className="text-4xl font-bold text-accent mb-2">3</div>
                <div className="text-sm text-base-content/70">Committees</div>
              </div>
              <div className="card bg-base-100 shadow-lg p-6 text-center">
                <div className="text-4xl font-bold text-success mb-2">64</div>
                <div className="text-sm text-base-content/70">Permissions</div>
              </div>
              <div className="card bg-base-100 shadow-lg p-6 text-center">
                <div className="text-4xl font-bold text-warning mb-2">3d</div>
                <div className="text-sm text-base-content/70">Challenge Period</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-base-100">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Join?</h2>
          <p className="text-lg text-base-content/70 mb-8">
            Connect your wallet and begin your journey into decentralized data governance
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {isConnected ? (
              <>
                <Link href="/dashboard" className="btn btn-primary btn-lg gap-2 px-8">
                  <GovernanceIcon className="w-5 h-5" />
                  Go to Dashboard
                </Link>
                <Link href="/onboarding/individual" className="btn btn-outline btn-lg px-8">
                  Start Onboarding
                </Link>
              </>
            ) : (
              <RainbowKitCustomConnectButton />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
