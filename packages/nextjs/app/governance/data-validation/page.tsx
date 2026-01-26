"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { CheckCircleIcon, DataIcon, GovernanceIcon, LockIcon, SpinnerIcon } from "~~/components/dao";
import { LoadingState } from "~~/components/dao/LoadingState";
import { Address } from "~~/components/scaffold-eth";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldEventHistory, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useRDFProposals } from "~~/hooks/useRDFProposals";
import type { PublishStep } from "~~/services/DKGPublisherService";

// ─── Constants ───────────────────────────────────────────────────────────────

const GRAPH_TYPE_LABELS = ["ARTICLES", "ENTITIES", "MENTIONS", "NLP", "ECONOMICS", "RELATIONS", "PROVENANCE"];
const DATASET_LABELS = ["ERR Online", "Ohtuleht Online", "Ohtuleht Print", "Ariregister"];

const ROLE_LABELS: Record<number, string> = {
  0: "Member Institution",
  1: "Ordinary User",
  4: "Data Validator",
  5: "MKMPOL21 Owner",
};

type LifecycleStage = "All" | "Submitted" | "Validated" | "In Review" | "Approved" | "Published" | "Rejected";

const LIFECYCLE_TABS: LifecycleStage[] = [
  "All",
  "Submitted",
  "Validated",
  "In Review",
  "Approved",
  "Published",
  "Rejected",
];

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
    name: "getGraphStatus",
    stateMutability: "view",
    inputs: [{ name: "graphId", type: "bytes32" }],
    outputs: [
      { name: "exists", type: "bool" },
      { name: "validated", type: "bool" },
      { name: "approved", type: "bool" },
      { name: "published", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "getValidationDetails",
    stateMutability: "view",
    inputs: [{ name: "graphId", type: "bytes32" }],
    outputs: [
      { name: "syntaxValid", type: "bool" },
      { name: "semanticValid", type: "bool" },
      { name: "overallValid", type: "bool" },
      { name: "validationErrors", type: "string" },
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

interface GraphDetails {
  graphId: string;
  graphURI: string;
  graphType: number;
  datasetVariant: number;
  year: number;
  version: number;
  submitter: string;
  submittedAt: number;
  modelVersion: string;
  dkgAssetUAL: string;
  exists: boolean;
  validated: boolean;
  approved: boolean;
  published: boolean;
  syntaxValid: boolean;
  semanticValid: boolean;
  overallValid: boolean;
  validationErrors: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLifecycleStage(details: GraphDetails | undefined, proposalState: string | undefined): LifecycleStage {
  if (!details || !details.exists) return "Submitted";
  if (proposalState === "Defeated") return "Rejected";
  if (details.published) return "Published";
  if (details.approved) return "Approved";
  if (proposalState && ["Pending", "Active", "Succeeded"].includes(proposalState)) return "In Review";
  if (details.validated) return "Validated";
  return "Submitted";
}

const STAGE_ORDER: LifecycleStage[] = ["Submitted", "Validated", "In Review", "Approved", "Published"];

function getStageIndex(stage: LifecycleStage): number {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx >= 0 ? idx : 0;
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function DataValidationPage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [activeTab, setActiveTab] = useState<LifecycleStage>("All");
  const [graphDetails, setGraphDetails] = useState<Map<string, GraphDetails>>(new Map());
  const [isLoadingGraphs, setIsLoadingGraphs] = useState(true);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [publishingGraphId, setPublishingGraphId] = useState<string | null>(null);
  const [publishSteps, setPublishSteps] = useState<PublishStep[]>([]);
  const [publishError, setPublishError] = useState<string | null>(null);
  const fetchedIdsRef = useRef<Set<string>>(new Set());

  // Role check
  const { data: roleRaw, isFetching: isFetchingRole } = useScaffoldReadContract({
    contractName: "MKMPOL21",
    functionName: "hasRole",
    args: [address],
    watch: true,
  });

  const roleValue = roleRaw !== undefined && roleRaw !== null ? Number(roleRaw) : 0;
  const roleIndex = roleValue & 31;
  const roleName = roleValue === 0 ? "No Role" : (ROLE_LABELS[roleIndex] ?? "Unknown");
  const isOwner = roleIndex === 5 && roleValue !== 0;
  // Allowed: Member Institution (0), Ordinary User (1), Data Validator (4), Owner (5)
  const hasAccess = roleValue !== 0 && [0, 1, 4, 5].includes(roleIndex);

  // Proposals
  const { proposals } = useRDFProposals();

  // Contract addresses
  const gaAddress = (deployedContracts as any)?.[chainId]?.GADataValidation?.address as `0x${string}` | undefined;

  // Fetch submitted RDF graphs
  const { data: submittedEvents } = useScaffoldEventHistory({
    contractName: "GADataValidation",
    eventName: "RDFGraphSubmitted",
    watch: false,
    fromBlock: 0n,
  });

  const graphIds = submittedEvents?.map(e => e.args?.graphId as string).filter(Boolean) || [];
  const graphIdsKey = graphIds.join(",");

  // Fetch graph details
  useEffect(() => {
    if (!publicClient || !gaAddress || graphIds.length === 0) {
      if (!hasFetchedOnce && graphIds.length === 0 && submittedEvents !== undefined) {
        setIsLoadingGraphs(false);
        setHasFetchedOnce(true);
      }
      return;
    }

    const newIds = graphIds.filter(id => !fetchedIdsRef.current.has(id));
    if (newIds.length === 0) {
      setIsLoadingGraphs(false);
      setHasFetchedOnce(true);
      return;
    }

    let cancelled = false;

    async function fetchNewDetails() {
      if (!hasFetchedOnce) setIsLoadingGraphs(true);

      for (const graphId of newIds) {
        if (cancelled) return;
        try {
          const [basicInfo, status, validation, metadata] = await Promise.all([
            publicClient!.readContract({
              address: gaAddress!,
              abi: GA_DATA_VALIDATION_ABI,
              functionName: "getRDFGraphBasicInfo",
              args: [graphId as `0x${string}`],
            }),
            publicClient!.readContract({
              address: gaAddress!,
              abi: GA_DATA_VALIDATION_ABI,
              functionName: "getGraphStatus",
              args: [graphId as `0x${string}`],
            }),
            publicClient!.readContract({
              address: gaAddress!,
              abi: GA_DATA_VALIDATION_ABI,
              functionName: "getValidationDetails",
              args: [graphId as `0x${string}`],
            }),
            publicClient!.readContract({
              address: gaAddress!,
              abi: GA_DATA_VALIDATION_ABI,
              functionName: "getRDFGraphMetadata",
              args: [graphId as `0x${string}`],
            }),
          ]);

          if (cancelled) return;

          const detail: GraphDetails = {
            graphId,
            graphURI: (basicInfo as any)[1],
            graphType: Number((basicInfo as any)[2]),
            datasetVariant: Number((basicInfo as any)[3]),
            year: Number((basicInfo as any)[4]),
            version: Number((basicInfo as any)[5]),
            submitter: (metadata as any)[0],
            submittedAt: Number((metadata as any)[1]),
            modelVersion: (metadata as any)[2],
            dkgAssetUAL: (metadata as any)[3],
            exists: (status as any)[0],
            validated: (status as any)[1],
            approved: (status as any)[2],
            published: (status as any)[3],
            syntaxValid: (validation as any)[0],
            semanticValid: (validation as any)[1],
            overallValid: (validation as any)[2],
            validationErrors: (validation as any)[3],
          };

          fetchedIdsRef.current.add(graphId);
          setGraphDetails(prev => {
            const next = new Map(prev);
            next.set(graphId, detail);
            return next;
          });
        } catch (err) {
          console.warn(`Failed to fetch details for graph ${graphId}:`, err);
          fetchedIdsRef.current.add(graphId);
        }
      }

      if (!cancelled) {
        setIsLoadingGraphs(false);
        setHasFetchedOnce(true);
      }
    }

    fetchNewDetails();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, gaAddress, graphIdsKey]);

  // Compute lifecycle for each graph
  const graphsWithStage = graphIds.map(graphId => {
    const details = graphDetails.get(graphId);
    const proposal = proposals.get(graphId);
    const stage = getLifecycleStage(details, proposal?.state);
    return { graphId, details, proposal, stage };
  });

  // Filter by active tab
  const filteredGraphs = activeTab === "All" ? graphsWithStage : graphsWithStage.filter(g => g.stage === activeTab);

  // Summary stats
  const stats = {
    total: graphsWithStage.length,
    validated: graphsWithStage.filter(g => g.details?.validated).length,
    approved: graphsWithStage.filter(g => g.stage === "Approved" || g.stage === "Published").length,
    published: graphsWithStage.filter(g => g.stage === "Published").length,
  };

  // DKG Publish handler
  const handlePublish = useCallback(async (graphId: string) => {
    setPublishingGraphId(graphId);
    setPublishSteps([]);
    setPublishError(null);

    try {
      const res = await fetch("/api/dkg-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", graphId }),
      });

      const result = await res.json();

      if (result.steps) {
        setPublishSteps(result.steps);
      }

      if (!result.success) {
        setPublishError(result.error || "DKG publication failed");
      } else {
        // Update local graph details with new UAL
        setGraphDetails(prev => {
          const next = new Map(prev);
          const existing = next.get(graphId);
          if (existing) {
            next.set(graphId, {
              ...existing,
              published: true,
              dkgAssetUAL: result.dkgAssetUAL || "",
            });
          }
          return next;
        });
      }
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Failed to call DKG publish API");
    } finally {
      setPublishingGraphId(null);
    }
  }, []);

  // ─── Access Control ──────────────────────────────────────────────────────────

  if (!address) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <div className="max-w-lg mx-auto text-center px-6">
          <div className="card bg-base-100 shadow-xl border border-base-300">
            <div className="card-body">
              <GovernanceIcon className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold mb-2">Connect Wallet</h2>
              <p className="text-base-content/70">Connect your wallet to access the Data Validation overview.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isFetchingRole) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <LoadingState message="Checking your role..." size="lg" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <div className="max-w-lg mx-auto text-center px-6">
          <div className="card bg-base-100 shadow-xl border border-error/30">
            <div className="card-body">
              <LockIcon className="w-12 h-12 mx-auto mb-4 text-error" />
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p className="text-base-content/70 mb-4">
                This page is only accessible to Member Institutions, Ordinary Users, Data Validators, and the Owner.
              </p>
              <Link href="/dashboard" className="btn btn-outline">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Page ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="bg-gradient-to-r from-accent/10 via-primary/5 to-success/10 py-10 border-b border-base-300">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link href="/dashboard" className="btn btn-ghost btn-sm gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  Dashboard
                </Link>
                <div className="badge badge-outline">{roleName}</div>
              </div>
              <h1 className="text-3xl font-bold mb-1">Data Validation Overview</h1>
              <p className="text-base-content/60 text-sm">
                Track RDF graph submissions through validation, committee review, and DKG publication
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-base-content/60">
              <Address address={address} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="stat bg-base-100 rounded-xl border border-base-300 shadow-sm p-4">
            <div className="stat-title text-xs">Total Submitted</div>
            <div className="stat-value text-2xl">{stats.total}</div>
          </div>
          <div className="stat bg-base-100 rounded-xl border border-base-300 shadow-sm p-4">
            <div className="stat-title text-xs">Validated</div>
            <div className="stat-value text-2xl text-info">{stats.validated}</div>
          </div>
          <div className="stat bg-base-100 rounded-xl border border-base-300 shadow-sm p-4">
            <div className="stat-title text-xs">Committee Approved</div>
            <div className="stat-value text-2xl text-success">{stats.approved}</div>
          </div>
          <div className="stat bg-base-100 rounded-xl border border-base-300 shadow-sm p-4">
            <div className="stat-title text-xs">Published to DKG</div>
            <div className="stat-value text-2xl text-accent">{stats.published}</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="tabs tabs-boxed bg-base-200 mb-6 flex-wrap">
          {LIFECYCLE_TABS.map(tab => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? "tab-active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab !== "All" && (
                <span className="ml-1.5 badge badge-sm badge-ghost">
                  {graphsWithStage.filter(g => g.stage === tab).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoadingGraphs && !hasFetchedOnce && (
          <div className="flex items-center justify-center py-12">
            <LoadingState message="Loading RDF graph data..." />
          </div>
        )}

        {/* Empty state */}
        {hasFetchedOnce && graphIds.length === 0 && (
          <div className="text-center py-16">
            <DataIcon className="w-16 h-16 mx-auto mb-4 text-base-content/20" />
            <p className="text-base-content/60 text-lg">No RDF graphs submitted yet</p>
            <p className="text-sm text-base-content/40 mt-2">
              Submit an RDF graph from the Data Provision page to see it here
            </p>
            {(roleIndex === 0 || roleIndex === 5) && (
              <Link href="/data-provision" className="btn btn-primary btn-sm mt-4">
                Go to Data Provision
              </Link>
            )}
          </div>
        )}

        {/* No results for filter */}
        {hasFetchedOnce && graphIds.length > 0 && filteredGraphs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-base-content/60">No graphs in the &ldquo;{activeTab}&rdquo; stage</p>
          </div>
        )}

        {/* Graph Cards */}
        <div className="space-y-4">
          {filteredGraphs.map(({ graphId, details, proposal, stage }) => {
            const stageIdx = stage === "Rejected" ? -1 : getStageIndex(stage);
            const isPublishing = publishingGraphId === graphId;

            return (
              <div key={graphId} className="card bg-base-100 border border-base-300 shadow-sm">
                <div className="card-body p-5">
                  {/* Header */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-base">
                        {details ? GRAPH_TYPE_LABELS[details.graphType] || "Unknown" : "Loading..."} Graph
                        {details && <span className="font-normal text-base-content/50 ml-2">v{details.version}</span>}
                      </h4>
                      <div className="font-mono text-xs text-base-content/40 mt-0.5">
                        {graphId.slice(0, 10)}...{graphId.slice(-8)}
                      </div>
                    </div>
                    <div
                      className={`badge ${
                        stage === "Published"
                          ? "badge-accent"
                          : stage === "Approved"
                            ? "badge-success"
                            : stage === "In Review"
                              ? "badge-primary"
                              : stage === "Validated"
                                ? "badge-info"
                                : stage === "Rejected"
                                  ? "badge-error"
                                  : "badge-ghost"
                      }`}
                    >
                      {stage}
                    </div>
                  </div>

                  {/* Details grid */}
                  {details && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-1 mt-3 text-xs">
                      <div>
                        <span className="text-base-content/50">URI:</span>{" "}
                        <span className="font-mono">{details.graphURI}</span>
                      </div>
                      <div>
                        <span className="text-base-content/50">Dataset:</span>{" "}
                        {DATASET_LABELS[details.datasetVariant] || "Unknown"}
                      </div>
                      <div>
                        <span className="text-base-content/50">Year:</span> {details.year}
                      </div>
                      <div>
                        <span className="text-base-content/50">Model:</span> {details.modelVersion || "N/A"}
                      </div>
                      <div>
                        <span className="text-base-content/50">Submitter:</span>{" "}
                        <span className="font-mono">
                          {details.submitter.slice(0, 6)}...{details.submitter.slice(-4)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Lifecycle stepper */}
                  <div className="mt-4 pt-3 border-t border-base-200">
                    <div className="flex items-center gap-1 text-xs">
                      {STAGE_ORDER.map((s, i) => {
                        const isActive = stage !== "Rejected" && stageIdx >= i;
                        const isCurrent = stage !== "Rejected" && stageIdx === i;
                        return (
                          <div key={s} className="flex items-center gap-1">
                            {i > 0 && <div className={`w-6 h-0.5 ${isActive ? "bg-success" : "bg-base-300"}`} />}
                            <div className="flex items-center gap-1">
                              <div
                                className={`w-2.5 h-2.5 rounded-full ${
                                  isActive ? "bg-success" : "bg-base-300"
                                } ${isCurrent ? "ring-2 ring-success/30" : ""}`}
                              />
                              <span
                                className={`hidden sm:inline ${
                                  isActive ? "text-base-content font-medium" : "text-base-content/40"
                                }`}
                              >
                                {s}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {stage === "Rejected" && (
                        <div className="flex items-center gap-1 ml-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-error ring-2 ring-error/30" />
                          <span className="text-error font-medium">Rejected</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Validation details */}
                  {details?.validated && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <div className={`badge badge-sm ${details.syntaxValid ? "badge-success" : "badge-error"} gap-1`}>
                        Syntax {details.syntaxValid ? "Pass" : "Fail"}
                      </div>
                      <div
                        className={`badge badge-sm ${details.semanticValid ? "badge-success" : "badge-warning"} gap-1`}
                      >
                        Semantic {details.semanticValid ? "Pass" : "Warnings"}
                      </div>
                      {details.validationErrors && (
                        <span className="text-xs text-error">{details.validationErrors}</span>
                      )}
                    </div>
                  )}

                  {/* Proposal / Committee status */}
                  {proposal && (
                    <div className="mt-3 pt-3 border-t border-base-200">
                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        <span className="text-base-content/60">Committee:</span>
                        <div
                          className={`badge badge-sm ${
                            proposal.state === "Active"
                              ? "badge-primary"
                              : proposal.state === "Succeeded"
                                ? "badge-success"
                                : proposal.state === "Executed"
                                  ? "badge-accent"
                                  : proposal.state === "Defeated"
                                    ? "badge-error"
                                    : "badge-ghost"
                          }`}
                        >
                          {proposal.state}
                        </div>
                        <div className="flex gap-3">
                          <span className="text-success font-semibold">
                            For: {formatEther(proposal.votes.forVotes)}
                          </span>
                          <span className="text-error font-semibold">
                            Against: {formatEther(proposal.votes.againstVotes)}
                          </span>
                          <span className="text-base-content/50">
                            Abstain: {formatEther(proposal.votes.abstainVotes)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rejected banner */}
                  {stage === "Rejected" && (
                    <div className="mt-3 p-3 rounded-lg bg-error/10 border border-error/20">
                      <div className="flex items-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-4 h-4 text-error shrink-0"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                          />
                        </svg>
                        <span className="text-sm font-semibold text-error">Validation Rejected</span>
                      </div>
                      <p className="text-xs text-base-content/70 mt-1">
                        The Validation Committee has rejected this RDF graph. The data provider may revise and resubmit.
                      </p>
                    </div>
                  )}

                  {/* DKG Publication section */}
                  {details?.approved && !details.published && stage !== "Rejected" && (
                    <div className="mt-3 pt-3 border-t border-base-200">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs text-base-content/60">Ready for DKG publication</div>
                        {isOwner && (
                          <button
                            className="btn btn-sm btn-accent gap-1"
                            disabled={isPublishing}
                            onClick={() => handlePublish(graphId)}
                          >
                            {isPublishing ? (
                              <>
                                <SpinnerIcon className="w-3 h-3" />
                                Publishing...
                              </>
                            ) : (
                              <>
                                <DataIcon className="w-3 h-3" />
                                Publish to DKG
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Publish steps progress */}
                      {isPublishing && publishSteps.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {publishSteps.map((step, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              {step.status === "completed" && (
                                <CheckCircleIcon className="w-3 h-3 text-success shrink-0" />
                              )}
                              {step.status === "in_progress" && (
                                <SpinnerIcon className="w-3 h-3 text-primary shrink-0" />
                              )}
                              {step.status === "failed" && (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                  stroke="currentColor"
                                  className="w-3 h-3 text-error shrink-0"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                              {step.status === "pending" && (
                                <div className="w-3 h-3 rounded-full bg-base-300 shrink-0" />
                              )}
                              <span className={step.status === "failed" ? "text-error" : "text-base-content/70"}>
                                {step.name}
                                {step.message && ` - ${step.message}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Publish error */}
                      {publishError && publishingGraphId === null && (
                        <div className="mt-2 text-xs text-error">{publishError}</div>
                      )}
                    </div>
                  )}

                  {/* Published / UAL display */}
                  {details?.published && (
                    <div className="mt-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircleIcon className="w-4 h-4 text-accent" />
                        <span className="font-semibold text-sm text-accent">Published to DKG</span>
                      </div>
                      {details.dkgAssetUAL && (
                        <div className="text-xs text-base-content/70">
                          <span className="text-base-content/50">UAL:</span>{" "}
                          <span className="font-mono break-all">{details.dkgAssetUAL}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
