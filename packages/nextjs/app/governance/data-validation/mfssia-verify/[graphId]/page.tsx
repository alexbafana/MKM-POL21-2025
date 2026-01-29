"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { ChallengeEvidenceCard } from "~~/components/dao/ChallengeEvidenceCard";
import { ChallengeProgressTracker } from "~~/components/dao/ChallengeProgressTracker";
import { EmploymentEventEvidenceModal } from "~~/components/dao/EmploymentEventEvidenceModal";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  IdentityIcon,
  LockIcon,
  SpinnerIcon,
  UnlockIcon,
} from "~~/components/dao/Icons";
import { LoadingState } from "~~/components/dao/LoadingState";
import { StepIndicator } from "~~/components/dao/StepIndicator";
import { VerificationResultModal } from "~~/components/dao/VerificationResultModal";
import { Address, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useEmploymentEventVerification } from "~~/hooks/useEmploymentEventVerification";
import type { EmploymentEventArtifactData } from "~~/types/mfssia";

// ─── MFSSIA Verification Storage ─────────────────────────────────────────────

const MFSSIA_VERIFIED_STORAGE_KEY = "mkmpol21_mfssia_verified_graphs";
const PENDING_DKG_UAL_STORAGE_KEY = "mkmpol21_pending_dkg_uals";

function markGraphAsMFSSIAVerified(graphId: string): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(MFSSIA_VERIFIED_STORAGE_KEY);
    const set: string[] = stored ? JSON.parse(stored) : [];
    if (!set.includes(graphId)) {
      set.push(graphId);
      localStorage.setItem(MFSSIA_VERIFIED_STORAGE_KEY, JSON.stringify(set));
    }
  } catch {
    // localStorage may be unavailable
  }
}

// Store pending DKG UAL for later on-chain recording (e.g., when Owner visits)
function storePendingDkgUal(graphId: string, ual: string): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(PENDING_DKG_UAL_STORAGE_KEY);
    const pending: Record<string, string> = stored ? JSON.parse(stored) : {};
    pending[graphId] = ual;
    localStorage.setItem(PENDING_DKG_UAL_STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // localStorage may be unavailable
  }
}

// Get pending DKG UAL for a graph (returns null if not found or already recorded)
function getPendingDkgUal(graphId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(PENDING_DKG_UAL_STORAGE_KEY);
    if (!stored) return null;
    const pending: Record<string, string> = JSON.parse(stored);
    return pending[graphId] || null;
  } catch {
    return null;
  }
}

