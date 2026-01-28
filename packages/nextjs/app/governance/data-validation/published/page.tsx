"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { CheckCircleIcon, DataIcon, GovernanceIcon, LockIcon } from "~~/components/dao";
import { LoadingState } from "~~/components/dao/LoadingState";
import { Address } from "~~/components/scaffold-eth";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldEventHistory, useScaffoldReadContract } from "~~/hooks/scaffold-eth";

// ─── Constants ───────────────────────────────────────────────────────────────

const GRAPH_TYPE_LABELS = ["ARTICLES", "ENTITIES", "MENTIONS", "NLP", "ECONOMICS", "RELATIONS", "PROVENANCE"];
const DATASET_LABELS = ["ERR Online", "Ohtuleht Online", "Ohtuleht Print", "Ariregister"];

const ROLE_LABELS: Record<number, string> = {
  0: "Member Institution",
  1: "Ordinary User",
  4: "Data Validator",
  5: "MKMPOL21 Owner",
};

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
  graphURI: string;
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function PublishedAssetsPage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [assets, setAssets] = useState<PublishedAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Role check
  const { data: roleRaw, isFetching: isFetchingRole } = useScaffoldReadContract({
    contractName: "MKMPOL21",
    functionName: "hasRole",
    args: [address],
    watch: false,
  });

  const roleValue = roleRaw !== undefined && roleRaw !== null ? Number(roleRaw) : 0;
  const roleIndex = roleValue & 31;
  const roleName = roleValue === 0 ? "No Role" : (ROLE_LABELS[roleIndex] ?? "Unknown");
  const hasAccess = roleValue !== 0 && [0, 1, 4, 5].includes(roleIndex);

  // Contract address
  const gaAddress = (deployedContracts as any)?.[chainId]?.GADataValidation?.address as `0x${string}` | undefined;

  // Fetch published events
  const { data: publishedEvents } = useScaffoldEventHistory({
    contractName: "GADataValidation",
    eventName: "RDFGraphPublishedToDKG",
    watch: true,
    fromBlock: 0n,
  });

  // Fetch details for each published graph
  useEffect(() => {
    if (!publicClient || !gaAddress || !publishedEvents || publishedEvents.length === 0) {
      if (publishedEvents !== undefined) {
        setIsLoading(false);
      }
      return;
    }

    let cancelled = false;

    async function fetchDetails() {
      setIsLoading(true);
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
            graphURI: (basicInfo as any)[1],
          });
        } catch (err) {
          console.warn(`Failed to fetch details for published graph ${graphId}:`, err);
          results.push({
            graphId,
            dkgAssetUAL: ual,
            graphType: 0,
            datasetVariant: 0,
            year: 0,
            version: 0,
            submitter: "",
            submittedAt: 0,
            graphURI: "",
          });
        }
      }

      if (!cancelled) {
        setAssets(results);
        setIsLoading(false);
      }
    }

    fetchDetails();
    return () => {
      cancelled = true;
    };
  }, [publicClient, gaAddress, publishedEvents]);

  // ─── Access Control ──────────────────────────────────────────────────────────

  if (!address) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <div className="max-w-lg mx-auto text-center px-6">
          <div className="card bg-base-100 shadow-xl border border-base-300">
            <div className="card-body">
              <GovernanceIcon className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold mb-2">Connect Wallet</h2>
              <p className="text-base-content/70">Connect your wallet to view published knowledge assets.</p>
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
                <Link href="/governance/data-validation" className="btn btn-ghost btn-sm gap-1">
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
                  Data Validation
                </Link>
                <div className="badge badge-outline">{roleName}</div>
              </div>
              <h1 className="text-3xl font-bold mb-1">Published Knowledge Assets</h1>
              <p className="text-base-content/60 text-sm">
                RDF graphs published to the Decentralized Knowledge Graph via MFSSIA API
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-base-content/60">
              <Address address={address} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Summary */}
        <div className="stat bg-base-100 rounded-xl border border-base-300 shadow-sm p-4 mb-8 inline-block">
          <div className="stat-title text-xs">Total Published</div>
          <div className="stat-value text-2xl text-accent">{assets.length}</div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <LoadingState message="Loading published assets..." />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && assets.length === 0 && (
          <div className="text-center py-16">
            <DataIcon className="w-16 h-16 mx-auto mb-4 text-base-content/20" />
            <p className="text-base-content/60 text-lg">No assets published to the DKG yet</p>
            <p className="text-sm text-base-content/40 mt-2">
              Published assets will appear here after DKG publication from the verification flow
            </p>
          </div>
        )}

        {/* Published Asset Cards */}
        <div className="space-y-4">
          {assets.map(asset => (
            <div key={asset.graphId} className="card bg-base-100 border border-base-300 shadow-sm">
              <div className="card-body p-5">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-base flex items-center gap-2">
                      <CheckCircleIcon className="w-5 h-5 text-accent" />
                      {GRAPH_TYPE_LABELS[asset.graphType] || "Unknown"} Graph
                      {asset.version > 0 && <span className="font-normal text-base-content/50">v{asset.version}</span>}
                    </h4>
                    <div className="font-mono text-xs text-base-content/40 mt-0.5">
                      {asset.graphId.slice(0, 10)}...{asset.graphId.slice(-8)}
                    </div>
                  </div>
                  <div className="badge badge-accent">Published</div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-3 text-xs">
                  {asset.graphURI && (
                    <div>
                      <span className="text-base-content/50">URI:</span>{" "}
                      <span className="font-mono">{asset.graphURI}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-base-content/50">Dataset:</span>{" "}
                    {DATASET_LABELS[asset.datasetVariant] || "Unknown"}
                  </div>
                  {asset.year > 0 && (
                    <div>
                      <span className="text-base-content/50">Year:</span> {asset.year}
                    </div>
                  )}
                  {asset.submitter && (
                    <div>
                      <span className="text-base-content/50">Submitter:</span>{" "}
                      <span className="font-mono">
                        {asset.submitter.slice(0, 6)}...{asset.submitter.slice(-4)}
                      </span>
                    </div>
                  )}
                </div>

                {/* UAL Section */}
                {asset.dkgAssetUAL && (
                  <div className="mt-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
                    <div className="text-xs text-base-content/50 mb-1">DKG Asset UAL</div>
                    <div className="font-mono text-sm break-all">{asset.dkgAssetUAL}</div>
                    <a
                      href={`https://dkg.origintrail.io/explore?ual=${encodeURIComponent(asset.dkgAssetUAL)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-xs btn-ghost gap-1 mt-2 text-accent"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                      View on DKG Explorer
                    </a>
                  </div>
                )}

                {/* Publication timestamp */}
                {asset.submittedAt > 0 && (
                  <div className="mt-2 text-xs text-base-content/40">
                    Submitted: {new Date(asset.submittedAt * 1000).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
