"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { zeroAddress } from "viem";
import { useAccount, useChainId, usePublicClient, useReadContract } from "wagmi";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  DataIcon,
  LockIcon,
  SearchIcon,
  SpinnerIcon,
  UploadIcon,
  XCircleIcon,
} from "~~/components/dao";
import { LoadingState } from "~~/components/dao/LoadingState";
import { Address } from "~~/components/scaffold-eth";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldEventHistory, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

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

const GRAPH_TYPE_NAMES = ["ARTICLES", "ENTITIES", "MENTIONS", "NLP", "ECONOMICS", "RELATIONS", "PROVENANCE"];
const DATASET_NAMES = ["ERR Online", "\u00d5htuleht Online", "\u00d5htuleht Print", "\u00c4riregister"];

interface RDFGraphSummary {
  graphId: string;
  graphURI: string;
  graphHash: string;
  graphType: number;
  datasetVariant: number;
  year: number;
  version: number;
  submitter: string;
  submittedAt: number;
  validated: boolean;
  syntaxValid: boolean;
  semanticValid: boolean;
  validationErrors: string;
  committeeApproved: boolean;
  publishedToDKG: boolean;
  modelVersion: string;
  dkgAssetUAL: string;
}

interface DKGPublishStep {
  name: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  message: string;
  timestamp: string;
}

/**
 * RDF Review Page - For Validation Committee
 * Allows committee members to review and approve submitted RDF graphs
 * Only accessible to Validation Committee role (index 7)
 */
