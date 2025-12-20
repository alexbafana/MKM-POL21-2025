"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { zeroAddress } from "viem";
import { useAccount, useChainId, useReadContract } from "wagmi";
import {
  AdminIcon,
  BlockchainIcon,
  CommitteeIcon,
  DataIcon,
  GovernanceIcon,
  LockIcon,
  UserIcon,
} from "~~/components/dao";
import { LoadingState } from "~~/components/dao/LoadingState";
import { Address } from "~~/components/scaffold-eth";
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

const ROLE_LABELS: Record<number, string> = {
  0: "Member Institution",
  1: "Ordinary User",
  2: "MFSSIA Guardian Agent",
  3: "Eliza Data Extractor Agent",
  4: "Data Validator",
  5: "MKMPOL21 Owner",
  6: "Consortium",
  7: "Validation Committee",
  8: "Dispute Resolution Board",
};

/**
 * Dashboard Page - Role-based dashboard for DAO members
 * Shows different views based on user's role in the system
 */
export default function DashboardPage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const mkmpAddress = useMkmpAddress();

  const {
    data: roleRaw,
    isFetching,
    refetch,
  } = useReadContract({
    abi: MKMP_ABI,
    address: mkmpAddress,
    functionName: "hasRole",
    args: [address ?? zeroAddress],
    query: { enabled: Boolean(address && mkmpAddress) },
  });

  useEffect(() => {
    if (address && mkmpAddress) refetch();
  }, [address, mkmpAddress, chainId, refetch]);

  const { roleValue, roleName, roleIndex, isOwner, isMember } = useMemo(() => {
    const v = roleRaw ? Number(roleRaw) : 0;
    const idx = v & 31;
    return {
      roleValue: v,
      roleIndex: idx,
      roleName: v === 0 ? "No Role" : (ROLE_LABELS[idx] ?? "Unknown"),
      isOwner: idx === 5 && v !== 0,
      isMember: v !== 0,
    };
  }, [roleRaw]);

  // Not connected state
  if (!address) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <div className="max-w-lg mx-auto text-center px-6">
          <div className="card bg-base-100 shadow-xl border border-base-300">
            <div className="card-body">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <GovernanceIcon className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-4">DAO Dashboard</h1>
              <p className="text-base-content/70 mb-6">
                Connect your wallet to access the DAO governance system and view your role.
              </p>
              <div className="flex justify-center gap-2">
                <div className="badge badge-outline">Network: {chainId ?? "Unknown"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isFetching) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <LoadingState message="Loading your role..." size="lg" />
      </div>
    );
  }

  // Owner Dashboard
  if (isOwner) {
    return (
      <div className="min-h-[calc(100vh-5rem)]">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-secondary/5 to-accent/10 py-12 border-b border-base-300">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="badge badge-primary badge-lg gap-2">
                    <AdminIcon className="w-4 h-4" />
                    OWNER
                  </div>
                  <div className="badge badge-outline">Chain {chainId}</div>
                </div>
                <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
                <div className="flex items-center gap-2 text-base-content/70">
                  <span>Your Address:</span>
                  <Address address={address} />
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/admin" className="btn btn-primary gap-2">
                  <UserIcon className="w-4 h-4" />
                  Manage Roles
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
            <div className="grid md:grid-cols-4 gap-4">
              <Link href="/admin" className="card bg-base-100 shadow-lg card-hover border border-primary/20 group">
                <div className="card-body">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-content transition-colors w-fit">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <h3 className="card-title text-lg mt-2">Manage Roles</h3>
                  <p className="text-sm text-base-content/70">Assign and revoke roles</p>
                </div>
              </Link>

              <Link
                href="/roles-permissions"
                className="card bg-base-100 shadow-lg card-hover border border-accent/20 group"
              >
                <div className="card-body">
                  <div className="p-3 rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-content transition-colors w-fit">
                    <GovernanceIcon className="w-6 h-6" />
                  </div>
                  <h3 className="card-title text-lg mt-2">Permissions</h3>
                  <p className="text-sm text-base-content/70">View permission matrix</p>
                </div>
              </Link>

              <Link href="/committees" className="card bg-base-100 shadow-lg card-hover border border-success/20 group">
                <div className="card-body">
                  <div className="p-3 rounded-xl bg-success/10 text-success group-hover:bg-success group-hover:text-success-content transition-colors w-fit">
                    <CommitteeIcon className="w-6 h-6" />
                  </div>
                  <h3 className="card-title text-lg mt-2">Committees</h3>
                  <p className="text-sm text-base-content/70">Governance committees</p>
                </div>
              </Link>

              <Link href="/debug" className="card bg-base-100 shadow-lg card-hover border border-warning/20 group">
                <div className="card-body">
                  <div className="p-3 rounded-xl bg-warning/10 text-warning group-hover:bg-warning group-hover:text-warning-content transition-colors w-fit">
                    <BlockchainIcon className="w-6 h-6" />
                  </div>
                  <h3 className="card-title text-lg mt-2">Debug</h3>
                  <p className="text-sm text-base-content/70">Contract debugging</p>
                </div>
              </Link>
            </div>
          </div>

          {/* System Status */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card bg-base-100 shadow-lg border border-base-300">
              <div className="card-body">
                <h3 className="card-title flex items-center gap-2">
                  <BlockchainIcon className="w-5 h-5 text-primary" />
                  System Status
                </h3>
                <div className="space-y-4 mt-4">
                  <div className="flex justify-between items-center py-2 border-b border-base-200">
                    <span className="text-base-content/70">Permission Manager</span>
                    <div className="badge badge-success gap-1">
                      <span className="status-indicator active" />
                      Active
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-base-200">
                    <span className="text-base-content/70">Contract Address</span>
                    <Address address={mkmpAddress!} />
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-base-content/70">Your Role</span>
                    <span className="font-semibold text-primary">{roleName}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-lg border border-base-300">
              <div className="card-body">
                <h3 className="card-title flex items-center gap-2">
                  <DataIcon className="w-5 h-5 text-accent" />
                  Governance Areas
                </h3>
                <div className="space-y-2 mt-4">
                  <Link
                    href="/governance/dao-management"
                    className="btn btn-sm btn-block justify-start btn-ghost hover:bg-primary/10"
                  >
                    DAO Management
                  </Link>
                  <Link
                    href="/governance/data-validation"
                    className="btn btn-sm btn-block justify-start btn-ghost hover:bg-primary/10"
                  >
                    Data Validation
                  </Link>
                  <Link
                    href="/governance/dispute-resolution"
                    className="btn btn-sm btn-block justify-start btn-ghost hover:bg-primary/10"
                  >
                    Dispute Resolution
                  </Link>
                  <Link
                    href="/governance/membership"
                    className="btn btn-sm btn-block justify-start btn-ghost hover:bg-primary/10"
                  >
                    Membership
                  </Link>
                  <Link
                    href="/governance/data-access"
                    className="btn btn-sm btn-block justify-start btn-ghost hover:bg-primary/10"
                  >
                    Data Access
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Member Dashboard
  if (isMember) {
    return (
      <div className="min-h-[calc(100vh-5rem)]">
        {/* Header */}
        <div className="bg-gradient-to-r from-secondary/10 via-accent/5 to-success/10 py-12 border-b border-base-300">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="badge badge-secondary badge-lg gap-2">
                    <UserIcon className="w-4 h-4" />
                    {roleName}
                  </div>
                  <div className="badge badge-outline">Chain {chainId}</div>
                </div>
                <h1 className="text-4xl font-bold mb-2">Member Dashboard</h1>
                <div className="flex items-center gap-2 text-base-content/70">
                  <span>Your Address:</span>
                  <Address address={address} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Role Info */}
            <div className="card bg-base-100 shadow-lg border border-base-300">
              <div className="card-body">
                <h3 className="card-title flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-primary" />
                  Your Role
                </h3>
                <div className="space-y-4 mt-4">
                  <div className="flex justify-between py-2 border-b border-base-200">
                    <span className="text-base-content/70">Role Name</span>
                    <span className="font-semibold">{roleName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-base-200">
                    <span className="text-base-content/70">Role Value</span>
                    <span className="font-mono text-sm">{roleValue}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-base-200">
                    <span className="text-base-content/70">Role Index</span>
                    <span className="font-mono text-sm">{roleIndex}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-base-content/70">Membership Status</span>
                    <div className="badge badge-success gap-1">
                      <span className="status-indicator active" />
                      Active
                    </div>
                  </div>
                </div>
                <div className="divider"></div>
                <Link href="/roles-permissions" className="btn btn-outline btn-sm">
                  View All Permissions
                </Link>
              </div>
            </div>

            {/* Governance Actions */}
            <div className="card bg-base-100 shadow-lg border border-base-300">
              <div className="card-body">
                <h3 className="card-title flex items-center gap-2">
                  <GovernanceIcon className="w-5 h-5 text-accent" />
                  Governance
                </h3>
                <p className="text-sm text-base-content/70 mb-4">
                  Participate in DAO governance through committees and proposals
                </p>
                <div className="space-y-2">
                  <Link href="/committees" className="btn btn-primary btn-block">
                    View Committees
                  </Link>
                  <Link href="/governance/data-validation" className="btn btn-outline btn-block">
                    Data Validation
                  </Link>
                  <Link href="/governance/membership" className="btn btn-outline btn-block">
                    Membership
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No Role - Guest (connected but without role)
  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <div className="card bg-base-100 shadow-xl border border-base-300">
          <div className="card-body">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-warning/10 flex items-center justify-center">
              <LockIcon className="w-8 h-8 text-warning" />
            </div>
            <h2 className="card-title text-2xl justify-center mb-2">Access Required</h2>
            <p className="text-base-content/70 mb-6">
              You are connected but do not have any role assigned yet. Complete the onboarding process or contact a DAO
              administrator to request membership.
            </p>

            <div className="bg-base-200 rounded-xl p-4 mb-6">
              <div className="text-sm space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-base-content/70">Your Address</span>
                  <Address address={address} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base-content/70">Network</span>
                  <span className="font-mono">{chainId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base-content/70">Status</span>
                  <div className="badge badge-warning gap-1">
                    <span className="status-indicator pending" />
                    No Role
                  </div>
                </div>
              </div>
            </div>

            <div className="alert bg-primary/10 border border-primary/20">
              <GovernanceIcon className="w-6 h-6 text-primary shrink-0" />
              <div className="text-left text-sm">
                <p className="font-semibold">How to join the DAO:</p>
                <ol className="list-decimal list-inside mt-2 text-base-content/70 space-y-1">
                  <li>Complete the onboarding process for your role type</li>
                  <li>Verify your identity through MFSSIA</li>
                  <li>Receive your role assignment automatically</li>
                </ol>
              </div>
            </div>

            <div className="card-actions justify-center mt-6 flex-wrap gap-2">
              <Link href="/onboarding/individual" className="btn btn-primary">
                Start Individual Onboarding
              </Link>
              <Link href="/onboarding/institution" className="btn btn-outline">
                Institution Onboarding
              </Link>
              <Link href="/roles-permissions" className="btn btn-ghost">
                View Available Roles
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
