"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { encodeFunctionData, zeroAddress } from "viem";
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
  return deployedContracts?.[chainId]?.contracts?.MKMPOL21?.address as `0x${string}` | undefined;
};

const ROLE_LABELS: Record<number, string> = {
  0: "Member_Institution",
  1: "Ordinary_User",
  2: "MFSSIA_Guardian_Agent",
  3: "Eliza_Data_Extractor_Agent",
  4: "Data_Validator",
  5: "MKMPOL21Owner",
  6: "Consortium",
  7: "Validation_Committee",
  8: "Dispute_Resolution_Board",
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

  const { roleValue, roleIndex, roleName, isOwner, isMember } = useMemo(() => {
    const v = roleRaw ? Number(roleRaw as bigint) : 0;
    const idx = v & 31;
    return {
      roleValue: v,
      roleIndex: idx,
      roleName: ROLE_LABELS[idx] ?? "No role",
      isOwner: idx === 5,
      isMember: v !== 0, // any non-zero role is considered a member
    };
  }, [roleRaw]);

  // Quick-grant calldata (Ordinary_User = 1153)
  const [copied, setCopied] = useState(false);
  const calldata = useMemo(() => {
    if (!address) return "—";
    return encodeFunctionData({
      abi: MKMP_ABI,
      functionName: "assignRole",
      args: [address, 1153],
    });
  }, [address]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(calldata);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-base-200">
      {/* Hero */}
      <section className="hero py-14">
        <div className="hero-content text-center">
          <div className="max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              Public data governance, <span className="text-primary">transparently</span> coordinated.
            </h1>
            <p className="mt-4 text-lg opacity-80">
              Connect your wallet to see your role and navigate to Committees and Role Management.
            </p>
          </div>
        </div>
      </section>

      <main className="px-6 pb-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Card */}
          <div className="card bg-base-100 shadow-md lg:col-span-1">
            <div className="card-body">
              <h2 className="card-title">Your Status</h2>
              <div className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="opacity-70">Network</span>
                  <span className="font-medium">{chainId ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Address</span>
                  <span className="font-medium">{address ? <Address address={address} /> : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">MKMPOL21</span>
                  <span className="font-medium">
                    {mkmpAddress ? <Address address={mkmpAddress} /> : "not deployed on this chain"}
                  </span>
                </div>
                <div className="divider my-2" />
                <div className="flex justify-between">
                  <span className="opacity-70">Role Value</span>
                  <span className="font-medium">{isFetching ? "…" : roleValue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Role Index</span>
                  <span className="font-medium">{isFetching ? "…" : roleIndex}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Role Name</span>
                  <span className="font-medium">{isFetching ? "…" : roleName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">DAO Membership</span>
                  <span className="font-medium">{isMember ? "Member" : "Not a member"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main actions + Governance Areas */}
          <div className="lg:col-span-2 grid grid-cols-1 gap-6">
            {/* Conditional owner CTA */}
            <div className="card bg-base-100 shadow-md">
              <div className="card-body">
                <h2 className="card-title">Get Started</h2>
                {address && mkmpAddress && isOwner ? (
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <p className="opacity-80">
                      You are <b>Owner</b>. Manage roles, permissions, and committees.
                    </p>
                    <div className="flex gap-3">
                      <Link href="/roles-permissions" className="btn btn-primary">
                        Roles &amp; Permissions
                      </Link>
                      <Link href="/committees" className="btn btn-ghost">
                        Committees
                      </Link>
                      <Link href="/debug" className="btn btn-ghost">
                        Debug
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <p className="opacity-80">
                      Not a member yet? Ask an Owner to grant you <b>Ordinary_User</b>.
                    </p>
                    <div className="rounded-box bg-base-200 p-4 text-sm">
                      <div className="opacity-70 mb-2">Owner quick-grant calldata (assignRole)</div>
                      <pre className="whitespace-pre-wrap break-all text-xs bg-base-300 p-3 rounded-box">{`to:      ${mkmpAddress ?? "—"}
method:  assignRole(address _user, uint32 _role)
args:    ["${address ?? "0x"}", 1153]  // Ordinary_User
data:    ${address ? calldata : "—"}`}</pre>
                      <div className="flex gap-2">
                        <button className="btn btn-sm btn-outline" onClick={onCopy} disabled={!address}>
                          {copied ? "Copied ✓" : "Copy data"}
                        </button>
                        <Link href="/debug" className="btn btn-sm btn-ghost">
                          Inspect Contracts
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Governance Areas */}
            <div className="card bg-base-100 shadow-md">
              <div className="card-body">
                <h2 className="card-title">Governance Areas</h2>
                <div className="join join-vertical w-full">
                  <div className="collapse collapse-arrow join-item border border-base-300">
                    <input type="checkbox" />
                    <div className="collapse-title text-lg font-medium">Dispute Resolution</div>
                    <div className="collapse-content">
                      <p className="opacity-80 mb-3">
                        Open, modify, and accept revisions to data points (permissions 0–3).
                      </p>
                      <Link href="/governance/dispute-resolution" className="btn btn-sm btn-primary">
                        Open
                      </Link>
                    </div>
                  </div>

                  <div className="collapse collapse-arrow join-item border border-base-300">
                    <input type="checkbox" />
                    <div className="collapse-title text-lg font-medium">Data Validation</div>
                    <div className="collapse-content">
                      <p className="opacity-80 mb-3">
                        Submit/edit inclusion proposals, reject or inspect data (perm 6–10).
                      </p>
                      <Link href="/governance/data-validation" className="btn btn-sm btn-primary">
                        Open
                      </Link>
                    </div>
                  </div>

                  <div className="collapse collapse-arrow join-item border border-base-300">
                    <input type="checkbox" />
                    <div className="collapse-title text-lg font-medium">DAO Management</div>
                    <div className="collapse-content">
                      <p className="opacity-80 mb-3">Modify statute and upgrade PM / GA contracts (perm 4–5).</p>
                      <Link href="/governance/dao-management" className="btn btn-sm btn-primary">
                        Open
                      </Link>
                    </div>
                  </div>

                  <div className="collapse collapse-arrow join-item border border-base-300">
                    <input type="checkbox" />
                    <div className="collapse-title text-lg font-medium">Data Access</div>
                    <div className="collapse-content">
                      <p className="opacity-80 mb-3">Submit queries to the Eliza agent (perm 22).</p>
                      <Link href="/governance/data-access" className="btn btn-sm btn-primary">
                        Open
                      </Link>
                    </div>
                  </div>

                  <div className="collapse collapse-arrow join-item border border-base-300">
                    <input type="checkbox" />
                    <div className="collapse-title text-lg font-medium">Membership</div>
                    <div className="collapse-content">
                      <p className="opacity-80 mb-3">Onboard/Remove members and institutions (perm 18–21).</p>
                      <Link href="/governance/membership" className="btn btn-sm btn-primary">
                        Open
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
