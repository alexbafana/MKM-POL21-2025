"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { isAddress, zeroAddress } from "viem";
import { useAccount, useChainId, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";

const MKMP_ABI = [
  {
    inputs: [{ name: "user", type: "address" }],
    name: "hasRole",
    outputs: [{ type: "uint32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "_user", type: "address" },
      { name: "_role", type: "uint32" },
    ],
    name: "assignRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "_user", type: "address" },
      { name: "_role", type: "uint32" },
    ],
    name: "revokeRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "_role", type: "uint32" },
      { name: "_permissionIndex", type: "uint64" },
    ],
    name: "grantPermission",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "_role", type: "uint32" },
      { name: "_permissionIndex", type: "uint64" },
    ],
    name: "revokePermission",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "user", type: "address" },
      { name: "_permissionIndex", type: "uint64" },
    ],
    name: "has_permission",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const ROLES = [
  { name: "Member_Institution", value: 1152, index: 0 },
  { name: "Ordinary_User", value: 1153, index: 1 },
  { name: "MFSSIA_Guardian_Agent", value: 3074, index: 2 },
  { name: "Eliza_Data_Extractor_Agent", value: 3075, index: 3 },
  { name: "Data_Validator", value: 1156, index: 4 },
  { name: "MKMPOL21Owner", value: 1029, index: 5 },
  { name: "Consortium", value: 1030, index: 6 },
  { name: "Validation_Committee", value: 1031, index: 7 },
  { name: "Dispute_Resolution_Board", value: 1032, index: 8 },
];

const PERMISSIONS = [
  // Dispute Resolution (0-3)
  { index: 0, name: "Accept Revision", category: "Dispute Resolution", description: "Accept a data revision request" },
  { index: 1, name: "Request Revision", category: "Dispute Resolution", description: "Request revision of data" },
  {
    index: 2,
    name: "Propose Modification to Revision",
    category: "Dispute Resolution",
    description: "Propose modifications to a revision",
  },
  {
    index: 3,
    name: "Accept Modification to Revision",
    category: "Dispute Resolution",
    description: "Accept modifications to a revision",
  },

  // DAO Management (4-5)
  { index: 4, name: "Modify Statute", category: "DAO Management", description: "Modify the DAO statute" },
  {
    index: 5,
    name: "Upgrade Permission Manager",
    category: "DAO Management",
    description: "Upgrade DAO smart contracts",
  },

  // Data Validation (6-10)
  { index: 6, name: "Reject Data Point", category: "Data Validation", description: "Reject a data point proposal" },
  {
    index: 7,
    name: "Edit Data Point Proposal",
    category: "Data Validation",
    description: "Edit a data point inclusion proposal",
  },
  {
    index: 8,
    name: "Submit Data Point Proposal",
    category: "Data Validation",
    description: "Submit a data point for inclusion",
  },
  { index: 9, name: "Add Metadata", category: "Data Validation", description: "Add metadata to data points" },
  { index: 10, name: "Inspect Data Point", category: "Data Validation", description: "Inspect data point details" },

  // MFSSIA Authentication (11-14)
  {
    index: 11,
    name: "Access Challenge Set",
    category: "MFSSIA Authentication",
    description: "Set authentication challenge",
  },
  {
    index: 12,
    name: "Validate Response",
    category: "MFSSIA Authentication",
    description: "Validate authentication response",
  },
  {
    index: 13,
    name: "Access Challenge Response",
    category: "MFSSIA Authentication",
    description: "Respond to authentication challenge",
  },
  {
    index: 14,
    name: "Green Light Authentication",
    category: "MFSSIA Authentication",
    description: "Approve authentication",
  },

  // RDF Data Retrieval (15-17)
  { index: 15, name: "Retrieve Data", category: "RDF Data Retrieval", description: "Retrieve RDF data" },
  { index: 16, name: "Make Prediction", category: "RDF Data Retrieval", description: "Make data predictions" },
  {
    index: 17,
    name: "Notify Contradiction",
    category: "RDF Data Retrieval",
    description: "Report data contradictions",
  },

  // Membership (18-21)
  { index: 18, name: "Onboard Ordinary User", category: "Membership", description: "Add ordinary user to DAO" },
  { index: 19, name: "Onboard Institution", category: "Membership", description: "Add institution to DAO" },
  { index: 20, name: "Remove Ordinary Member", category: "Membership", description: "Remove ordinary member from DAO" },
  { index: 21, name: "Remove Institution", category: "Membership", description: "Remove institution from DAO" },

  // Data Access (22)
  {
    index: 22,
    name: "Submit Query to Eliza Agent",
    category: "Data Access",
    description: "Query the Eliza data agent",
  },

  // Committee Governance (28-33)
  {
    index: 28,
    name: "Propose (Consortium)",
    category: "Committee Governance",
    description: "Create proposals in Consortium",
  },
  { index: 29, name: "Vote (Consortium)", category: "Committee Governance", description: "Vote in Consortium" },
  {
    index: 30,
    name: "Propose (Validation Committee)",
    category: "Committee Governance",
    description: "Create proposals in Validation Committee",
  },
  {
    index: 31,
    name: "Vote (Validation Committee)",
    category: "Committee Governance",
    description: "Vote in Validation Committee",
  },
  {
    index: 32,
    name: "Propose (Dispute Board)",
    category: "Committee Governance",
    description: "Create proposals in Dispute Board",
  },
  { index: 33, name: "Vote (Dispute Board)", category: "Committee Governance", description: "Vote in Dispute Board" },
];

