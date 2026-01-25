"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { zeroAddress } from "viem";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { ArrowRightIcon, CheckCircleIcon, DataIcon, LockIcon, SpinnerIcon, XCircleIcon } from "~~/components/dao";
import { LoadingState } from "~~/components/dao/LoadingState";
import { Address } from "~~/components/scaffold-eth";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

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
const DATASET_NAMES = ["ERR Online", "Õhtuleht Online", "Õhtuleht Print", "Äriregister"];

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
  committeeApproved: boolean;
  publishedToDKG: boolean;
  modelVersion: string;
  dkgAssetUAL: string;
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
  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "GADataValidation" });

  const [graphs, setGraphs] = useState<RDFGraphSummary[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  useEffect(() => {
    if (address && mkmpAddress) refetch();
  }, [address, mkmpAddress, chainId, refetch]);

  const { roleIndex, isAuthorized } = useMemo(() => {
    const v = roleRaw ? Number(roleRaw) : 0;
    const idx = v & 31;
    return {
      roleIndex: idx,
      // Only Validation Committee (index 7) and Owner (index 5) can access
      isAuthorized: v !== 0 && (idx === 7 || idx === 5),
    };
  }, [roleRaw]);

  // Load all RDF graphs (simplified - in production would use events/indexer)
  useEffect(() => {
    if (!rdfGraphCount) return;

    // For now, we'll show a message to use events
    // In production, this would query indexed events or use a subgraph
    console.log(`Total RDF graphs: ${rdfGraphCount}`);
  }, [rdfGraphCount]);

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
                {graphs.filter(g => !g.committeeApproved && g.validated).length}
              </p>
            </div>
          </div>
          <div className="card bg-base-100 border border-success/30 bg-success/5">
            <div className="card-body">
              <h3 className="text-sm text-base-content/60">Approved</h3>
              <p className="text-3xl font-bold text-success">{graphs.filter(g => g.committeeApproved).length}</p>
            </div>
          </div>
        </div>

        {/* Info Alert */}
        <div className="alert bg-info/10 border border-info/20 mb-8">
          <DataIcon className="w-6 h-6 text-info shrink-0" />
          <div className="text-sm">
            <p className="font-semibold mb-1">Event Indexing Required</p>
            <p className="text-base-content/70">
              To view submitted RDF graphs, this page needs to query blockchain events. In production, this would use
              Ponder indexer or The Graph. For now, graphs can be queried directly using contract methods with known
              graph IDs from submission transactions.
            </p>
          </div>
        </div>

        {/* Graphs List */}
        <div className="card bg-base-100 shadow-xl border border-base-300">
          <div className="card-body">
            <h2 className="card-title flex items-center gap-2 mb-4">
              <DataIcon className="w-6 h-6 text-accent" />
              Submitted RDF Graphs
            </h2>

            {graphs.length === 0 ? (
              <div className="text-center py-12">
                <DataIcon className="w-16 h-16 text-base-content/20 mx-auto mb-4" />
                <p className="text-base-content/60">No RDF graphs to review</p>
                <p className="text-sm text-base-content/50 mt-2">
                  Submitted graphs will appear here once event indexing is configured
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
                            <h3 className="font-semibold text-lg mb-2">{graph.graphURI}</h3>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <div className="badge badge-outline">{GRAPH_TYPE_NAMES[graph.graphType]}</div>
                              <div className="badge badge-outline">{DATASET_NAMES[graph.datasetVariant]}</div>
                              <div className="badge badge-outline">Year: {graph.year}</div>
                              <div className="badge badge-outline">v{graph.version}</div>
                              {graph.validated && (
                                <div className="badge badge-success gap-1">
                                  <CheckCircleIcon className="w-3 h-3" />
                                  Validated
                                </div>
                              )}
                              {!graph.validated && (
                                <div className="badge badge-warning gap-1">
                                  <XCircleIcon className="w-3 h-3" />
                                  Not Validated
                                </div>
                              )}
                              {graph.committeeApproved && (
                                <div className="badge badge-info gap-1">
                                  <CheckCircleIcon className="w-3 h-3" />
                                  Approved
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {graph.validated && !graph.committeeApproved && (
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
                                  <span className="font-mono text-xs break-all">{graph.dkgAssetUAL}</span>
                                </div>
                              )}
                            </div>
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
              <li>Review submitted RDF graphs for accuracy and completeness</li>
              <li>Verify that the graph passed RDF syntax validation</li>
              <li>Check metadata (graph type, dataset variant, year, model version)</li>
              <li>Click &quot;Approve&quot; to authorize the graph for DKG publication</li>
              <li>Approved graphs will be published to OriginTrail DKG by the DAO owner</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