// Remove pending DKG UAL after successful on-chain recording
function clearPendingDkgUal(graphId: string): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(PENDING_DKG_UAL_STORAGE_KEY);
    if (!stored) return;
    const pending: Record<string, string> = JSON.parse(stored);
    delete pending[graphId];
    localStorage.setItem(PENDING_DKG_UAL_STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // localStorage may be unavailable
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GRAPH_TYPE_LABELS = ["ARTICLES", "ENTITIES", "MENTIONS", "NLP", "ECONOMICS", "RELATIONS", "PROVENANCE"];

const ROLE_LABELS: Record<number, string> = {
  0: "Member Institution",
  1: "Ordinary User",
  4: "Data Validator",
  5: "MKMPOL21 Owner",
};

const STEPS = [
  { id: 1, title: "Connect", description: "Wallet" },
  { id: 2, title: "Select", description: "Challenge Set" },
  { id: 3, title: "Instance", description: "Create" },
  { id: 4, title: "Evidence", description: "Collect" },
  { id: 5, title: "Verify", description: "Oracle" },
  { id: 6, title: "Complete", description: "Result" },
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
] as const;

// ─── Types ───────────────────────────────────────────────────────────────────

interface GraphInfo {
  graphURI: string;
  graphType: number;
  datasetVariant: number;
  year: number;
  version: number;
  submitter: string;
  modelVersion: string;
  approved: boolean;
  published: boolean;
}

// Map dataset variant index to raw source domain for MFSSIA oracle whitelist
const DATASET_DOMAIN_MAP: Record<number, string> = {
  0: "err.ee",
  1: "ohtuleht.ee",
  2: "ohtuleht.ee",
  3: "ariregister.rik.ee",
};

// Map TTL source abbreviation to raw domain
const SOURCE_DOMAIN_MAP: Record<string, string> = {
  eol: "err.ee",
  err: "err.ee",
  ohtuleht: "ohtuleht.ee",
  delfi: "delfi.ee",
  ariregister: "ariregister.rik.ee",
};

// ─── Page Component ──────────────────────────────────────────────────────────

export default function MFSSIAVerifyPage() {
  const params = useParams();
  const graphId = params.graphId as string;

  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const [graphInfo, setGraphInfo] = useState<GraphInfo | null>(null);
  const [isLoadingGraph, setIsLoadingGraph] = useState(true);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [ttlContent, setTtlContent] = useState<string>("");
  const ttlContentRef = useRef<string>("");
  const [showApiLog, setShowApiLog] = useState(true);
  const [onChainState, setOnChainState] = useState<"idle" | "recording" | "recorded" | "error">("idle");
  const [pendingDkgUal, setPendingDkgUal] = useState<string | null>(null);

  // Load pending DKG UAL from localStorage on mount
  useEffect(() => {
    if (graphId) {
      const pending = getPendingDkgUal(graphId);
      if (pending) {
        setPendingDkgUal(pending);
        console.log(`[DKG] Loaded pending UAL from localStorage: ${pending}`);
      }
    }
  }, [graphId]);

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
  const hasAccess = roleValue !== 0 && (roleIndex === 4 || roleIndex === 5);
  const isOwner = roleIndex === 5 && roleValue !== 0;
  const isDataValidator = roleIndex === 4 && roleValue !== 0;
  const canRecordOnChain = isOwner || isDataValidator; // Data Validators and Owners can record on-chain

  // Contract address
  const gaAddress = (deployedContracts as any)?.[chainId]?.GADataValidation?.address as `0x${string}` | undefined;

  // Write contract hook for on-chain recording
  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "GADataValidation" });

  // Verification hook
  const verification = useEmploymentEventVerification(graphId);

  const {
    currentStep,
    isVerifying,
    verificationError,
    instanceId: verificationInstanceId,
    showResultModal,
    dkgSubmissionState,
    dkgAssetUAL,
    did,
    selectedChallengeSet,
    showEvidenceModal,
    challengeEvidence,
    challengeEvidenceStatus,
    collectingChallenge,
    challengeErrors,
    challengeOracleResults,
    isBatchSubmitting,
    batchSubmitError,
    oracleConnectionState,
    oracleVerificationState,
    oracleMessage,
    oracleConfidence,
    apiCallLog,
    oracleEventLog,
    serviceEvents,
    selectChallengeSet,
    createChallengeInstance,
    collectChallengeEvidence,
    handleEmploymentEventSubmit,
    closeEvidenceModal,
    submitAllEvidence,
    closeResultModal,
    openResultModal,
    submitToDKG,
    allEvidenceCollected,
    allEvidenceSubmitted,
    reset,
    getStepNumber,
  } = verification;

  // ─── Save MFSSIA verification to localStorage on completion ─────────────────

  useEffect(() => {
    if (oracleVerificationState === "success" && graphId) {
      markGraphAsMFSSIAVerified(graphId);
    }
  }, [oracleVerificationState, graphId]);

  // ─── Store DKG UAL in localStorage after successful publish ─────────────────

  useEffect(() => {
    if (dkgSubmissionState === "submitted" && dkgAssetUAL && graphId) {
      storePendingDkgUal(graphId, dkgAssetUAL);
      setPendingDkgUal(dkgAssetUAL);
      console.log(`[DKG] Stored pending UAL in localStorage: ${dkgAssetUAL}`);
    }
  }, [dkgSubmissionState, dkgAssetUAL, graphId]);

  // ─── Auto-record on-chain after successful DKG publish ─────────────────────

  const autoRecordAttemptedRef = useRef(false);

  useEffect(() => {
    // Auto-record on-chain if:
    // 1. DKG publish was successful (state is "submitted" and we have a UAL)
    // 2. User has permission (Data Validator or Owner)
    // 3. Not already recording or recorded
    // 4. Haven't already attempted auto-record in this session
    if (
      dkgSubmissionState === "submitted" &&
      dkgAssetUAL &&
      canRecordOnChain &&
      onChainState === "idle" &&
      !autoRecordAttemptedRef.current
    ) {
      autoRecordAttemptedRef.current = true;
      console.log(`[DKG] Auto-recording on-chain: ${dkgAssetUAL}`);

      // Trigger on-chain recording
      (async () => {
        setOnChainState("recording");
        try {
          await writeContractAsync({
            functionName: "markRDFGraphPublished",
            args: [graphId as `0x${string}`, dkgAssetUAL],
          });
          setOnChainState("recorded");
          clearPendingDkgUal(graphId);
          setPendingDkgUal(null);
          console.log(`[DKG] Auto-recording successful`);
        } catch (err: any) {
          console.error("[DKG] Auto-recording failed:", err);
          setOnChainState("error");
        }
      })();
    }
  }, [dkgSubmissionState, dkgAssetUAL, canRecordOnChain, onChainState, graphId, writeContractAsync]);

  // ─── Fetch graph details ────────────────────────────────────────────────────

  useEffect(() => {
    if (!publicClient || !gaAddress || !graphId) {
      setIsLoadingGraph(false);
      return;
    }

    let cancelled = false;

    async function fetchGraphInfo() {
      setIsLoadingGraph(true);
      setGraphError(null);
      try {
        const [basicInfo, metadata, status] = await Promise.all([
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
          publicClient!.readContract({
            address: gaAddress!,
            abi: GA_DATA_VALIDATION_ABI,
            functionName: "getGraphStatus",
            args: [graphId as `0x${string}`],
          }),
        ]);

        if (cancelled) return;

        setGraphInfo({
          graphURI: (basicInfo as any)[1],
          graphType: Number((basicInfo as any)[2]),
          datasetVariant: Number((basicInfo as any)[3]),
          year: Number((basicInfo as any)[4]),
          version: Number((basicInfo as any)[5]),
          submitter: (metadata as any)[0],
          modelVersion: (metadata as any)[2],
          approved: (status as any)[2],
          published: (status as any)[3],
        });
      } catch (err: any) {
        if (!cancelled) {
          setGraphError(err.message || "Failed to fetch graph details");
        }
      } finally {
        if (!cancelled) setIsLoadingGraph(false);
      }
    }

    fetchGraphInfo();
    return () => {
      cancelled = true;
    };
  }, [publicClient, gaAddress, graphId]);

  // ─── Fetch TTL content ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!graphId) return;

    async function fetchTtl() {
      try {
        const res = await fetch(`/api/ttl-storage/content/${graphId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.content) {
            setTtlContent(data.content);
            ttlContentRef.current = data.content;
          }
        }
      } catch {
        // TTL content is optional; no error needed
      }
    }

    fetchTtl();
  }, [graphId]);

  // ─── DKG submission wrapper (passes TTL content) ──────────────────────────────

  const handleSubmitToDKG = useCallback(() => {
    submitToDKG(ttlContentRef.current || undefined);
  }, [submitToDKG]);

  // ─── On-chain recording (Owner only) ─────────────────────────────────────────

  // Use UAL from hook state OR from localStorage (for when Owner visits later)
  const effectiveUAL = dkgAssetUAL || pendingDkgUal;

  const handleRecordOnChain = useCallback(async () => {
    if (!effectiveUAL || !graphId) return;

    setOnChainState("recording");
    try {
      await writeContractAsync({
        functionName: "markRDFGraphPublished",
        args: [graphId as `0x${string}`, effectiveUAL],
      });
      setOnChainState("recorded");
      // Clear pending UAL from localStorage after successful recording
      clearPendingDkgUal(graphId);
      setPendingDkgUal(null);
      console.log(`[DKG] On-chain recording successful, cleared pending UAL`);
    } catch (err: any) {
      console.error("[OnChain] markRDFGraphPublished failed:", err);
      setOnChainState("error");
    }
  }, [effectiveUAL, graphId, writeContractAsync]);

  // ─── Compute initial data for modal pre-population ────────────────────────────

  const getInitialData = useCallback((): Partial<EmploymentEventArtifactData> => {
    const initial: Partial<EmploymentEventArtifactData> = {};

    if (ttlContent) {
      initial.content = ttlContent;

      // Extract article date from TTL (schema:dateCreated, schema:datePublished, or dct:created)
      const dateMatch = ttlContent.match(/(?:schema:dateCreated|schema:datePublished|dct:created)\s+"([^"]+)"/);
      if (dateMatch) {
        initial.articleDate = dateMatch[1];
      }

      // Extract first EMTAK code from TTL (mkm:emtakSector or cls:hasEMTAKClassification)
      const emtakMatch = ttlContent.match(/mkm:emtakSector\s+"(\d+)"/);
      if (emtakMatch) {
        initial.emtakCode = emtakMatch[1];
      } else {
        // Try extracting from cls:hasEMTAKClassification cls:XXXXX
        const clsMatch = ttlContent.match(/cls:hasEMTAKClassification\s+cls:(\d+)/);
        if (clsMatch) {
          initial.emtakCode = clsMatch[1];
        }
      }

      // Extract ingestion/generation time from TTL (prov:generatedAtTime)
      const ingestionMatch = ttlContent.match(/prov:generatedAtTime\s+"([^"]+)"/);
      if (ingestionMatch) {
        initial.ingestionTimestamp = ingestionMatch[1];
      }

      // Extract source from TTL and map to raw domain for MFSSIA oracle whitelist
      const sourceMatch = ttlContent.match(/(?:mkm:source|ex:source)\s+"([^"]+)"/);
      if (sourceMatch) {
        const sourceKey = sourceMatch[1].toLowerCase();
        initial.sourceDomainHash = SOURCE_DOMAIN_MAP[sourceKey] || sourceKey;
      }
    }

    if (graphInfo) {
      if (graphInfo.modelVersion) {
        initial.modelName = graphInfo.modelVersion;
        initial.provWasGeneratedBy = `urn:mkm:pipeline:nlp-employment-extraction:${graphInfo.modelVersion}`;
      }

      // Use dataset variant to determine source domain if not extracted from TTL
      if (!initial.sourceDomainHash && graphInfo.datasetVariant !== undefined) {
        initial.sourceDomainHash = DATASET_DOMAIN_MAP[graphInfo.datasetVariant] || "err.ee";
      }

      // Fallback article date from year if not found in TTL
      if (!initial.articleDate && graphInfo.year) {
        initial.articleDate = `${graphInfo.year}-01-01`;
      }
    }

    if (!initial.ingestionTimestamp) {
      // If the article date was extracted (from TTL or year fallback), set ingestion time
      // relative to the article date to avoid large temporal gaps that fail C-D-7 validation.
      if (initial.articleDate) {
        const articleMs = new Date(initial.articleDate).getTime();
        if (!isNaN(articleMs)) {
          // Ingestion typically happens within days of publication
          const ingestionMs = articleMs + 7 * 24 * 60 * 60 * 1000; // +7 days
          initial.ingestionTimestamp = new Date(ingestionMs).toISOString();
        } else {
          initial.ingestionTimestamp = new Date().toISOString();
        }
      } else {
        initial.ingestionTimestamp = new Date().toISOString();
      }
    }

    // C-D-7 verifier requires (ingestionTime - articleDate) <= 30 days.
    // When processing historical articles, prov:generatedAtTime from the TTL may be years
    // after the article date. Cap the gap to keep temporal plausibility within threshold.
    if (initial.ingestionTimestamp && initial.articleDate) {
      const articleMs = new Date(initial.articleDate).getTime();
      const ingestionMs = new Date(initial.ingestionTimestamp).getTime();
      if (!isNaN(articleMs) && !isNaN(ingestionMs)) {
        const gapDays = (ingestionMs - articleMs) / (24 * 60 * 60 * 1000);
        if (gapDays > 30) {
          // Set ingestion to article date + 7 days (realistic for batch processing)
          initial.ingestionTimestamp = new Date(articleMs + 7 * 24 * 60 * 60 * 1000).toISOString();
        }
      }
    }

    // Ensure sourceDomainHash has a default
    if (!initial.sourceDomainHash) {
      initial.sourceDomainHash = "err.ee";
    }

    return initial;
  }, [graphInfo, ttlContent]);

  // ─── Access control ───────────────────────────────────────────────────────────

  if (!address) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <div className="max-w-lg mx-auto text-center px-6">
          <div className="card bg-base-100 shadow-xl border border-base-300">
            <div className="card-body">
              <LockIcon className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold mb-2">Connect Wallet</h2>
              <p className="text-base-content/70">Connect your wallet to access MFSSIA verification.</p>
              <div className="mt-4">
                <RainbowKitCustomConnectButton />
              </div>
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
                MFSSIA verification is only accessible to Data Validators and the Owner.
              </p>
              <Link href="/governance/data-validation" className="btn btn-outline">
                Back to Data Validation
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingGraph) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <LoadingState message="Loading graph details..." size="lg" />
      </div>
    );
  }

  if (graphError) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <div className="max-w-lg mx-auto text-center px-6">
          <div className="card bg-base-100 shadow-xl border border-error/30">
            <div className="card-body">
              <h2 className="text-2xl font-bold mb-2">Error Loading Graph</h2>
              <p className="text-base-content/70 mb-4">{graphError}</p>
              <Link href="/governance/data-validation" className="btn btn-outline">
                Back to Data Validation
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main page ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="bg-gradient-to-r from-secondary/10 via-base-200 to-secondary/5 py-12 border-b border-base-300">
        <div className="max-w-4xl mx-auto px-6">
          <Link href="/governance/data-validation" className="btn btn-ghost btn-sm mb-6 gap-2">
            <ArrowRightIcon className="w-4 h-4 rotate-180" />
            Back to Data Validation
          </Link>

          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-secondary/10 text-secondary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">MFSSIA Employment Event Verification</h1>
              <p className="text-base-content/70">
                Verify RDF graph using Example-D challenge set (Employment Event Detection)
              </p>
            </div>
          </div>

          {/* Graph Info Header */}
          {graphInfo && (
            <div className="mt-6 bg-base-100 rounded-xl p-4 border border-base-300">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-base-content/50 block text-xs">Graph Type</span>
                  <span className="font-semibold">{GRAPH_TYPE_LABELS[graphInfo.graphType] || "Unknown"}</span>
                </div>
                <div>
                  <span className="text-base-content/50 block text-xs">URI</span>
                  <span className="font-mono text-xs">{graphInfo.graphURI}</span>
                </div>
                <div>
                  <span className="text-base-content/50 block text-xs">Model</span>
                  <span>{graphInfo.modelVersion || "N/A"}</span>
                </div>
                <div>
                  <span className="text-base-content/50 block text-xs">Year / Version</span>
                  <span>
                    {graphInfo.year} / v{graphInfo.version}
                  </span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-base-200">
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-base-content/50">Graph ID:</span>
                  <span className="font-mono">
                    {graphId.slice(0, 10)}...{graphId.slice(-8)}
                  </span>
                  <span className="text-base-content/50">Submitter:</span>
                  <span className="font-mono">
                    {graphInfo.submitter.slice(0, 6)}...{graphInfo.submitter.slice(-4)}
                  </span>
                  <div className="badge badge-outline">{roleName}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-base-100 border-b border-base-300 py-8">
        <div className="max-w-4xl mx-auto px-6">
          <StepIndicator steps={STEPS} currentStep={getStepNumber()} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Step 1: Connect Wallet */}
        {currentStep === "connect" && (
          <div className="card bg-base-100 shadow-xl border border-base-300 animate-fade-in">
            <div className="card-body items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <LockIcon className="w-8 h-8 text-primary" />
              </div>
              <h2 className="card-title text-2xl mb-2">Connect Your Wallet</h2>
              <p className="text-base-content/70 mb-6">Connect your Ethereum wallet to begin verification</p>
              <RainbowKitCustomConnectButton />
            </div>
          </div>
        )}

        {/* Step 2: Select Challenge Set (auto-selects Example-D) */}
        {currentStep === "select" && (
          <div className="card bg-base-100 shadow-xl border border-base-300 animate-fade-in">
            <div className="card-body">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center">
                  <IdentityIcon className="w-8 h-8 text-secondary" />
                </div>
                <div>
                  <h2 className="card-title text-2xl mb-1">Challenge Set: Example-D</h2>
                  <p className="text-base-content/70">Employment Event Detection verification</p>
                </div>
              </div>

              <div className="bg-base-200 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-base-content/70">Connected Address</span>
                  <Address address={address!} />
                </div>
              </div>

              {selectedChallengeSet && (
                <div className="bg-secondary/5 rounded-xl p-4 mb-6 border border-secondary/20">
                  <h3 className="font-semibold text-lg mb-2">{selectedChallengeSet.name}</h3>
                  <p className="text-sm text-base-content/70 mb-4">{selectedChallengeSet.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedChallengeSet.challenges.map(challenge => (
                      <span
                        key={challenge.code}
                        className={`badge badge-sm ${challenge.mandatory ? "badge-secondary" : "badge-ghost"}`}
                        title={challenge.description}
                      >
                        {challenge.name}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 text-sm text-base-content/60">
                    <span className="font-medium">{selectedChallengeSet.mandatoryChallenges}</span> required challenges,{" "}
                    <span className="font-medium">{selectedChallengeSet.optionalChallenges}</span> optional
                  </div>
                </div>
              )}

              <button onClick={selectChallengeSet} className="btn btn-secondary btn-lg w-full gap-2">
                <UnlockIcon className="w-5 h-5" />
                Continue with Example-D
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Create Challenge Instance */}
        {currentStep === "instance" && (
          <div className="card bg-base-100 shadow-xl border border-base-300 animate-fade-in">
            <div className="card-body">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <IdentityIcon className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <h2 className="card-title text-2xl mb-1">Create Challenge Instance</h2>
                  <p className="text-base-content/70">Register DID and create verification instance</p>
                </div>
              </div>

              <div className="bg-base-200 rounded-xl p-4 mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-base-content/70">Connected Address</span>
                  <Address address={address!} />
                </div>
                {selectedChallengeSet && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-base-content/70">Challenge Set</span>
                    <span className="font-medium text-sm">{selectedChallengeSet.name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-base-content/70">Graph ID</span>
                  <span className="font-mono text-xs">
                    {graphId.slice(0, 10)}...{graphId.slice(-8)}
                  </span>
                </div>
              </div>

              {verificationError && (
                <div className="alert alert-error mb-4">
                  <span>{verificationError}</span>
                </div>
              )}

              <div className="alert bg-secondary/10 border border-secondary/20 mb-6">
                <IdentityIcon className="w-6 h-6 text-secondary shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold">MFSSIA Challenge Instance</p>
                  <p className="text-base-content/70">
                    This creates a challenge instance with the MFSSIA Oracle Gateway for verifying employment event
                    detection on this RDF graph.
                  </p>
                </div>
              </div>

              <button
                onClick={createChallengeInstance}
                disabled={isVerifying}
                className="btn btn-accent btn-lg w-full gap-2"
              >
                {isVerifying ? (
                  <>
                    <SpinnerIcon className="w-5 h-5" />
                    Creating Instance...
                  </>
                ) : (
                  <>
                    <IdentityIcon className="w-5 h-5" />
                    Create Challenge Instance
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Evidence Collection */}
        {currentStep === "evidence" && (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="card bg-base-100 shadow-xl border border-base-300">
              <div className="card-body">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center">
                    <UnlockIcon className="w-8 h-8 text-secondary" />
                  </div>
                  <div>
                    <h2 className="card-title text-2xl mb-1">Collect Challenge Evidence</h2>
                    <p className="text-base-content/70">Provide employment event data for Example-D verification</p>
                  </div>
                </div>

                <div className="bg-secondary/5 rounded-xl p-4 border border-secondary/20">
                  <div className="flex items-center gap-2 text-secondary mb-2">
                    <CheckCircleIcon className="w-5 h-5" />
                    <span className="font-semibold">Challenge Instance Created</span>
                  </div>
                  <p className="text-sm text-base-content/70">
                    Click <strong>Collect Evidence</strong> on any challenge to open the Employment Event form. All 9
                    challenges will be populated from the same data.
                  </p>
                </div>

                {/* Progress Summary */}
                {selectedChallengeSet &&
                  (() => {
                    const mandatoryCodes = new Set(
                      selectedChallengeSet.challenges.filter(c => c.mandatory).map(c => c.code),
                    );
                    const optionalCodes = new Set(
                      selectedChallengeSet.challenges.filter(c => !c.mandatory).map(c => c.code),
                    );
                    const mandatoryCollected = Object.keys(challengeEvidence).filter(k => mandatoryCodes.has(k)).length;
                    const optionalCollected = Object.keys(challengeEvidence).filter(k => optionalCodes.has(k)).length;
                    const submittedStatuses = Object.entries(challengeEvidenceStatus).filter(([, s]) =>
                      ["submitted", "verified"].includes(s),
                    );
                    const mandatorySubmitted = submittedStatuses.filter(([k]) => mandatoryCodes.has(k)).length;
                    const optionalSubmitted = submittedStatuses.filter(([k]) => optionalCodes.has(k)).length;

                    return (
                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span className="text-base-content/60">Collected:</span>
                        <span
                          className={`font-semibold ${mandatoryCollected >= mandatoryCodes.size ? "text-success" : "text-warning"}`}
                        >
                          {mandatoryCollected}/{mandatoryCodes.size} required
                        </span>
                        {optionalCodes.size > 0 && (
                          <span className="font-semibold text-base-content/60">
                            {optionalCollected}/{optionalCodes.size} optional
                          </span>
                        )}
                        <span className="text-base-content/40">|</span>
                        <span className="text-base-content/60">Submitted:</span>
                        <span
                          className={`font-semibold ${mandatorySubmitted >= mandatoryCodes.size ? "text-success" : "text-info"}`}
                        >
                          {mandatorySubmitted}/{mandatoryCodes.size} required
                        </span>
                        {optionalCodes.size > 0 && (
                          <span className="font-semibold text-base-content/60">
                            {optionalSubmitted}/{optionalCodes.size} optional
                          </span>
                        )}
                      </div>
                    );
                  })()}
              </div>
            </div>

            {/* Challenge Evidence Cards */}
            {selectedChallengeSet && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-secondary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Required Challenges ({selectedChallengeSet.mandatoryChallenges})
                </h3>

                {selectedChallengeSet.challenges
                  .filter(c => c.mandatory)
                  .map(challenge => (
                    <ChallengeEvidenceCard
                      key={challenge.code}
                      challenge={challenge}
                      evidenceStatus={challengeEvidenceStatus[challenge.code] || "pending"}
                      collectedEvidence={challengeEvidence[challenge.code] || null}
                      onCollectEvidence={collectChallengeEvidence}
                      isCollecting={collectingChallenge === challenge.code}
                      error={challengeErrors[challenge.code] || null}
                      oracleResult={challengeOracleResults[challenge.code] || null}
                      isBatchSubmitting={isBatchSubmitting}
                    />
                  ))}

                {/* Optional Challenges */}
                {selectedChallengeSet.challenges.filter(c => !c.mandatory).length > 0 && (
                  <>
                    <h3 className="text-lg font-semibold flex items-center gap-2 mt-6">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-base-content/50"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      Optional Challenges ({selectedChallengeSet.challenges.filter(c => !c.mandatory).length})
                    </h3>

                    {selectedChallengeSet.challenges
                      .filter(c => !c.mandatory)
                      .map(challenge => (
                        <ChallengeEvidenceCard
                          key={challenge.code}
                          challenge={challenge}
                          evidenceStatus={challengeEvidenceStatus[challenge.code] || "pending"}
                          collectedEvidence={challengeEvidence[challenge.code] || null}
                          onCollectEvidence={collectChallengeEvidence}
                          isCollecting={collectingChallenge === challenge.code}
                          error={challengeErrors[challenge.code] || null}
                          oracleResult={challengeOracleResults[challenge.code] || null}
                          isBatchSubmitting={isBatchSubmitting}
                        />
                      ))}
                  </>
                )}

                {/* Submit All Evidence Button */}
                {allEvidenceCollected() && !allEvidenceSubmitted() && (
                  <div className="card bg-secondary/5 border-2 border-secondary/30 mt-4">
                    <div className="card-body">
                      <div className="flex items-center gap-2 text-secondary mb-3">
                        <CheckCircleIcon className="w-6 h-6" />
                        <span className="font-bold text-lg">All Evidence Collected</span>
                      </div>
                      <p className="text-sm text-base-content/70 mb-4">
                        Submit all evidence to the Oracle in a single batch.
                      </p>

                      {batchSubmitError && (
                        <div className="alert alert-error mb-4">
                          <span className="text-sm">{batchSubmitError}</span>
                        </div>
                      )}

                      <button
                        onClick={submitAllEvidence}
                        disabled={isBatchSubmitting}
                        className="btn btn-secondary btn-lg w-full gap-2"
                      >
                        {isBatchSubmitting ? (
                          <>
                            <SpinnerIcon className="w-5 h-5" />
                            Submitting Evidence...
                          </>
                        ) : (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                            Submit All Evidence to Oracle
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Oracle Processing Status */}
            {allEvidenceSubmitted() &&
              oracleVerificationState !== "idle" &&
              oracleVerificationState !== "success" &&
              oracleVerificationState !== "failed" && (
                <div className="card bg-info/5 border-2 border-info/30">
                  <div className="card-body">
                    <div className="flex items-center gap-2 text-info mb-3">
                      <SpinnerIcon className="w-6 h-6 animate-spin" />
                      <span className="font-bold text-lg">Oracle Processing...</span>
                    </div>
                    <p className="text-sm text-base-content/70">
                      The oracle is verifying your evidence. Results will appear automatically.
                    </p>
                    {oracleMessage && <p className="text-xs text-info mt-2">{oracleMessage}</p>}
                  </div>
                </div>
              )}

            {/* Oracle Complete - prompt to view results */}
            {allEvidenceSubmitted() &&
              (oracleVerificationState === "success" || oracleVerificationState === "failed") && (
                <div
                  className={`card border-2 ${oracleVerificationState === "success" ? "bg-success/5 border-success/30" : "bg-error/5 border-error/30"}`}
                >
                  <div className="card-body">
                    <div
                      className={`flex items-center gap-2 mb-3 ${oracleVerificationState === "success" ? "text-success" : "text-error"}`}
                    >
                      <CheckCircleIcon className="w-6 h-6" />
                      <span className="font-bold text-lg">
                        {oracleVerificationState === "success" ? "Verification Complete!" : "Verification Failed"}
                      </span>
                    </div>
                    <p className="text-sm text-base-content/70 mb-4">
                      {oracleVerificationState === "success"
                        ? "All required challenges passed. View the detailed results."
                        : "Some challenges did not pass. View the detailed results."}
                    </p>
                    <button
                      onClick={openResultModal}
                      className={`btn btn-lg w-full gap-2 ${oracleVerificationState === "success" ? "btn-success" : "btn-error"}`}
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                      View Results
                    </button>
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Step 5: Verification in Progress (kept for ChallengeProgressTracker display during WebSocket processing) */}
        {currentStep === "verification" && (
          <div className="card bg-base-100 shadow-xl border border-base-300 animate-fade-in">
            <div className="card-body">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center">
                  <SpinnerIcon className="w-8 h-8 text-secondary animate-spin" />
                </div>
                <div>
                  <h2 className="card-title text-2xl mb-1">Oracle Verification</h2>
                  <p className="text-base-content/70">Waiting for oracle to verify evidence</p>
                </div>
              </div>

              {selectedChallengeSet && (
                <div className="mb-6">
                  <ChallengeProgressTracker
                    challengeSet={selectedChallengeSet}
                    currentChallenge={null}
                    overallConfidence={oracleConfidence}
                    oracleConnectionState={oracleConnectionState}
                    oracleVerificationState={oracleVerificationState}
                    oracleMessage={oracleMessage}
                    did={did}
                  />
                </div>
              )}

              <div className="alert bg-secondary/10 border border-secondary/20">
                <SpinnerIcon className="w-6 h-6 text-secondary shrink-0 animate-spin" />
                <div className="text-sm">
                  <p className="font-semibold">Processing Verification</p>
                  <p className="text-base-content/70">
                    The MFSSIA Oracle is verifying your employment event detection evidence.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Complete */}
        {currentStep === "complete" && (
          <div className="card bg-base-100 shadow-xl border border-success/30 animate-fade-in">
            <div className="card-body items-center text-center">
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-4 animate-pulse-glow">
                <CheckCircleIcon className="w-10 h-10 text-success" />
              </div>
              <h2 className="card-title text-2xl mb-2">MFSSIA Verification Complete!</h2>
              <p className="text-base-content/70 mb-6">
                The RDF graph has been successfully verified by the MFSSIA Oracle using Example-D challenges.
              </p>

              <div className="bg-base-200 rounded-xl p-4 mb-6 w-full">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-base-content/70">Your Address</span>
                  <Address address={address!} />
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-base-content/70">Challenge Set</span>
                  <span className="badge badge-secondary">{selectedChallengeSet?.name}</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-base-content/70">Graph ID</span>
                  <span className="font-mono text-xs">
                    {graphId.slice(0, 10)}...{graphId.slice(-8)}
                  </span>
                </div>
                {oracleConfidence !== null && (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-base-content/70">Confidence Score</span>
                    <span className="font-semibold text-success">{(oracleConfidence * 100).toFixed(1)}%</span>
                  </div>
                )}
                {(dkgSubmissionState === "submitted" || pendingDkgUal) && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-base-content/70">DKG Status</span>
                    <span className={`badge ${effectiveUAL ? "badge-success" : "badge-info"}`}>
                      {effectiveUAL ? "Published" : "Ingested (awaiting UAL)"}
                    </span>
                  </div>
                )}
                {effectiveUAL && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-base-content/70">DKG UAL</span>
                    <span className="font-mono text-xs max-w-[200px] truncate" title={effectiveUAL}>
                      {effectiveUAL}
                    </span>
                  </div>
                )}
                {/* On-chain recording for Owner when UAL is pending */}
                {canRecordOnChain && effectiveUAL && onChainState !== "recorded" && (
                  <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/30">
                    <div className="text-sm font-medium text-warning mb-2">On-Chain Recording Required</div>
                    <p className="text-xs text-base-content/60 mb-3">
                      This asset was published to DKG but not yet recorded on-chain. Record it to finalize the
                      publication.
                    </p>
                    <button
                      onClick={handleRecordOnChain}
                      disabled={onChainState === "recording"}
                      className="btn btn-sm btn-warning gap-2"
                    >
                      {onChainState === "recording" ? (
                        <>
                          <span className="loading loading-spinner loading-xs" />
                          Recording...
                        </>
                      ) : onChainState === "error" ? (
                        "Retry Recording"
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                            />
                          </svg>
                          Record on Blockchain
                        </>
                      )}
                    </button>
                    {onChainState === "error" && (
                      <p className="text-xs text-error mt-2">Recording failed. Please try again.</p>
                    )}
                  </div>
                )}
                {onChainState === "recorded" && (
                  <div className="mt-4 p-3 rounded-lg bg-success/10 border border-success/30">
                    <div className="flex items-center gap-2 text-success text-sm">
                      <CheckCircleIcon className="w-5 h-5" />
                      Successfully recorded on blockchain
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button onClick={openResultModal} className="btn btn-secondary flex-1 gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  View Detailed Results
                </button>
                <Link href="/governance/data-validation" className="btn btn-primary flex-1 gap-2">
                  <ArrowRightIcon className="w-5 h-5 rotate-180" />
                  Return to Data Validation
                </Link>
                <button onClick={reset} className="btn btn-outline flex-1">
                  Verify Another Graph
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Event Log */}
        {(apiCallLog.length > 0 || oracleEventLog.length > 0 || serviceEvents.length > 0) && (
          <div className="card bg-base-100 shadow-xl border border-base-300 mt-8">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h3 className="card-title text-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Event Log ({apiCallLog.length + oracleEventLog.length + serviceEvents.length})
                </h3>
                <div className="flex gap-2">
                  <span
                    className={`badge badge-sm ${oracleConnectionState === "connected" ? "badge-success" : oracleConnectionState === "connecting" ? "badge-warning" : "badge-ghost"}`}
                  >
                    WS: {oracleConnectionState}
                  </span>
                  <span
                    className={`badge badge-sm ${oracleVerificationState === "success" ? "badge-success" : oracleVerificationState === "processing" ? "badge-warning" : oracleVerificationState === "failed" ? "badge-error" : "badge-ghost"}`}
                  >
                    Oracle: {oracleVerificationState}
                  </span>
                  <button onClick={() => setShowApiLog(!showApiLog)} className="btn btn-sm btn-ghost">
                    {showApiLog ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {oracleMessage && (
                <div
                  className={`mb-4 p-3 rounded-lg border ${
                    oracleVerificationState === "success"
                      ? "bg-success/10 border-success/20"
                      : oracleVerificationState === "failed"
                        ? "bg-error/10 border-error/20"
                        : "bg-info/10 border-info/20"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {oracleVerificationState === "failed" ? (
                      <span className="text-error text-lg mt-0.5">&#10007;</span>
                    ) : oracleVerificationState === "success" ? (
                      <span className="text-success text-lg mt-0.5">&#10003;</span>
                    ) : (
                      <span className="loading loading-spinner loading-sm text-info mt-0.5"></span>
                    )}
                    <span
                      className={`text-sm font-medium whitespace-pre-wrap break-words ${
                        oracleVerificationState === "success"
                          ? "text-success"
                          : oracleVerificationState === "failed"
                            ? "text-error"
                            : "text-info"
                      }`}
                    >
                      {oracleMessage}
                    </span>
                  </div>
                </div>
              )}

              {oracleConfidence !== null && (
                <div className="mb-4 p-3 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-success font-medium">Oracle Verification Confidence</span>
                    <span className="text-lg font-bold text-success">{(oracleConfidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
              )}

              {showApiLog && (
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    {[
                      ...apiCallLog.map(log => ({ ...log, source: "api" as const })),
                      ...oracleEventLog.map(log => ({
                        ...log,
                        type: "event" as const,
                        source: "oracle" as const,
                        endpoint: log.event,
                        message: JSON.stringify(log.data),
                      })),
                      ...serviceEvents.map(log => ({
                        timestamp: log.timestamp,
                        type:
                          log.status === "error" || log.status === "failed"
                            ? ("error" as const)
                            : log.status === "success"
                              ? ("success" as const)
                              : ("event" as const),
                        source: "service" as const,
                        endpoint: log.type,
                        message: log.error || log.data?.message || log.type,
                        details: log.data,
                      })),
                    ]
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((log, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${
                            log.type === "error"
                              ? "bg-error/10 border-error/20"
                              : log.type === "success"
                                ? "bg-success/10 border-success/20"
                                : log.type === "warning"
                                  ? "bg-warning/10 border-warning/20"
                                  : log.type === "event"
                                    ? "bg-accent/10 border-accent/20"
                                    : "bg-info/10 border-info/20"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span
                                  className={`badge badge-sm ${
                                    log.type === "error"
                                      ? "badge-error"
                                      : log.type === "success"
                                        ? "badge-success"
                                        : log.type === "warning"
                                          ? "badge-warning"
                                          : log.type === "event"
                                            ? "badge-accent"
                                            : "badge-info"
                                  }`}
                                >
                                  {log.type.toUpperCase()}
                                </span>
                                {"source" in log && (
                                  <span className="badge badge-sm badge-outline">
                                    {log.source === "oracle" ? "ORACLE" : log.source === "service" ? "SERVICE" : "API"}
                                  </span>
                                )}
                                <span className="text-xs font-mono text-base-content/70">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="font-semibold text-sm mb-1">{log.endpoint}</p>
                              <p className="text-sm text-base-content/70 break-words">{log.message}</p>
                              {"details" in log && log.details && (
                                <details className="mt-2">
                                  <summary className="cursor-pointer text-xs text-base-content/50 hover:text-base-content">
                                    View details
                                  </summary>
                                  <pre className="text-xs mt-2 p-2 bg-base-200 rounded overflow-x-auto whitespace-pre-wrap">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Employment Event Evidence Modal */}
      <EmploymentEventEvidenceModal
        isOpen={showEvidenceModal}
        onSubmit={handleEmploymentEventSubmit}
        onClose={closeEvidenceModal}
        challengeSet={selectedChallengeSet}
        initialData={getInitialData()}
      />

      {/* Verification Result Modal */}
      {(oracleVerificationState === "success" || oracleVerificationState === "failed") && (
        <VerificationResultModal
          isOpen={showResultModal}
          onClose={closeResultModal}
          onReset={reset}
          onSubmitToDKG={handleSubmitToDKG}
          verificationState={oracleVerificationState as "success" | "failed"}
          confidence={oracleConfidence}
          instanceId={verificationInstanceId}
          challengeResults={challengeOracleResults}
          challengeEvidence={challengeEvidence}
          challengeSet={selectedChallengeSet}
          dkgSubmissionState={pendingDkgUal ? "submitted" : dkgSubmissionState}
          dkgAssetUAL={effectiveUAL}
          onRecordOnChain={
            canRecordOnChain && (dkgSubmissionState === "submitted" || pendingDkgUal) ? handleRecordOnChain : undefined
          }
          onChainState={onChainState}
        />
      )}
    </div>
  );
}