export default function RDFReviewPage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const mkmpAddress = useMkmpAddress();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "GADataValidation" });

  const [graphs, setGraphs] = useState<RDFGraphSummary[]>([]);
  const [isLoadingGraphs, setIsLoadingGraphs] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [manualGraphId, setManualGraphId] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);

  // TTL content preview
  const [ttlContent, setTtlContent] = useState<Record<string, string>>({});
  const [loadingContent, setLoadingContent] = useState<string | null>(null);
  const [showContent, setShowContent] = useState<string | null>(null);

  // DKG publish state
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishSteps, setPublishSteps] = useState<DKGPublishStep[]>([]);
  const [showPublishPanel, setShowPublishPanel] = useState<string | null>(null);

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

  const { data: rdfGraphCount } = useScaffoldReadContract({
    contractName: "GADataValidation",
    functionName: "rdfGraphCount",
    watch: true,
  });

  // Query RDFGraphSubmitted events
  const { data: submittedEvents } = useScaffoldEventHistory({
    contractName: "GADataValidation",
    eventName: "RDFGraphSubmitted",
    fromBlock: 0n,
    watch: true,
  });

  useEffect(() => {
    if (address && mkmpAddress) refetch();
  }, [address, mkmpAddress, chainId, refetch]);

  const { roleIndex, isAuthorized, isOwner } = useMemo(() => {
    const v = roleRaw ? Number(roleRaw) : 0;
    const idx = v & 31;
    return {
      roleIndex: idx,
      isAuthorized: v !== 0 && (idx === 7 || idx === 5),
      isOwner: v !== 0 && idx === 5,
    };
  }, [roleRaw]);

  // Fetch graph details from contract for a given graphId
  const fetchGraphDetails = useCallback(
    async (graphId: string): Promise<RDFGraphSummary | null> => {
      if (!publicClient) return null;

      const contractAddress = deployedContracts?.[chainId as keyof typeof deployedContracts]?.GADataValidation
        ?.address as `0x${string}` | undefined;
      const contractAbi = deployedContracts?.[chainId as keyof typeof deployedContracts]?.GADataValidation?.abi;

      if (!contractAddress || !contractAbi) return null;

      try {
        const [basicInfo, metadata, status, validationDetails] = await Promise.all([
          publicClient.readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: "getRDFGraphBasicInfo",
            args: [graphId as `0x${string}`],
          }) as Promise<[string, string, number, number, bigint, bigint]>,
          publicClient.readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: "getRDFGraphMetadata",
            args: [graphId as `0x${string}`],
          }) as Promise<[string, bigint, string, string]>,
          publicClient.readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: "getGraphStatus",
            args: [graphId as `0x${string}`],
          }) as Promise<[boolean, boolean, boolean, boolean]>,
          publicClient.readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: "getValidationDetails",
            args: [graphId as `0x${string}`],
          }) as Promise<[boolean, boolean, boolean, string]>,
        ]);

        const [graphHash, graphURI, graphType, datasetVariant, year, version] = basicInfo;
        const [submitter, submittedAt, modelVersion, dkgAssetUAL] = metadata;
        const [exists, , approved, published] = status;
        const [syntaxValid, semanticValid, overallValid, validationErrors] = validationDetails;

        if (!exists) return null;

        return {
          graphId,
          graphURI,
          graphHash,
          graphType: Number(graphType),
          datasetVariant: Number(datasetVariant),
          year: Number(year),
          version: Number(version),
          submitter,
          submittedAt: Number(submittedAt),
          validated: overallValid,
          syntaxValid,
          semanticValid,
          validationErrors,
          committeeApproved: approved,
          publishedToDKG: published,
          modelVersion,
          dkgAssetUAL,
        };
      } catch (err) {
        console.error(`[RDF Review] Failed to fetch details for ${graphId}:`, err);
        return null;
      }
    },
    [publicClient, chainId],
  );

  // Load graphs from submitted events
  useEffect(() => {
    if (!submittedEvents || submittedEvents.length === 0 || !publicClient) return;

    const loadGraphs = async () => {
      setIsLoadingGraphs(true);
      try {
        const graphIds = submittedEvents.map(event => event.args.graphId as string).filter(Boolean);
        const uniqueIds = [...new Set(graphIds)];

        const details = await Promise.all(uniqueIds.map(id => fetchGraphDetails(id)));
        const validGraphs = details.filter((g): g is RDFGraphSummary => g !== null);

        // Sort by submittedAt descending (newest first)
        validGraphs.sort((a, b) => b.submittedAt - a.submittedAt);
        setGraphs(validGraphs);
      } catch (err) {
        console.error("[RDF Review] Error loading graphs:", err);
      } finally {
        setIsLoadingGraphs(false);
      }
    };

    loadGraphs();
  }, [submittedEvents, publicClient, fetchGraphDetails]);

  // Manual graph lookup
  const handleManualLookup = useCallback(async () => {
    if (!manualGraphId.trim()) {
      setLookupError("Please enter a graph ID");
      return;
    }

    const id = manualGraphId.trim();
    if (!id.startsWith("0x") || id.length !== 66) {
      setLookupError("Invalid graph ID format. Expected 0x + 64 hex characters.");
      return;
    }

    // Check if already in list
    if (graphs.some(g => g.graphId === id)) {
      setLookupError("This graph is already in the list.");
      setExpandedId(id);
      return;
    }

    setLookupError(null);
    setIsLoadingGraphs(true);

    try {
      const graph = await fetchGraphDetails(id);
      if (graph) {
        setGraphs(prev => [graph, ...prev]);
        setExpandedId(id);
        setManualGraphId("");
      } else {
        setLookupError("Graph not found or does not exist on-chain.");
      }
    } catch {
      setLookupError("Failed to fetch graph details.");
    } finally {
      setIsLoadingGraphs(false);
    }
  }, [manualGraphId, graphs, fetchGraphDetails]);

  // Refresh all graphs
  const handleRefresh = useCallback(async () => {
    if (!publicClient) return;

    setIsLoadingGraphs(true);
    try {
      const refreshed = await Promise.all(graphs.map(g => fetchGraphDetails(g.graphId)));
      const validGraphs = refreshed.filter((g): g is RDFGraphSummary => g !== null);
      validGraphs.sort((a, b) => b.submittedAt - a.submittedAt);
      setGraphs(validGraphs);
    } catch (err) {
      console.error("[RDF Review] Error refreshing:", err);
    } finally {
      setIsLoadingGraphs(false);
    }
  }, [graphs, publicClient, fetchGraphDetails]);

  // Handle approve
  const handleApprove = useCallback(
    async (graphId: string) => {
      if (!address) {
        alert("Please connect your wallet first");
        return;
      }

      setApprovingId(graphId);
      try {
        console.log(`[RDF Review] Approving graph: ${graphId}`);

        const txHash = await writeContractAsync({
          functionName: "approveRDFGraph",
          args: [graphId as `0x${string}`],
        });

        console.log(`[RDF Review] Approval transaction: ${txHash}`);

        // Update local state
        setGraphs(prev =>
          prev.map(g =>
            g.graphId === graphId
              ? {
                  ...g,
                  committeeApproved: true,
                }
              : g,
          ),
        );

        alert(
          `RDF graph approved successfully!\n\nTransaction: ${txHash}\n\nThe graph is now ready for DKG publication.`,
        );
      } catch (error: any) {
        console.error("[RDF Review] Approval error:", error);
        alert("Approval failed: " + (error?.shortMessage || error?.message || "Unknown error"));
      } finally {
        setApprovingId(null);
      }
    },
    [address, writeContractAsync],
  );

  // Fetch TTL content for preview
  const handleFetchContent = useCallback(
    async (graphId: string) => {
      if (ttlContent[graphId]) {
        setShowContent(showContent === graphId ? null : graphId);
        return;
      }

      setLoadingContent(graphId);
      try {
        const response = await fetch(`/api/ttl-storage/content/${graphId}`);
        if (!response.ok) throw new Error("Failed to fetch content");
        const data = await response.json();
        setTtlContent(prev => ({ ...prev, [graphId]: data.content || "No content available" }));
        setShowContent(graphId);
      } catch (err) {
        console.error("[RDF Review] Content fetch error:", err);
        setTtlContent(prev => ({ ...prev, [graphId]: "Error: Could not retrieve TTL content" }));
        setShowContent(graphId);
      } finally {
        setLoadingContent(null);
      }
    },
    [ttlContent, showContent],
  );

  // Handle DKG publish
  const handlePublishToDKG = useCallback(async (graphId: string) => {
    setPublishingId(graphId);
    setShowPublishPanel(graphId);
    setPublishSteps([
      { name: "Fetching TTL content from storage", status: "pending", message: "", timestamp: "" },
      { name: "Preparing DKG publish request", status: "pending", message: "", timestamp: "" },
      { name: "Submitting to OriginTrail DKG", status: "pending", message: "", timestamp: "" },
      { name: "Recording UAL on blockchain", status: "pending", message: "", timestamp: "" },
    ]);

    try {
      const response = await fetch("/api/dkg-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graphId }),
      });

      const result = await response.json();

      if (result.steps) {
        setPublishSteps(result.steps);
      }

      if (result.success && result.dkgAssetUAL) {
        setGraphs(prev =>
          prev.map(g => (g.graphId === graphId ? { ...g, publishedToDKG: true, dkgAssetUAL: result.dkgAssetUAL } : g)),
        );
      } else if (!result.success) {
        console.error("[RDF Review] DKG publish failed:", result.error);
      }
    } catch (err) {
      console.error("[RDF Review] DKG publish error:", err);
      setPublishSteps(prev =>
        prev.map((s, i) =>
          i === 0 && s.status === "pending"
            ? { ...s, status: "failed", message: "Network error", timestamp: new Date().toISOString() }
            : s,
        ),
      );
    } finally {
      setPublishingId(null);
    }
  }, []);

  // Not connected state
  if (!address) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <div className="max-w-lg mx-auto text-center px-6">
          <div className="card bg-base-100 shadow-xl border border-base-300">
            <div className="card-body">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-warning/10 flex items-center justify-center">
                <LockIcon className="w-8 h-8 text-warning" />
              </div>
              <h1 className="text-3xl font-bold mb-4">Access Required</h1>
              <p className="text-base-content/70 mb-6">Please connect your wallet to access the RDF review system.</p>
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
        <LoadingState message="Verifying access..." size="lg" />
      </div>
    );
  }

  // Unauthorized access
  if (!isAuthorized) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <div className="max-w-lg mx-auto text-center px-6">
          <div className="card bg-base-100 shadow-xl border border-error/30">
            <div className="card-body">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-error/10 flex items-center justify-center">
                <LockIcon className="w-8 h-8 text-error" />
              </div>
              <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
              <p className="text-base-content/70 mb-6">
                This page is only accessible to Validation Committee members and DAO Owners.
              </p>
              <div className="bg-base-200 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-base-content/70">Your Address</span>
                  <Address address={address} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-base-content/70">Your Role Index</span>
                  <span className="font-mono text-sm">{roleIndex}</span>
                </div>
              </div>
              <Link href="/dashboard" className="btn btn-primary">
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authorized - RDF Review Interface
  return (
    <div className="min-h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="bg-gradient-to-r from-accent/10 via-primary/5 to-accent/10 py-12 border-b border-base-300">
        <div className="max-w-6xl mx-auto px-6">
          <Link href="/committees/validation" className="btn btn-ghost btn-sm mb-6 gap-2">
            <ArrowRightIcon className="w-4 h-4 rotate-180" />
            Back to Committee
          </Link>

          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-accent/10 text-accent">
              <DataIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">RDF Graph Review</h1>
              <p className="text-base-content/70">Review and approve submitted RDF graphs for DKG publication</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
              <h3 className="text-sm text-base-content/60">Total Submissions</h3>
              <p className="text-3xl font-bold">{rdfGraphCount?.toString() || "0"}</p>
            </div>
          </div>
          <div className="card bg-base-100 border border-warning/30 bg-warning/5">
            <div className="card-body">
              <h3 className="text-sm text-base-content/60">Pending Review</h3>
              <p className="text-3xl font-bold text-warning">
                {graphs.filter(g => !g.committeeApproved && g.syntaxValid).length}
              </p>
            </div>
          </div>
          <div className="card bg-base-100 border border-success/30 bg-success/5">
            <div className="card-body">
              <h3 className="text-sm text-base-content/60">Approved</h3>
              <p className="text-3xl font-bold text-success">{graphs.filter(g => g.committeeApproved).length}</p>
            </div>
          </div>
          <div className="card bg-base-100 border border-info/30 bg-info/5">
            <div className="card-body">
              <h3 className="text-sm text-base-content/60">Published to DKG</h3>
              <p className="text-3xl font-bold text-info">{graphs.filter(g => g.publishedToDKG).length}</p>
            </div>
          </div>
        </div>

        {/* Manual Lookup + Refresh */}
        <div className="card bg-base-100 border border-base-300 mb-8">
          <div className="card-body">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="label">
                  <span className="label-text text-sm">Lookup Graph by ID</span>
                </label>
                <div className="join w-full">
                  <input
                    type="text"
                    className="input input-bordered join-item w-full font-mono text-xs"
                    placeholder="0x..."
                    value={manualGraphId}
                    onChange={e => setManualGraphId(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleManualLookup()}
                  />
                  <button
                    onClick={handleManualLookup}
                    disabled={isLoadingGraphs}
                    className="btn btn-primary join-item gap-2"
                  >
                    <SearchIcon className="w-4 h-4" />
                    Lookup
                  </button>
                </div>
                {lookupError && <p className="text-error text-xs mt-1">{lookupError}</p>}
              </div>
              <button onClick={handleRefresh} disabled={isLoadingGraphs} className="btn btn-outline gap-2">
                {isLoadingGraphs ? <SpinnerIcon className="w-4 h-4" /> : <DataIcon className="w-4 h-4" />}
                Refresh All
              </button>
            </div>
          </div>
        </div>

        {/* Loading indicator */}
        {isLoadingGraphs && graphs.length === 0 && (
          <div className="flex justify-center py-8">
            <LoadingState message="Loading submitted graphs..." size="md" />
          </div>
        )}

        {/* Graphs List */}
        <div className="card bg-base-100 shadow-xl border border-base-300">
          <div className="card-body">
            <h2 className="card-title flex items-center gap-2 mb-4">
              <DataIcon className="w-6 h-6 text-accent" />
              Submitted RDF Graphs
              {isLoadingGraphs && <SpinnerIcon className="w-4 h-4 ml-2" />}
            </h2>

            {graphs.length === 0 && !isLoadingGraphs ? (
              <div className="text-center py-12">
                <DataIcon className="w-16 h-16 text-base-content/20 mx-auto mb-4" />
                <p className="text-base-content/60">No RDF graphs found</p>
                <p className="text-sm text-base-content/50 mt-2">
                  Submit a graph via the Data Provision page, or use the lookup field above to find a graph by ID.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {graphs.map(graph => (
                  <div key={graph.graphId} className="card bg-base-200 border border-base-300">
                    <div className="card-body">
                      <div className="flex flex-col gap-4">
                        {/* Header Row */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">{graph.graphURI || "Unnamed Graph"}</h3>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <div className="badge badge-outline">{GRAPH_TYPE_NAMES[graph.graphType]}</div>
                              <div className="badge badge-outline">{DATASET_NAMES[graph.datasetVariant]}</div>
                              <div className="badge badge-outline">Year: {graph.year}</div>
                              <div className="badge badge-outline">v{graph.version}</div>

                              {/* Syntax badge */}
                              {graph.syntaxValid ? (
                                <div className="badge badge-success gap-1">
                                  <CheckCircleIcon className="w-3 h-3" />
                                  Syntax: Passed
                                </div>
                              ) : graph.submittedAt > 0 && graph.syntaxValid === false && graph.validationErrors ? (
                                <div className="badge badge-error gap-1">
                                  <XCircleIcon className="w-3 h-3" />
                                  Syntax: Failed
                                </div>
                              ) : (
                                <div className="badge badge-ghost gap-1">
                                  <ClockIcon className="w-3 h-3" />
                                  Syntax: Pending
                                </div>
                              )}

                              {/* Semantic badge (yellow = warning, not error) */}
                              {graph.syntaxValid &&
                                (graph.semanticValid ? (
                                  <div className="badge badge-success gap-1">
                                    <CheckCircleIcon className="w-3 h-3" />
                                    Semantic: Passed
                                  </div>
                                ) : graph.validationErrors ? (
                                  <div className="badge badge-warning gap-1">
                                    <ClockIcon className="w-3 h-3" />
                                    Semantic: Warnings
                                  </div>
                                ) : (
                                  <div className="badge badge-ghost gap-1">
                                    <ClockIcon className="w-3 h-3" />
                                    Semantic: Pending
                                  </div>
                                ))}

                              {graph.committeeApproved && (
                                <div className="badge badge-info gap-1">
                                  <CheckCircleIcon className="w-3 h-3" />
                                  Approved
                                </div>
                              )}
                              {graph.publishedToDKG && (
                                <div className="badge badge-accent gap-1">
                                  <UploadIcon className="w-3 h-3" />
                                  Published to DKG
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 flex-shrink-0">
                            {/* Approve button: show if syntaxValid and not yet approved */}
                            {graph.syntaxValid && !graph.committeeApproved && (
                              <button
                                onClick={() => handleApprove(graph.graphId)}
                                disabled={approvingId === graph.graphId}
                                className="btn btn-sm btn-success gap-2"
                              >
                                {approvingId === graph.graphId ? (
                                  <>
                                    <SpinnerIcon className="w-4 h-4" />
                                    Approving...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircleIcon className="w-4 h-4" />
                                    Approve
                                  </>
                                )}
                              </button>
                            )}

                            {/* Publish to DKG button: show if approved, not published, and user is Owner */}
                            {graph.committeeApproved && !graph.publishedToDKG && isOwner && (
                              <button
                                onClick={() => handlePublishToDKG(graph.graphId)}
                                disabled={publishingId === graph.graphId}
                                className="btn btn-sm btn-accent gap-2"
                              >
                                {publishingId === graph.graphId ? (
                                  <>
                                    <SpinnerIcon className="w-4 h-4" />
                                    Publishing...
                                  </>
                                ) : (
                                  <>
                                    <UploadIcon className="w-4 h-4" />
                                    Publish to DKG
                                  </>
                                )}
                              </button>
                            )}

                            <button
                              onClick={() => setExpandedId(expandedId === graph.graphId ? null : graph.graphId)}
                              className="btn btn-sm btn-ghost"
                            >
                              {expandedId === graph.graphId ? "Hide Details" : "View Details"}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedId === graph.graphId && (
                          <div className="space-y-4">
                            {/* Basic info */}
                            <div className="bg-base-300/30 rounded-lg p-4 space-y-2 text-sm">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-base-content/60">Graph ID:</span>{" "}
                                  <span className="font-mono text-xs break-all">{graph.graphId}</span>
                                </div>
                                <div>
                                  <span className="text-base-content/60">Hash:</span>{" "}
                                  <span className="font-mono text-xs break-all">{graph.graphHash}</span>
                                </div>
                                <div>
                                  <span className="text-base-content/60">Submitter:</span>{" "}
                                  <Address address={graph.submitter as `0x${string}`} />
                                </div>
                                <div>
                                  <span className="text-base-content/60">Submitted:</span>{" "}
                                  <span>{new Date(graph.submittedAt * 1000).toLocaleString()}</span>
                                </div>
                                <div>
                                  <span className="text-base-content/60">Model Version:</span>{" "}
                                  <span className="font-semibold">{graph.modelVersion}</span>
                                </div>
                                {graph.publishedToDKG && graph.dkgAssetUAL && (
                                  <div className="col-span-2">
                                    <span className="text-base-content/60">DKG UAL:</span>{" "}
                                    <span className="font-mono text-xs break-all text-accent">{graph.dkgAssetUAL}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Validation details section */}
                            <div className="bg-base-300/30 rounded-lg p-4 text-sm">
                              <h4 className="font-semibold mb-3">Validation Details</h4>
                              <div className="space-y-2">
                                {/* Syntax check */}
                                <div className="flex items-center gap-2">
                                  {graph.syntaxValid ? (
                                    <CheckCircleIcon className="w-5 h-5 text-success flex-shrink-0" />
                                  ) : graph.validationErrors ? (
                                    <XCircleIcon className="w-5 h-5 text-error flex-shrink-0" />
                                  ) : (
                                    <ClockIcon className="w-5 h-5 text-base-content/40 flex-shrink-0" />
                                  )}
                                  <span className="font-medium">N3.js Syntax Validation:</span>
                                  <span
                                    className={
                                      graph.syntaxValid
                                        ? "text-success font-semibold"
                                        : graph.validationErrors
                                          ? "text-error font-semibold"
                                          : "text-base-content/50"
                                    }
                                  >
                                    {graph.syntaxValid ? "Passed" : graph.validationErrors ? "Failed" : "Pending"}
                                  </span>
                                </div>

                                {/* Semantic check */}
                                <div className="flex items-center gap-2">
                                  {graph.semanticValid ? (
                                    <CheckCircleIcon className="w-5 h-5 text-success flex-shrink-0" />
                                  ) : graph.syntaxValid && graph.validationErrors && !graph.semanticValid ? (
                                    <ClockIcon className="w-5 h-5 text-warning flex-shrink-0" />
                                  ) : (
                                    <ClockIcon className="w-5 h-5 text-base-content/40 flex-shrink-0" />
                                  )}
                                  <span className="font-medium">SHACL Semantic Validation:</span>
                                  {graph.semanticValid ? (
                                    <span className="text-success font-semibold">Passed</span>
                                  ) : graph.syntaxValid && !graph.semanticValid && graph.validationErrors ? (
                                    <span className="text-warning font-semibold">Warnings (committee review)</span>
                                  ) : (
                                    <span className="text-base-content/50">Pending</span>
                                  )}
                                </div>

                                {/* Validation errors/warnings */}
                                {graph.validationErrors && (
                                  <div className="mt-2 p-3 rounded bg-base-300/50">
                                    <p className="text-xs font-mono text-base-content/70 whitespace-pre-wrap">
                                      {graph.validationErrors}
                                    </p>
                                  </div>
                                )}

                                {/* Overall status */}
                                <div className="flex items-center gap-2 pt-2 border-t border-base-300">
                                  <span className="font-medium">Overall:</span>
                                  {graph.validated ? (
                                    <span className="badge badge-success badge-sm">Fully Valid</span>
                                  ) : graph.syntaxValid ? (
                                    <span className="badge badge-warning badge-sm">
                                      Syntax Valid (semantic warnings)
                                    </span>
                                  ) : (
                                    <span className="badge badge-ghost badge-sm">Not Yet Validated</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* TTL Content Preview */}
                            <div className="bg-base-300/30 rounded-lg p-4 text-sm">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold">TTL Content</h4>
                                <button
                                  onClick={() => handleFetchContent(graph.graphId)}
                                  disabled={loadingContent === graph.graphId}
                                  className="btn btn-xs btn-ghost gap-1"
                                >
                                  {loadingContent === graph.graphId ? (
                                    <SpinnerIcon className="w-3 h-3" />
                                  ) : (
                                    <DataIcon className="w-3 h-3" />
                                  )}
                                  {showContent === graph.graphId ? "Hide Content" : "View Content"}
                                </button>
                              </div>
                              {showContent === graph.graphId && ttlContent[graph.graphId] && (
                                <pre className="bg-base-300 rounded p-3 text-xs font-mono overflow-x-auto max-h-96 whitespace-pre-wrap">
                                  {ttlContent[graph.graphId]}
                                </pre>
                              )}
                            </div>

                            {/* DKG Publication Status */}
                            {showPublishPanel === graph.graphId && publishSteps.length > 0 && (
                              <div className="bg-base-300/30 rounded-lg p-4 text-sm">
                                <h4 className="font-semibold mb-3">DKG Publication Progress</h4>
                                <div className="space-y-3">
                                  {publishSteps.map((step, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                      {step.status === "completed" ? (
                                        <CheckCircleIcon className="w-5 h-5 text-success flex-shrink-0" />
                                      ) : step.status === "in_progress" ? (
                                        <SpinnerIcon className="w-5 h-5 text-info flex-shrink-0" />
                                      ) : step.status === "failed" ? (
                                        <XCircleIcon className="w-5 h-5 text-error flex-shrink-0" />
                                      ) : (
                                        <ClockIcon className="w-5 h-5 text-base-content/30 flex-shrink-0" />
                                      )}
                                      <div className="flex-1">
                                        <p className="font-medium">{step.name}</p>
                                        {step.message && (
                                          <p className="text-xs text-base-content/60 mt-0.5">{step.message}</p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {graph.publishedToDKG && graph.dkgAssetUAL && (
                                  <div className="mt-3 p-2 bg-success/10 border border-success/20 rounded">
                                    <p className="text-success font-semibold text-xs">
                                      Published! UAL: {graph.dkgAssetUAL}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="alert bg-primary/10 border border-primary/20 mt-8">
          <DataIcon className="w-6 h-6 text-primary shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Committee Review Workflow</p>
            <ol className="list-decimal list-inside mt-2 text-base-content/70 space-y-1">
              <li>Review submitted RDF graphs -- they appear automatically from on-chain events</li>
              <li>Check syntax validation (must pass) and semantic validation (warnings OK)</li>
              <li>Click &quot;View Content&quot; to inspect the actual TTL data</li>
              <li>Click &quot;Approve&quot; to authorize the graph for DKG publication</li>
              <li>Owner can then click &quot;Publish to DKG&quot; to publish to OriginTrail</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
