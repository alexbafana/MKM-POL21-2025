"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { zeroAddress } from "viem";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import deployedContracts from "~~/contracts/deployedContracts";

/* Minimal ABI used here */
const MKMP_ABI = [
  {
    type: "function",
    name: "hasRole",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint32" }],
  },
  {
    type: "function",
    name: "assignRole",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_user", type: "address" },
      { name: "_role", type: "uint32" },
    ],
    outputs: [],
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

export default function Home() {
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

  const { roleValue, roleName, isOwner, isMember } = useMemo(() => {
    const v = roleRaw ? Number(roleRaw) : 0;
    const idx = v & 31;
    return {
      roleValue: v,
      roleName: v === 0 ? "No Role" : (ROLE_LABELS[idx] ?? "Unknown"),
      isOwner: idx === 5 && v !== 0,
      isMember: v !== 0,
    };
  }, [roleRaw]);

  // Not connected state
  if (!address) {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-base-200 to-base-300 flex items-center justify-center">
        <div className="max-w-4xl mx-auto text-center px-6">
          <div className="mb-8">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              MKMPOL21 DAO
            </h1>
            <p className="text-xl md:text-2xl opacity-80 mb-2">Decentralized Governance for Public Data</p>
            <p className="text-base opacity-60">Transparent, accountable, and community-driven data management</p>
          </div>

          <div className="card bg-base-100 shadow-xl max-w-2xl mx-auto">
            <div className="card-body">
              <h2 className="card-title text-2xl justify-center mb-4">Welcome</h2>
              <p className="opacity-80 mb-6">
                Connect your wallet to access the DAO governance system and view your role.
              </p>
              <div className="flex justify-center">
                <div className="badge badge-lg badge-outline">Network: {chainId ?? "Unknown"}</div>
              </div>
            </div>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-6 text-left">
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h3 className="card-title text-lg">Committees</h3>
                <p className="text-sm opacity-70">
                  Three governance bodies: Consortium, Validation Committee, and Dispute Resolution Board
                </p>
              </div>
            </div>
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h3 className="card-title text-lg">Optimistic Governance</h3>
                <p className="text-sm opacity-70">
                  Efficient decision-making with challenge periods and veto mechanisms
                </p>
              </div>
            </div>
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h3 className="card-title text-lg">Role-Based Access</h3>
                <p className="text-sm opacity-70">
                  Granular permissions system ensures proper authorization for all actions
                </p>
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
      <div className="min-h-[calc(100vh-5rem)] bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 opacity-70">Loading your role...</p>
        </div>
      </div>
    );
  }

  // Owner Dashboard
  if (isOwner) {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-base-200">
        <div className="bg-gradient-to-r from-primary/20 to-secondary/20 py-12">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="badge badge-primary badge-lg">OWNER</div>
              <div className="badge badge-outline">{chainId}</div>
            </div>
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <div className="flex items-center gap-2 opacity-80">
              <span>Your Address:</span>
              <Address address={address} />
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
            <div className="grid md:grid-cols-4 gap-4">
              <Link href="/admin" className="btn btn-primary btn-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                  />
                </svg>
                Manage Roles
              </Link>
              <Link href="/roles-permissions" className="btn btn-outline btn-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
                Permissions
              </Link>
              <Link href="/committees" className="btn btn-outline btn-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                  />
                </svg>
                Committees
              </Link>
              <Link href="/debug" className="btn btn-outline btn-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
                  />
                </svg>
                Debug
              </Link>
            </div>
          </div>

          {/* System Status */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h3 className="card-title">System Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="opacity-70">Permission Manager</span>
                    <div className="badge badge-success">Active</div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="opacity-70">Contract Address</span>
                    <Address address={mkmpAddress!} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="opacity-70">Your Role</span>
                    <span className="font-semibold">{roleName}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h3 className="card-title">Governance Areas</h3>
                <div className="space-y-2">
                  <Link href="/governance/dao-management" className="btn btn-sm btn-block justify-start">
                    DAO Management
                  </Link>
                  <Link href="/governance/data-validation" className="btn btn-sm btn-block justify-start">
                    Data Validation
                  </Link>
                  <Link href="/governance/dispute-resolution" className="btn btn-sm btn-block justify-start">
                    Dispute Resolution
                  </Link>
                  <Link href="/governance/membership" className="btn btn-sm btn-block justify-start">
                    Membership
                  </Link>
                  <Link href="/governance/data-access" className="btn btn-sm btn-block justify-start">
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
      <div className="min-h-[calc(100vh-5rem)] bg-base-200">
        <div className="bg-gradient-to-r from-secondary/20 to-accent/20 py-12">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="badge badge-secondary badge-lg">{roleName}</div>
              <div className="badge badge-outline">{chainId}</div>
            </div>
            <h1 className="text-4xl font-bold mb-2">Member Dashboard</h1>
            <div className="flex items-center gap-2 opacity-80">
              <span>Your Address:</span>
              <Address address={address} />
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h3 className="card-title">Your Role</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="opacity-70">Role Name</span>
                    <span className="font-semibold">{roleName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">Role Value</span>
                    <span className="font-mono text-sm">{roleValue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">Membership Status</span>
                    <div className="badge badge-success">Active</div>
                  </div>
                </div>
                <div className="divider"></div>
                <Link href="/roles-permissions" className="btn btn-outline btn-sm">
                  View All Permissions
                </Link>
              </div>
            </div>

            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h3 className="card-title">Governance</h3>
                <p className="text-sm opacity-70 mb-4">
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

  // No Role - Guest
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-base-200 flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-16 h-16 mx-auto opacity-50"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>
            <h2 className="card-title text-2xl justify-center mb-2">Access Required</h2>
            <p className="opacity-70 mb-4">
              You are connected but don&apos;t have any role assigned yet. Contact a DAO administrator to request
              membership.
            </p>

            <div className="bg-base-200 rounded-box p-4 mb-4">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="opacity-70">Your Address</span>
                  <Address address={address} />
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Network</span>
                  <span>{chainId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Status</span>
                  <div className="badge badge-warning">No Role</div>
                </div>
              </div>
            </div>

            <div className="alert alert-info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <div className="text-left text-sm">
                <p className="font-semibold">How to join the DAO:</p>
                <ol className="list-decimal list-inside mt-1 opacity-80">
                  <li>Share your address with an Owner</li>
                  <li>Owner assigns you a role (e.g., Ordinary User)</li>
                  <li>You gain access to governance features</li>
                </ol>
              </div>
            </div>

            <div className="card-actions justify-center mt-4">
              <Link href="/roles-permissions" className="btn btn-outline">
                View Available Roles
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