const PERMISSION_CATEGORIES = Array.from(new Set(PERMISSIONS.map(p => p.category)));

const OWNER_INDEX = 5;
const useMkmpAddress = (): `0x${string}` | undefined => {
  const chainId = useChainId();
  return (deployedContracts as any)?.[chainId]?.MKMPOL21?.address as `0x${string}` | undefined;
};

export default function RolesPermissions() {
  const { address } = useAccount();
  const chainId = useChainId();
  const mkmpAddress = useMkmpAddress();

  const { data: callerRaw, refetch: refetchRole } = useReadContract({
    address: mkmpAddress,
    abi: MKMP_ABI,
    functionName: "hasRole",
    args: [address ?? zeroAddress],
    query: { enabled: Boolean(mkmpAddress && address) },
  });
  const callerRoleIndex = Number(callerRaw ?? 0) & 31;
  const isOwner = callerRoleIndex === OWNER_INDEX;

  const { writeContract, data: txHash, error: writeErr, isPending, reset } = useWriteContract();
  const { isLoading: isMining, isSuccess: isMined } = useWaitForTransactionReceipt({
    hash: txHash,
    query: {
      enabled: Boolean(txHash),
    },
  });

  // Refetch role when transaction is mined
  React.useEffect(() => {
    if (isMined) {
      refetchRole();
      setTimeout(() => {
        reset();
      }, 3000);
    }
  }, [isMined, refetchRole, reset]);

  // forms
  const [user, setUser] = useState<string>("");
  const [roleValue, setRoleValue] = useState<number>(ROLES[1].value);
  const [permRoleValue, setPermRoleValue] = useState<number>(ROLES[1].value);
  const [permIndex, setPermIndex] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const filteredPermissions = useMemo(() => {
    if (selectedCategory === "All") return PERMISSIONS;
    return PERMISSIONS.filter(p => p.category === selectedCategory);
  }, [selectedCategory]);

  const canSubmitRole = isOwner && mkmpAddress && isAddress(user);
  const canSubmitPerm = mkmpAddress && isOwner;

  const onAssign = async () => {
    if (!canSubmitRole) return;
    try {
      await writeContract({
        address: mkmpAddress!,
        abi: MKMP_ABI,
        functionName: "assignRole",
        args: [user as `0x${string}`, roleValue as any],
      });
    } catch (error: any) {
      console.error("Assign role error:", error);
    }
  };

  const onRevoke = async () => {
    if (!canSubmitRole) return;
    try {
      await writeContract({
        address: mkmpAddress!,
        abi: MKMP_ABI,
        functionName: "revokeRole",
        args: [user as `0x${string}`, roleValue as any],
      });
    } catch (error: any) {
      console.error("Revoke role error:", error);
    }
  };

  const onGrantPerm = async () => {
    if (!canSubmitPerm) return;
    try {
      await writeContract({
        address: mkmpAddress!,
        abi: MKMP_ABI,
        functionName: "grantPermission",
        args: [permRoleValue, BigInt(permIndex)],
      });
    } catch (error: any) {
      console.error("Grant permission error:", error);
    }
  };

  const onRevokePerm = async () => {
    if (!canSubmitPerm) return;
    try {
      await writeContract({
        address: mkmpAddress!,
        abi: MKMP_ABI,
        functionName: "revokePermission",
        args: [permRoleValue, BigInt(permIndex)],
      });
    } catch (error: any) {
      console.error("Revoke permission error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500/20 to-purple-500/20 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <Link href="/" className="link link-hover mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-2">Roles & Permissions</h1>
          <p className="text-lg opacity-80">Manage role assignments and permission grants for the DAO</p>
          <p className="text-sm opacity-60 mt-2">
            Chain {chainId} • Contract {mkmpAddress ?? "—"}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Connection Info */}
        {address && (
          <div className="card bg-gradient-to-br from-base-100 to-base-200 shadow-xl mb-6">
            <div className="card-body">
              <h3 className="card-title text-lg mb-3">
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
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
                Your Identity
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <span className="text-xs opacity-60 mb-1">Address</span>
                  <span className="font-mono text-sm truncate">{address}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs opacity-60 mb-1">Role Value</span>
                  <span className="font-mono text-sm">{callerRaw?.toString() ?? "0"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs opacity-60 mb-1">Role</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {ROLES.find(r => r.index === callerRoleIndex)?.name ?? "No Role"}
                    </span>
                    {isOwner && <div className="badge badge-primary badge-sm">Owner</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isOwner && (
          <div className="alert alert-warning mb-6">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>
              <div className="font-semibold">Owner Access Required</div>
              <div className="text-sm">
                You need Owner role (index 5) to modify roles and permissions. Current role:{" "}
                <strong>{ROLES.find(r => r.index === callerRoleIndex)?.name ?? "No Role"}</strong>
              </div>
            </span>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Assign/Revoke Role */}
          <div className="card bg-base-100 shadow-xl border border-primary/20">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-7 h-7 text-primary"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                  />
                </svg>
                Role Management
              </h2>
              <p className="text-sm opacity-70 mb-4">Assign or revoke roles to DAO members</p>

              <label className="form-control mb-4">
                <div className="label">
                  <span className="label-text font-semibold">User Address</span>
                </div>
                <input
                  className="input input-bordered font-mono"
                  placeholder="0x..."
                  value={user}
                  onChange={e => setUser(e.target.value.trim())}
                  disabled={!isOwner}
                />
              </label>

              <label className="form-control mb-6">
                <div className="label">
                  <span className="label-text font-semibold">Role</span>
                </div>
                <select
                  className="select select-bordered"
                  value={roleValue}
                  onChange={e => setRoleValue(Number(e.target.value))}
                  disabled={!isOwner}
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>
                      {r.name} (index: {r.index})
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex gap-3">
                <button
                  className="btn btn-primary flex-1"
                  disabled={!canSubmitRole || isPending || isMining}
                  onClick={onAssign}
                >
                  {isPending || isMining ? <span className="loading loading-spinner"></span> : "Assign Role"}
                </button>
                <button
                  className="btn btn-error flex-1"
                  disabled={!canSubmitRole || isPending || isMining}
                  onClick={onRevoke}
                >
                  Revoke Role
                </button>
              </div>
            </div>
          </div>

          {/* Grant/Revoke Permission */}
          <div className="card bg-base-100 shadow-xl border border-secondary/20">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-7 h-7 text-secondary"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
                Permission Management
              </h2>
              <p className="text-sm opacity-70 mb-4">Grant or revoke specific permissions to roles</p>

              <label className="form-control mb-4">
                <div className="label">
                  <span className="label-text font-semibold">Role</span>
                </div>
                <select
                  className="select select-bordered"
                  value={permRoleValue}
                  onChange={e => setPermRoleValue(Number(e.target.value))}
                  disabled={!isOwner}
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-control mb-4">
                <div className="label">
                  <span className="label-text font-semibold">Category Filter</span>
                </div>
                <select
                  className="select select-bordered select-sm"
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  disabled={!isOwner}
                >
                  <option value="All">All Categories</option>
                  {PERMISSION_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-control mb-6">
                <div className="label">
                  <span className="label-text font-semibold">Permission</span>
                </div>
                <select
                  className="select select-bordered"
                  value={permIndex}
                  onChange={e => setPermIndex(Number(e.target.value))}
                  disabled={!isOwner}
                >
                  {filteredPermissions.map(p => (
                    <option key={p.index} value={p.index}>
                      [{p.index}] {p.name}
                    </option>
                  ))}
                </select>
                <div className="label">
                  <span className="label-text-alt opacity-60">
                    {PERMISSIONS.find(p => p.index === permIndex)?.description}
                  </span>
                </div>
              </label>

              <div className="flex gap-3">
                <button
                  className="btn btn-success flex-1"
                  disabled={!canSubmitPerm || isPending || isMining}
                  onClick={onGrantPerm}
                >
                  {isPending || isMining ? <span className="loading loading-spinner"></span> : "Grant"}
                </button>
                <button
                  className="btn btn-error flex-1"
                  disabled={!canSubmitPerm || isPending || isMining}
                  onClick={onRevokePerm}
                >
                  Revoke
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Permissions Reference Table */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-7 h-7"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
                />
              </svg>
              Permissions Reference
            </h2>
            <p className="text-sm opacity-70 mb-6">
              Complete list of all available permissions organized by governance area
            </p>

            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th className="w-16">Index</th>
                    <th>Permission Name</th>
                    <th>Category</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSIONS.map(perm => (
                    <tr key={perm.index} className="hover">
                      <td className="font-mono font-bold">{perm.index}</td>
                      <td className="font-semibold">{perm.name}</td>
                      <td>
                        <div className="badge badge-outline badge-sm">{perm.category}</div>
                      </td>
                      <td className="text-sm opacity-70">{perm.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Transaction Status */}
        {writeErr && (
          <div className="alert alert-error mt-6">
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
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="flex flex-col gap-1">
              <span className="font-semibold">Transaction Error</span>
              <span className="font-mono text-sm opacity-90">
                {(writeErr as any)?.shortMessage ?? writeErr.message}
              </span>
            </span>
          </div>
        )}
        {txHash && (
          <div className="alert alert-info mt-6">
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
            <span>
              <div className="font-semibold">Transaction Submitted</div>
              <div className="font-mono text-xs opacity-80">{txHash}</div>
            </span>
          </div>
        )}
        {isMined && (
          <div className="alert alert-success mt-6">
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Transaction confirmed successfully!</span>
          </div>
        )}
      </div>
    </div>
  );
}
