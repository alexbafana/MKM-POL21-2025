"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import {
  AdminIcon,
  BlockchainIcon,
  CheckCircleIcon,
  CommitteeIcon,
  DataIcon,
  GovernanceIcon,
  LockIcon,
  UserIcon,
} from "~~/components/dao";
import { LoadingState } from "~~/components/dao/LoadingState";
import { Address } from "~~/components/scaffold-eth";
import deployedContracts from "~~/contracts/deployedContracts";
import { useDeployedContractInfo, useScaffoldEventHistory, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { getDkgExplorerUrl } from "~~/utils/dkg";

// ─── Constants ───────────────────────────────────────────────────────────────

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

const GRAPH_TYPE_LABELS = ["ARTICLES", "ENTITIES", "MENTIONS", "NLP", "ECONOMICS", "RELATIONS", "PROVENANCE"];
const DATASET_LABELS = ["ERR Online", "Ohtuleht Online", "Ohtuleht Print", "Ariregister"];

// ─── ABI Fragments ───────────────────────────────────────────────────────────

const GA_DATA_VALIDATION_ABI = [
  {
    type: "function",
    name: "getRDFGraphBasicInfo",
    stateMutability: "view",
    inputs: [{ name: "graphId", type: "bytes32" }],
    outputs: [
      { name: "graphHash", type: "bytes32" },
      { name: "graphURI", type: "string" },
      { name: "graphType", type: "uint8" },
      { name: "datasetVariant", type: "uint8" },
      { name: "year", type: "uint256" },
      { name: "version", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getRDFGraphMetadata",
    stateMutability: "view",
    inputs: [{ name: "graphId", type: "bytes32" }],
    outputs: [
      { name: "submitter", type: "address" },
      { name: "submittedAt", type: "uint256" },
      { name: "modelVersion", type: "string" },
      { name: "dkgAssetUAL", type: "string" },
    ],
  },
] as const;

// ─── Types ───────────────────────────────────────────────────────────────────

interface PublishedAsset {
  graphId: string;
  dkgAssetUAL: string;
  graphType: number;
  datasetVariant: number;
  year: number;
  version: number;
  submitter: string;
  submittedAt: number;
}

interface MemberStats {
  total: number;
  byRole: Record<number, number>;
}

interface ProposalStats {
  consortium: { total: number; passed: number; executed: number };
  validation: { total: number; passed: number; executed: number };
  dispute: { total: number; passed: number; executed: number };
}

// ─── Dashboard Page ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: mkmpContract } = useDeployedContractInfo({ contractName: "MKMPOL21" });
  const mkmpAddress = mkmpContract?.address;

  // State for assets (needs async loading)
  const [publishedAssets, setPublishedAssets] = useState<PublishedAsset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const assetsLoadedRef = useRef(false);

  // Role query
  const {
    data: roleRaw,
    isFetching,
    refetch,
  } = useScaffoldReadContract({
    contractName: "MKMPOL21",
    functionName: "hasRole",
    args: [address],
    watch: false, // Disable watch to prevent flickering
  });

  // Contract addresses
  const gaAddress = (deployedContracts as any)?.[chainId]?.GADataValidation?.address as `0x${string}` | undefined;

  // Event histories - with watch disabled to prevent flickering
  const { data: publishedEvents } = useScaffoldEventHistory({
    contractName: "GADataValidation",
    eventName: "RDFGraphPublishedToDKG",
    watch: false,
    fromBlock: 0n,
  });

  const { data: roleAssignedEvents } = useScaffoldEventHistory({
    contractName: "MKMPOL21",
    eventName: "RoleAssigned",
    watch: false,
    fromBlock: 0n,
  });

  const { data: submittedEvents } = useScaffoldEventHistory({
    contractName: "GADataValidation",
    eventName: "RDFGraphSubmitted",
    watch: false,
    fromBlock: 0n,
  });

  const { data: validatedEvents } = useScaffoldEventHistory({
    contractName: "GADataValidation",
    eventName: "RDFGraphValidated",
    watch: false,
    fromBlock: 0n,
  });

  const { data: approvedEvents } = useScaffoldEventHistory({
    contractName: "GADataValidation",
    eventName: "RDFGraphApproved",
    watch: false,
    fromBlock: 0n,
  });

  // Also check detailed validation events
  const { data: validatedDetailedEvents } = useScaffoldEventHistory({
    contractName: "GADataValidation",
    eventName: "RDFGraphValidatedDetailed",
    watch: false,
    fromBlock: 0n,
  });

  // Consortium proposal events
  const { data: consortiumProposalEvents } = useScaffoldEventHistory({
    contractName: "Consortium",
    eventName: "ProposalCreated",
    watch: false,
    fromBlock: 0n,
  });

  const { data: consortiumExecutedEvents } = useScaffoldEventHistory({
    contractName: "Consortium",
    eventName: "ProposalExecuted",
    watch: false,
    fromBlock: 0n,
  });

  // Validation Committee proposal events
  const { data: validationProposalEvents } = useScaffoldEventHistory({
    contractName: "ValidationCommittee",
    eventName: "ProposalCreated",
    watch: false,
    fromBlock: 0n,
  });

  const { data: validationExecutedEvents } = useScaffoldEventHistory({
    contractName: "ValidationCommittee",
    eventName: "ProposalExecuted",
    watch: false,
    fromBlock: 0n,
  });

  useEffect(() => {
    if (address) {
      refetch();
    }
  }, [address, chainId, refetch]);

  const { roleName, roleIndex, isOwner, isMember, isDataValidator } = useMemo(() => {
    const v = roleRaw !== undefined && roleRaw !== null ? Number(roleRaw) : 0;
    const idx = v & 31;
    return {
      roleIndex: idx,
      roleName: v === 0 ? "No Role" : (ROLE_LABELS[idx] ?? "Unknown"),
      isOwner: idx === 5 && v !== 0,
      isMember: v !== 0,
      isDataValidator: idx === 4 && v !== 0,
    };
  }, [roleRaw]);

  // Calculate member stats from role assigned events (useMemo to avoid re-renders)
  const memberStats = useMemo<MemberStats>(() => {
    if (!roleAssignedEvents) return { total: 0, byRole: {} };

    const membersByRole: Record<number, Set<string>> = {};

    for (const event of roleAssignedEvents) {
      const user = event.args?.user as string;
      const role = Number(event.args?.role || 0);
      const roleIdx = role & 31;

      if (!membersByRole[roleIdx]) {
        membersByRole[roleIdx] = new Set();
      }
      membersByRole[roleIdx].add(user.toLowerCase());
    }

    const byRole: Record<number, number> = {};
    const uniqueMembers = new Set<string>();

    for (const [roleIdx, members] of Object.entries(membersByRole)) {
      byRole[Number(roleIdx)] = members.size;
      members.forEach(m => uniqueMembers.add(m));
    }

    return { total: uniqueMembers.size, byRole };
  }, [roleAssignedEvents]);

  // Calculate data stats (useMemo to avoid re-renders)
  // Count both RDFGraphValidated and RDFGraphValidatedDetailed events
  const dataStats = useMemo(
    () => ({
      submitted: submittedEvents?.length || 0,
      validated: (validatedEvents?.length || 0) + (validatedDetailedEvents?.length || 0),
      approved: approvedEvents?.length || 0,
      published: publishedEvents?.length || 0,
    }),
    [submittedEvents, validatedEvents, validatedDetailedEvents, approvedEvents, publishedEvents],
  );

  // Calculate proposal stats (useMemo to avoid re-renders)
  const proposalStats = useMemo<ProposalStats>(
    () => ({
      consortium: {
        total: consortiumProposalEvents?.length || 0,
        passed: consortiumExecutedEvents?.length || 0,
        executed: consortiumExecutedEvents?.length || 0,
      },
      validation: {
        total: validationProposalEvents?.length || 0,
        passed: validationExecutedEvents?.length || 0,
        executed: validationExecutedEvents?.length || 0,
      },
      dispute: { total: 0, passed: 0, executed: 0 },
    }),
    [consortiumProposalEvents, consortiumExecutedEvents, validationProposalEvents, validationExecutedEvents],
  );

  // Fetch published asset details - only once when events load
  useEffect(() => {
    if (!publicClient || !gaAddress || !publishedEvents || assetsLoadedRef.current) {
      if (publishedEvents !== undefined) {
        setIsLoadingAssets(false);
      }
      return;
    }

    if (publishedEvents.length === 0) {
      setIsLoadingAssets(false);
      assetsLoadedRef.current = true;
      return;
    }

    let cancelled = false;
    assetsLoadedRef.current = true; // Mark as loading to prevent re-entry

    async function fetchAssetDetails() {
      const results: PublishedAsset[] = [];

      for (const event of publishedEvents!) {
        if (cancelled) return;

        const graphId = event.args?.graphId as string;
        const ual = (event.args?.dkgAssetUAL as string) || "";

        if (!graphId) continue;

        try {
          const [basicInfo, metadata] = await Promise.all([
            publicClient!.readContract({
              address: gaAddress!,
              abi: GA_DATA_VALIDATION_ABI,
              functionName: "getRDFGraphBasicInfo",
              args: [graphId as `0x${string}`],
            }),
            publicClient!.readContract({
              address: gaAddress!,
              abi: GA_DATA_VALIDATION_ABI,
              functionName: "getRDFGraphMetadata",
              args: [graphId as `0x${string}`],
            }),
          ]);

          results.push({
            graphId,
            dkgAssetUAL: ual || (metadata as any)[3] || "",
            graphType: Number((basicInfo as any)[2]),
            datasetVariant: Number((basicInfo as any)[3]),
            year: Number((basicInfo as any)[4]),
            version: Number((basicInfo as any)[5]),
            submitter: (metadata as any)[0],
            submittedAt: Number((metadata as any)[1]),
          });
        } catch (err) {
          console.warn(`Failed to fetch details for graph ${graphId}:`, err);
        }
      }

      if (!cancelled) {
        setPublishedAssets(results);
        setIsLoadingAssets(false);
      }
    }

    fetchAssetDetails();

    return () => {
      cancelled = true;
    };
  }, [publicClient, gaAddress, publishedEvents]);

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
              <h1 className="text-3xl font-bold mb-4">MKMPOL21 DAO</h1>
              <p className="text-base-content/70 mb-6">
                Public Data Governance for Estonian Media and Cultural Datasets
              </p>
              <p className="text-sm text-base-content/50">Connect your wallet to access the DAO dashboard</p>
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
        <LoadingState message="Loading dashboard..." size="lg" />
      </div>
    );
  }

  // Main Dashboard - Available to all connected users
  return (
    <div className="min-h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-secondary/5 to-accent/10 py-8 border-b border-base-300">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {isMember ? (
                  <div
                    className={`badge ${isOwner ? "badge-primary" : isDataValidator ? "badge-accent" : "badge-secondary"} badge-lg gap-2`}
                  >
                    {isOwner ? <AdminIcon className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                    {roleName}
                  </div>
                ) : (
                  <div className="badge badge-warning badge-lg gap-2">
                    <LockIcon className="w-4 h-4" />
                    Guest
                  </div>
                )}
              </div>
              <h1 className="text-3xl font-bold mb-1">DAO Dashboard</h1>
              <div className="flex items-center gap-2 text-base-content/70 text-sm">
                <Address address={address} />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {isOwner && (
                <Link href="/admin" className="btn btn-primary btn-sm gap-2">
                  <AdminIcon className="w-4 h-4" />
                  Manage Roles
                </Link>
              )}
              {(isDataValidator || isOwner) && (
                <Link href="/governance/data-validation" className="btn btn-accent btn-sm gap-2">
                  <DataIcon className="w-4 h-4" />
                  Validate Data
                </Link>
              )}
              {!isMember && (
                <Link href="/onboarding/individual" className="btn btn-primary btn-sm">
                  Join DAO
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Members */}
          <div className="stat bg-base-100 rounded-xl border border-base-300 shadow-sm p-4">
            <div className="stat-figure text-primary">
              <UserIcon className="w-8 h-8" />
            </div>
            <div className="stat-title text-xs">Total Members</div>
            <div className="stat-value text-2xl text-primary">{memberStats.total}</div>
            <div className="stat-desc text-xs">Active in DAO</div>
          </div>

          {/* Data Published */}
          <div className="stat bg-base-100 rounded-xl border border-base-300 shadow-sm p-4">
            <div className="stat-figure text-success">
              <CheckCircleIcon className="w-8 h-8" />
            </div>
            <div className="stat-title text-xs">Published to DKG</div>
            <div className="stat-value text-2xl text-success">{dataStats.published}</div>
            <div className="stat-desc text-xs">Knowledge assets</div>
          </div>

          {/* Proposals */}
          <div className="stat bg-base-100 rounded-xl border border-base-300 shadow-sm p-4">
            <div className="stat-figure text-accent">
              <GovernanceIcon className="w-8 h-8" />
            </div>
            <div className="stat-title text-xs">Proposals Executed</div>
            <div className="stat-value text-2xl text-accent">
              {proposalStats.consortium.executed + proposalStats.validation.executed}
            </div>
            <div className="stat-desc text-xs">Across committees</div>
          </div>

          {/* Data Validated */}
          <div className="stat bg-base-100 rounded-xl border border-base-300 shadow-sm p-4">
            <div className="stat-figure text-info">
              <DataIcon className="w-8 h-8" />
            </div>
            <div className="stat-title text-xs">Data Submitted</div>
            <div className="stat-value text-2xl text-info">{dataStats.submitted}</div>
            <div className="stat-desc text-xs">{dataStats.approved} approved</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Published Assets & Data Pipeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Published Knowledge Assets */}
            <div className="card bg-base-100 shadow-lg border border-base-300">
              <div className="card-body p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="card-title text-lg flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-success" />
                    Published Knowledge Assets
                  </h3>
                  <div className="badge badge-success">{dataStats.published} on DKG</div>
                </div>

                {isLoadingAssets ? (
                  <div className="flex justify-center py-8">
                    <LoadingState message="Loading assets..." size="sm" />
                  </div>
                ) : dataStats.published === 0 ? (
                  <div className="text-center py-8">
                    <DataIcon className="w-12 h-12 mx-auto mb-3 text-base-content/20" />
                    <p className="text-base-content/50 text-sm">No assets published yet</p>
                    <Link href="/governance/data-validation" className="btn btn-sm btn-outline mt-3">
                      See Data Being Validated
                    </Link>
                  </div>
                ) : publishedAssets.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircleIcon className="w-12 h-12 mx-auto mb-3 text-success/50" />
                    <p className="text-base-content/70 text-sm">{dataStats.published} asset(s) published to DKG</p>
                    <Link href="/governance/data-validation/published" className="btn btn-sm btn-success mt-3">
                      View Published Assets
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {publishedAssets.map(asset => (
                      <div
                        key={asset.graphId}
                        className="p-3 rounded-lg bg-base-200/50 border border-base-300 hover:border-success/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">
                                {GRAPH_TYPE_LABELS[asset.graphType] || "Unknown"}
                              </span>
                              <span className="badge badge-xs badge-outline">v{asset.version}</span>
                              <span className="badge badge-xs badge-success">Published</span>
                            </div>
                            <div className="text-xs text-base-content/50 mt-1">
                              {DATASET_LABELS[asset.datasetVariant]} • {asset.year}
                            </div>
                            {asset.dkgAssetUAL && (
                              <div className="mt-2">
                                <a
                                  href={getDkgExplorerUrl(asset.dkgAssetUAL)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-mono text-accent hover:underline truncate block max-w-[300px]"
                                  title={asset.dkgAssetUAL}
                                >
                                  {asset.dkgAssetUAL.slice(0, 50)}...
                                </a>
                              </div>
                            )}
                          </div>
                          <div className="text-right text-xs text-base-content/40">
                            {asset.submittedAt > 0 && new Date(asset.submittedAt * 1000).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Data Validation Pipeline */}
            <div className="card bg-base-100 shadow-lg border border-base-300">
              <div className="card-body p-5">
                <h3 className="card-title text-lg flex items-center gap-2 mb-4">
                  <DataIcon className="w-5 h-5 text-info" />
                  Data Validation Pipeline
                </h3>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex-1 min-w-[100px]">
                    <div className="text-center p-3 rounded-lg bg-base-200">
                      <div className="text-2xl font-bold text-info">{dataStats.submitted}</div>
                      <div className="text-xs text-base-content/60">Submitted</div>
                    </div>
                  </div>
                  <div className="text-base-content/30">→</div>
                  <div className="flex-1 min-w-[100px]">
                    <div className="text-center p-3 rounded-lg bg-base-200">
                      <div className="text-2xl font-bold text-warning">{dataStats.validated}</div>
                      <div className="text-xs text-base-content/60">Validated</div>
                    </div>
                  </div>
                  <div className="text-base-content/30">→</div>
                  <div className="flex-1 min-w-[100px]">
                    <div className="text-center p-3 rounded-lg bg-base-200">
                      <div className="text-2xl font-bold text-accent">{dataStats.approved}</div>
                      <div className="text-xs text-base-content/60">Approved</div>
                    </div>
                  </div>
                  <div className="text-base-content/30">→</div>
                  <div className="flex-1 min-w-[100px]">
                    <div className="text-center p-3 rounded-lg bg-success/10 border border-success/30">
                      <div className="text-2xl font-bold text-success">{dataStats.published}</div>
                      <div className="text-xs text-base-content/60">Published</div>
                    </div>
                  </div>
                </div>
                {(isDataValidator || isOwner || roleIndex === 0) && (
                  <div className="mt-4">
                    <Link href="/governance/data-validation" className="btn btn-sm btn-outline w-full">
                      View All Submissions
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Members, Committees, Actions */}
          <div className="space-y-6">
            {/* Member Distribution */}
            <div className="card bg-base-100 shadow-lg border border-base-300">
              <div className="card-body p-5">
                <h3 className="card-title text-lg flex items-center gap-2 mb-4">
                  <UserIcon className="w-5 h-5 text-primary" />
                  Members
                </h3>
                <div className="space-y-2">
                  {Object.entries(memberStats.byRole)
                    .filter(([, count]) => count > 0)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([roleIdx, count]) => (
                      <div key={roleIdx} className="flex items-center justify-between py-1.5 border-b border-base-200">
                        <span className="text-sm text-base-content/70">
                          {ROLE_LABELS[Number(roleIdx)] || `Role ${roleIdx}`}
                        </span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                  {Object.keys(memberStats.byRole).length === 0 && (
                    <div className="text-center py-4 text-base-content/50 text-sm">No members yet</div>
                  )}
                </div>
              </div>
            </div>

            {/* Committee Activity */}
            <div className="card bg-base-100 shadow-lg border border-base-300">
              <div className="card-body p-5">
                <h3 className="card-title text-lg flex items-center gap-2 mb-4">
                  <CommitteeIcon className="w-5 h-5 text-accent" />
                  Governance Committees
                </h3>
                <div className="space-y-3">
                  {/* Consortium */}
                  <Link
                    href="/committees/consortium"
                    className="block p-3 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Consortium</span>
                      <div className="badge badge-xs">{proposalStats.consortium.total} proposals</div>
                    </div>
                    <div className="text-xs text-base-content/50 mt-1">
                      {proposalStats.consortium.executed} executed
                    </div>
                  </Link>

                  {/* Validation Committee */}
                  <Link
                    href="/committees/validation"
                    className="block p-3 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Validation Committee</span>
                      <div className="badge badge-xs">{proposalStats.validation.total} proposals</div>
                    </div>
                    <div className="text-xs text-base-content/50 mt-1">
                      {proposalStats.validation.executed} executed
                    </div>
                  </Link>

                  {/* Dispute Resolution */}
                  <Link
                    href="/committees/dispute"
                    className="block p-3 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Dispute Resolution</span>
                      <div className="badge badge-xs">{proposalStats.dispute.total} proposals</div>
                    </div>
                    <div className="text-xs text-base-content/50 mt-1">{proposalStats.dispute.executed} resolved</div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card bg-base-100 shadow-lg border border-base-300">
              <div className="card-body p-5">
                <h3 className="card-title text-lg flex items-center gap-2 mb-4">
                  <BlockchainIcon className="w-5 h-5 text-warning" />
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  {!isMember && (
                    <>
                      <Link href="/onboarding/individual" className="btn btn-primary btn-sm w-full">
                        Join as Individual
                      </Link>
                      <Link href="/onboarding/institution" className="btn btn-outline btn-sm w-full">
                        Join as Institution
                      </Link>
                    </>
                  )}
                  {/* Submit Data - only for Member Institution (roleIndex 0 with actual role) or Owner */}
                  {((isMember && roleIndex === 0) || isOwner) && (
                    <Link href="/data-provision" className="btn btn-success btn-sm w-full gap-2">
                      <DataIcon className="w-4 h-4" />
                      Submit Data
                    </Link>
                  )}
                  {/* Validate Data - only for Data Validators and Owner */}
                  {(isDataValidator || isOwner) && (
                    <Link href="/governance/data-validation" className="btn btn-accent btn-sm w-full gap-2">
                      <CheckCircleIcon className="w-4 h-4" />
                      Validate Data
                    </Link>
                  )}
                  {/* View Published Assets - visible to all members */}
                  {isMember && (
                    <Link href="/governance/data-validation/published" className="btn btn-success btn-sm w-full gap-2">
                      <BlockchainIcon className="w-4 h-4" />
                      View Published Assets
                    </Link>
                  )}
                  {/* Artifact Integrity - only for Data Validators and Owner */}
                  {(isDataValidator || isOwner) && (
                    <Link href="/artifact-integrity" className="btn btn-info btn-sm w-full gap-2">
                      <CheckCircleIcon className="w-4 h-4" />
                      Artifact Integrity
                    </Link>
                  )}
                  <Link href="/committees" className="btn btn-outline btn-sm w-full">
                    View All Committees
                  </Link>
                  {isOwner && (
                    <Link href="/debug" className="btn btn-ghost btn-sm w-full">
                      Debug Contracts
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Contract Info */}
            <div className="card bg-base-100 shadow-lg border border-base-300">
              <div className="card-body p-5">
                <h3 className="card-title text-sm flex items-center gap-2 mb-3">
                  <BlockchainIcon className="w-4 h-4 text-base-content/50" />
                  Contracts
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-base-content/50">MKMPOL21</span>
                    {mkmpAddress && <Address address={mkmpAddress} size="xs" />}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-base-content/50">Data Validation</span>
                    {gaAddress && <Address address={gaAddress} size="xs" />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
