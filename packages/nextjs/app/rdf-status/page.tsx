"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  DataIcon,
  SearchIcon,
  SpinnerIcon,
  XCircleIcon,
} from "~~/components/dao";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const GRAPH_TYPE_NAMES = ["ARTICLES", "ENTITIES", "MENTIONS", "NLP", "ECONOMICS", "RELATIONS", "PROVENANCE"];
const DATASET_NAMES = ["ERR Online", "Õhtuleht Online", "Õhtuleht Print", "Äriregister"];

interface GraphDetails {
  exists: boolean;
  validated: boolean;
  approved: boolean;
  published: boolean;
  // Basic info
  graphHash?: string;
  graphURI?: string;
  graphType?: number;
  datasetVariant?: number;
  year?: number;
  version?: number;
  // Metadata
  submitter?: string;
  submittedAt?: number;
  modelVersion?: string;
  dkgAssetUAL?: string;
}

/**
 * RDF Graph Status Page
 * Allows anyone to check the status of an RDF graph by its ID
 */
export default function RDFStatusPage() {
  const [graphId, setGraphId] = useState<string>("");
  const [searchedId, setSearchedId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Query graph status
  const { data: statusData, refetch: refetchStatus } = useScaffoldReadContract({
    contractName: "GADataValidation",
    functionName: "getGraphStatus",
    args: [searchedId as `0x${string}`],
    query: { enabled: !!searchedId },
  });

  // Query basic info
  const { data: basicInfo, refetch: refetchBasic } = useScaffoldReadContract({
    contractName: "GADataValidation",
    functionName: "getRDFGraphBasicInfo",
    args: [searchedId as `0x${string}`],
    query: { enabled: !!searchedId },
  });

  // Query metadata
  const { data: metadata, refetch: refetchMetadata } = useScaffoldReadContract({
    contractName: "GADataValidation",
    functionName: "getRDFGraphMetadata",
    args: [searchedId as `0x${string}`],
    query: { enabled: !!searchedId },
  });

  const graphDetails: GraphDetails | null = statusData
    ? {
        exists: statusData[0],
        validated: statusData[1],
        approved: statusData[2],
        published: statusData[3],
        // Basic info from separate call
        graphHash: basicInfo?.[0],
        graphURI: basicInfo?.[1],
        graphType: Number(basicInfo?.[2]),
        datasetVariant: Number(basicInfo?.[3]),
        year: Number(basicInfo?.[4]),
        version: Number(basicInfo?.[5]),
        // Metadata from separate call
        submitter: metadata?.[0],
        submittedAt: Number(metadata?.[1]),
        modelVersion: metadata?.[2],
        dkgAssetUAL: metadata?.[3],
      }
    : null;

  const handleSearch = useCallback(async () => {
    if (!graphId || graphId.length !== 66) {
      alert("Please enter a valid graph ID (66 characters starting with 0x)");
      return;
    }

    setIsSearching(true);
    setSearchedId(graphId);

    // Trigger refetch
    setTimeout(async () => {
      await refetchStatus();
      await refetchBasic();
      await refetchMetadata();
      setIsSearching(false);
    }, 500);
  }, [graphId, refetchStatus, refetchBasic, refetchMetadata]);

  return (
    <div className="min-h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="bg-gradient-to-r from-info/10 via-primary/5 to-info/10 py-12 border-b border-base-300">
        <div className="max-w-4xl mx-auto px-6">
          <Link href="/" className="btn btn-ghost btn-sm mb-6 gap-2">
            <ArrowRightIcon className="w-4 h-4 rotate-180" />
            Back to Home
          </Link>

          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-info/10 text-info">
              <SearchIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">RDF Graph Status</h1>
              <p className="text-base-content/70">Check the validation and approval status of submitted RDF graphs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Search Section */}
        <div className="card bg-base-100 shadow-xl border border-base-300 mb-8">
          <div className="card-body">
            <h2 className="card-title flex items-center gap-2">
              <SearchIcon className="w-6 h-6 text-primary" />
              Search by Graph ID
            </h2>
            <p className="text-sm text-base-content/70 mb-4">
              Enter the graph ID (returned from the submitRDFGraph transaction) to check its status
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={graphId}
                onChange={e => setGraphId(e.target.value)}
                placeholder="0x..."
                className="input input-bordered input-primary flex-1 font-mono text-sm"
                maxLength={66}
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || !graphId}
                className="btn btn-primary gap-2 min-w-[150px]"
              >
                {isSearching ? (
                  <>
                    <SpinnerIcon className="w-5 h-5" />
                    Searching...
                  </>
                ) : (
                  <>
                    <SearchIcon className="w-5 h-5" />
                    Check Status
                  </>
                )}
              </button>
            </div>

            {graphId && graphId.length !== 66 && (
              <div className="text-xs text-warning mt-2">Graph ID must be 66 characters (including 0x prefix)</div>
            )}
          </div>
        </div>

        {/* Results Section */}
        {searchedId && graphDetails && (
          <>
            {!graphDetails.exists ? (
              <div className="alert alert-error">
                <XCircleIcon className="w-6 h-6 shrink-0" />
                <div>
                  <h3 className="font-bold">Graph Not Found</h3>
                  <div className="text-sm">No RDF graph exists with ID: {searchedId}</div>
                </div>
              </div>
            ) : (
              <>
                {/* Status Timeline */}
                <div className="card bg-base-100 shadow-xl border border-base-300 mb-8">
                  <div className="card-body">
                    <h2 className="card-title mb-6">Workflow Status</h2>

                    <div className="space-y-4">
                      {/* Step 1: Submitted */}
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <CheckCircleIcon className="w-8 h-8 text-success" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">Submitted</h3>
                          <p className="text-sm text-base-content/70">
                            {graphDetails.submittedAt
                              ? new Date(graphDetails.submittedAt * 1000).toLocaleString()
                              : "Unknown"}
                          </p>
                        </div>
                        <div className="badge badge-success">Complete</div>
                      </div>

                      {/* Step 2: Validated */}
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {graphDetails.validated ? (
                            <CheckCircleIcon className="w-8 h-8 text-success" />
                          ) : (
                            <ClockIcon className="w-8 h-8 text-warning" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">RDF Syntax Validation</h3>
                          <p className="text-sm text-base-content/70">
                            {graphDetails.validated
                              ? "Graph passed RDF syntax validation"
                              : "Awaiting validation by Data Validator"}
                          </p>
                        </div>
                        {graphDetails.validated ? (
                          <div className="badge badge-success">Complete</div>
                        ) : (
                          <div className="badge badge-warning">Pending</div>
                        )}
                      </div>

                      {/* Step 3: Committee Approved */}
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {graphDetails.approved ? (
                            <CheckCircleIcon className="w-8 h-8 text-success" />
                          ) : graphDetails.validated ? (
                            <ClockIcon className="w-8 h-8 text-warning" />
                          ) : (
                            <ClockIcon className="w-8 h-8 text-base-content/30" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">Committee Approval</h3>
                          <p className="text-sm text-base-content/70">
                            {graphDetails.approved
                              ? "Approved by Validation Committee"
                              : graphDetails.validated
                                ? "Awaiting committee review"
                                : "Requires validation first"}
                          </p>
                        </div>
                        {graphDetails.approved ? (
                          <div className="badge badge-success">Complete</div>
                        ) : graphDetails.validated ? (
                          <div className="badge badge-warning">Pending</div>
                        ) : (
                          <div className="badge badge-ghost">Locked</div>
                        )}
                      </div>

                      {/* Step 4: Published to DKG */}
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {graphDetails.published ? (
                            <CheckCircleIcon className="w-8 h-8 text-success" />
                          ) : graphDetails.approved ? (
                            <ClockIcon className="w-8 h-8 text-warning" />
                          ) : (
                            <ClockIcon className="w-8 h-8 text-base-content/30" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">DKG Publication</h3>
                          <p className="text-sm text-base-content/70">
                            {graphDetails.published
                              ? "Published to OriginTrail DKG"
                              : graphDetails.approved
                                ? "Ready for DKG publication"
                                : "Requires committee approval first"}
                          </p>
                        </div>
                        {graphDetails.published ? (
                          <div className="badge badge-success">Complete</div>
                        ) : graphDetails.approved ? (
                          <div className="badge badge-info">Ready</div>
                        ) : (
                          <div className="badge badge-ghost">Locked</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Graph Details */}
                <div className="card bg-base-100 shadow-xl border border-base-300 mb-8">
                  <div className="card-body">
                    <h2 className="card-title mb-4">Graph Details</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-base-content/60">Graph URI:</span>
                        <p className="font-mono text-sm break-all">{graphDetails.graphURI}</p>
                      </div>
                      <div>
                        <span className="text-sm text-base-content/60">Graph Type:</span>
                        <p className="font-semibold">
                          {graphDetails.graphType !== undefined ? GRAPH_TYPE_NAMES[graphDetails.graphType] : "Unknown"}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-base-content/60">Dataset:</span>
                        <p className="font-semibold">
                          {graphDetails.datasetVariant !== undefined
                            ? DATASET_NAMES[graphDetails.datasetVariant]
                            : "Unknown"}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-base-content/60">Year:</span>
                        <p className="font-semibold">{graphDetails.year}</p>
                      </div>
                      <div>
                        <span className="text-sm text-base-content/60">Version:</span>
                        <p className="font-semibold">v{graphDetails.version}</p>
                      </div>
                      <div>
                        <span className="text-sm text-base-content/60">Model Version:</span>
                        <p className="font-semibold">{graphDetails.modelVersion}</p>
                      </div>
                      <div className="col-span-1 md:col-span-2">
                        <span className="text-sm text-base-content/60">Submitter:</span>
                        <div className="mt-1">
                          <Address address={graphDetails.submitter as `0x${string}`} />
                        </div>
                      </div>
                      <div className="col-span-1 md:col-span-2">
                        <span className="text-sm text-base-content/60">Graph Hash:</span>
                        <p className="font-mono text-xs break-all">{graphDetails.graphHash}</p>
                      </div>
                      {graphDetails.published && graphDetails.dkgAssetUAL && (
                        <div className="col-span-1 md:col-span-2">
                          <span className="text-sm text-base-content/60">DKG Asset UAL:</span>
                          <p className="font-mono text-xs break-all">{graphDetails.dkgAssetUAL}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Info Card */}
        <div className="alert bg-primary/10 border border-primary/20">
          <DataIcon className="w-6 h-6 text-primary shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">How to Find Your Graph ID</p>
            <p className="text-base-content/70 mt-1">
              When you submit an RDF graph through the Data Provision page, the transaction receipt will include your
              graph ID. You can also find it in your wallet&apos;s transaction history or by querying the
              RDFGraphSubmitted event.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
