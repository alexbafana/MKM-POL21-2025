"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { zeroAddress } from "viem";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { ArrowRightIcon, CheckCircleIcon, DataIcon, LockIcon, SpinnerIcon, UploadIcon } from "~~/components/dao";
import { LoadingState } from "~~/components/dao/LoadingState";
import { Address } from "~~/components/scaffold-eth";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { getMFSSIAService } from "~~/services/MFSSIAService";
import { generateAllExampleDEvidence, sha256Hash, validateRDFSyntax } from "~~/utils/evidenceGeneration";

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

interface RDFDocument {
  id: string;
  filename: string;
  content: string;
  uploadedAt: Date;
  isValidated: boolean;
  validationError: string | null;
  isSubmitted: boolean;
  submittedAt: Date | null;
  // MFSSIA-specific fields
  did?: string;
  instanceId?: string;
  attestationUAL?: string;
  challengesPassed?: number;
  documentHash?: string;
  // New RDF graph fields
  graphType?: number; // 0=ARTICLES, 1=ENTITIES, 2=MENTIONS, 3=NLP, 4=ECONOMICS, 5=RELATIONS, 6=PROVENANCE
  datasetVariant?: number; // 0=ERR_ONLINE, 1=OL_ONLINE, 2=OL_PRINT, 3=ARIREGISTER
  year?: number;
  modelVersion?: string;
  graphURI?: string;
  graphId?: string; // Returned from contract
}

/**
 * Data Provision Page - RDF Upload and Management
 * Only accessible to Member Institution role (index 0) and Owner (index 5)
 */
export default function DataProvisionPage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const mkmpAddress = useMkmpAddress();
  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "GADataValidation" });

  // Check if MFSSIA is enabled
  const mfssiaEnabled = process.env.NEXT_PUBLIC_MFSSIA_ENABLED === "true";

  const [rdfDocuments, setRdfDocuments] = useState<RDFDocument[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // RDF Graph metadata
  const [graphType, setGraphType] = useState<number>(0); // Default: ARTICLES
  const [datasetVariant, setDatasetVariant] = useState<number>(0); // Default: ERR_ONLINE
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [modelVersion, setModelVersion] = useState<string>("EstBERT-1.0");

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

  const { roleIndex, isAuthorized } = useMemo(() => {
    const v = roleRaw ? Number(roleRaw) : 0;
    const idx = v & 31;
    return {
      roleIndex: idx,
      // Only Member Institution (index 0) and Owner (index 5) can access
      isAuthorized: v !== 0 && (idx === 0 || idx === 5),
    };
  }, [roleRaw]);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file extension
      if (!file.name.endsWith(".rdf") && !file.name.endsWith(".ttl") && !file.name.endsWith(".xml")) {
        alert("Please select a valid RDF file (.rdf, .ttl, or .xml)");
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  // Upload RDF file
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // Read file content
      const content = await selectedFile.text();

      // Generate graphURI based on graph type
      const graphTypeNames = ["articles", "entities", "mentions", "nlp", "economics", "relations", "provenance"];
      const graphTypeName = graphTypeNames[graphType] || "graph";
      const graphURI = `urn:graph:${graphTypeName}:${datasetVariant}:${year}`;

      // Create new document entry
      const newDoc: RDFDocument = {
        id: `rdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        filename: selectedFile.name,
        content,
        uploadedAt: new Date(),
        isValidated: false,
        validationError: null,
        isSubmitted: false,
        submittedAt: null,
        graphType,
        datasetVariant,
        year,
        modelVersion,
        graphURI,
      };

      setRdfDocuments(prev => [...prev, newDoc]);
      setSelectedFile(null);

      // Reset file input
      const fileInput = document.getElementById("rdf-file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      alert("Failed to upload file: " + (error as Error).message);
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, graphType, datasetVariant, year, modelVersion]);

  // Validate RDF with MFSSIA Example D
  const handleValidate = useCallback(
    async (docId: string) => {
      if (!address) {
        alert("Please connect your wallet first");
        return;
      }

      setValidatingId(docId);
      try {
        const doc = rdfDocuments.find(d => d.id === docId);
        if (!doc) return;

        console.log("[RDF Validation] Starting MFSSIA Example D validation...");

        // Step 1: Basic RDF syntax validation
        const syntaxCheck = validateRDFSyntax(doc.content);
        if (!syntaxCheck.isValid) {
          setRdfDocuments(prev =>
            prev.map(d =>
              d.id === docId
                ? {
                    ...d,
                    isValidated: false,
                    validationError: `RDF Syntax Error: ${syntaxCheck.errors.join(", ")}`,
                  }
                : d,
            ),
          );
          return;
        }

        // If MFSSIA is not enabled, use basic validation only
        if (!mfssiaEnabled) {
          console.log("[RDF Validation] MFSSIA disabled - using basic validation");
          setRdfDocuments(prev =>
            prev.map(d =>
              d.id === docId
                ? {
                    ...d,
                    isValidated: true,
                    validationError: null,
                    challengesPassed: 9, // Mock all challenges passed
                  }
                : d,
            ),
          );
          return;
        }

        // Real MFSSIA Example D validation
        const mfssia = getMFSSIAService();
        const did = `did:web:rdf:${address}:${docId}`;

        // Step 2: Register DID with Example-D challenge set
        console.log(`[RDF Validation] Registering DID: ${did}`);
        await mfssia.registerDID(did, "mfssia:Example-D", {
          roleType: "DATA_VALIDATOR",
          documentId: docId,
          filename: doc.filename,
        });

        // Step 3: Create Challenge Instance for Example D
        console.log("[RDF Validation] Creating Example-D challenge instance...");
        const instance = await mfssia.createChallengeInstance(did, "mfssia:Example-D");

        // Step 4: Generate all Example D evidence
        console.log("[RDF Validation] Generating evidence for 9 challenges...");
        const documentHash = await sha256Hash(doc.content);
        const allEvidence = await generateAllExampleDEvidence(doc.content, {
          companyName: "Institution", // Could be extracted from user profile
          governanceSignature: "", // Optional governance signature
        });

        // Step 5: Submit all evidence
        console.log("[RDF Validation] Submitting evidence to MFSSIA...");
        const evidenceList = Object.entries(allEvidence).map(([challengeCode, evidence]) => ({
          challengeCode,
          evidence,
        }));

        await mfssia.submitEvidenceBatch({
          challengeInstanceId: instance.id,
          responses: evidenceList.map(e => ({ challengeId: e.challengeCode, evidence: e.evidence })),
        });
        console.log("[RDF Validation] All evidence submitted successfully");

        // Step 6: Poll for attestation
        console.log("[RDF Validation] Waiting for oracle verification...");
        const attestation = await mfssia.pollForAttestation(did, 30, 2000);

        const challengesPassed = attestation.oracleProof.passedChallenges.length;
        const isValid = challengesPassed >= 8; // Require 8/9 challenges

        console.log(
          `[RDF Validation] Attestation received: ${challengesPassed}/9 challenges passed (${attestation.oracleProof.confidence * 100}% confidence)`,
        );

        // Update document with validation results
        setRdfDocuments(prev =>
          prev.map(d =>
            d.id === docId
              ? {
                  ...d,
                  isValidated: isValid,
                  validationError: isValid ? null : `Only ${challengesPassed}/9 challenges passed (8 required)`,
                  did,
                  instanceId: instance.id,
                  attestationUAL: attestation.ual,
                  challengesPassed,
                  documentHash,
                }
              : d,
          ),
        );

        if (isValid) {
          alert(`RDF validated successfully! ${challengesPassed}/9 challenges passed.`);
        } else {
          alert(`Validation failed: Only ${challengesPassed}/9 challenges passed (8 required).`);
        }
      } catch (error: any) {
        console.error("[RDF Validation] Error:", error);
        setRdfDocuments(prev =>
          prev.map(d =>
            d.id === docId
              ? {
                  ...d,
                  isValidated: false,
                  validationError: error.message || "Validation failed",
                }
              : d,
          ),
        );
        alert("Validation failed: " + error.message);
      } finally {
        setValidatingId(null);
      }
    },
    [address, rdfDocuments, mfssiaEnabled],
  );

  // Submit RDF document to smart contract
  const handleSubmit = useCallback(
    async (docId: string) => {
      if (!address) {
        alert("Please connect your wallet first");
        return;
      }

      setSubmittingId(docId);
      try {
        const doc = rdfDocuments.find(d => d.id === docId);
        if (!doc) return;

        if (!doc.isValidated) {
          alert("Please validate the document before submitting");
          return;
        }

        if (!doc.documentHash) {
          alert("Missing document hash. Please validate again.");
          return;
        }

        // Ensure all required graph metadata is present
        if (
          doc.graphType === undefined ||
          doc.datasetVariant === undefined ||
          !doc.year ||
          !doc.modelVersion ||
          !doc.graphURI
        ) {
          alert("Missing graph metadata. Please re-upload the file.");
          return;
        }

        console.log("[RDF Submission] Submitting to GADataValidation smart contract...");
        console.log(`Graph URI: ${doc.graphURI}`);
        console.log(`Document Hash: ${doc.documentHash}`);
        console.log(`Graph Type: ${doc.graphType}`);
        console.log(`Dataset Variant: ${doc.datasetVariant}`);
        console.log(`Year: ${doc.year}`);
        console.log(`Model Version: ${doc.modelVersion}`);

        // Call smart contract submitRDFGraph function
        const result = await writeContractAsync({
          functionName: "submitRDFGraph",
          args: [
            doc.graphURI,
            doc.documentHash as `0x${string}`,
            doc.graphType,
            doc.datasetVariant,
            BigInt(doc.year),
            doc.modelVersion,
          ],
        });

        console.log(`[RDF Submission] Transaction result:`, result);

        setRdfDocuments(prev =>
          prev.map(d => {
            if (d.id === docId) {
              return {
                ...d,
                isSubmitted: true,
                submittedAt: new Date(),
                graphId: result as string, // Store graphId returned from contract
              };
            }
            return d;
          }),
        );

        alert(
          `RDF graph submitted successfully!\n\nGraph URI: ${doc.graphURI}\nGraph Type: ${["ARTICLES", "ENTITIES", "MENTIONS", "NLP", "ECONOMICS", "RELATIONS", "PROVENANCE"][doc.graphType]}\nDataset: ${["ERR Online", "ÕL Online", "ÕL Print", "Äriregister"][doc.datasetVariant]}\nYear: ${doc.year}\n\nThe Validation Committee will review your submission.`,
        );
      } catch (error: any) {
        console.error("[RDF Submission] Error:", error);
        alert("Submission failed: " + (error?.shortMessage || error?.message || "Unknown error"));
      } finally {
        setSubmittingId(null);
      }
    },
    [address, rdfDocuments, writeContractAsync],
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
              <p className="text-base-content/70 mb-6">
                Please connect your wallet to access the data provision system.
              </p>
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
                This page is only accessible to Member Institutions and DAO Owners.
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

  // Authorized - Data Provision Interface
  return (
    <div className="min-h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="bg-gradient-to-r from-success/10 via-primary/5 to-success/10 py-12 border-b border-base-300">
        <div className="max-w-6xl mx-auto px-6">
          <Link href="/dashboard" className="btn btn-ghost btn-sm mb-6 gap-2">
            <ArrowRightIcon className="w-4 h-4 rotate-180" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-success/10 text-success">
              <DataIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Data Provision</h1>
              <p className="text-base-content/70">Upload and manage RDF data files for committee validation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Upload Section */}
        <div className="card bg-base-100 shadow-xl border border-base-300 mb-8">
          <div className="card-body">
            <h2 className="card-title flex items-center gap-2">
              <UploadIcon className="w-6 h-6 text-primary" />
              Upload RDF Document
            </h2>
            <p className="text-sm text-base-content/70 mb-4">
              Select and upload RDF files (.rdf, .ttl, or .xml format) with metadata
            </p>

            {/* Graph Metadata Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Graph Type</span>
                </label>
                <select
                  value={graphType}
                  onChange={e => setGraphType(Number(e.target.value))}
                  className="select select-bordered select-primary"
                >
                  <option value={0}>ARTICLES - Article metadata</option>
                  <option value={1}>ENTITIES - Named entities</option>
                  <option value={2}>MENTIONS - Entity mentions</option>
                  <option value={3}>NLP - NLP analysis results</option>
                  <option value={4}>ECONOMICS - Economic data</option>
                  <option value={5}>RELATIONS - Entity relations</option>
                  <option value={6}>PROVENANCE - Data provenance</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Dataset Variant</span>
                </label>
                <select
                  value={datasetVariant}
                  onChange={e => setDatasetVariant(Number(e.target.value))}
                  className="select select-bordered select-primary"
                >
                  <option value={0}>ERR Online - ERR online content</option>
                  <option value={1}>Õhtuleht Online - ÕL online content</option>
                  <option value={2}>Õhtuleht Print - ÕL print content</option>
                  <option value={3}>Äriregister - Business Registry</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Dataset Year</span>
                </label>
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="input input-bordered input-primary"
                  placeholder="e.g., 2024"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">NLP Model Version</span>
                </label>
                <input
                  type="text"
                  value={modelVersion}
                  onChange={e => setModelVersion(e.target.value)}
                  className="input input-bordered input-primary"
                  placeholder="e.g., EstBERT-1.0"
                />
              </div>
            </div>

            <div className="divider">File Selection</div>

            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="form-control flex-1">
                <label className="label">
                  <span className="label-text">Select RDF File</span>
                </label>
                <input
                  id="rdf-file-input"
                  type="file"
                  accept=".rdf,.ttl,.xml"
                  onChange={handleFileSelect}
                  className="file-input file-input-bordered file-input-primary w-full"
                />
              </div>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="btn btn-primary gap-2 min-w-[150px]"
              >
                {isUploading ? (
                  <>
                    <SpinnerIcon className="w-5 h-5" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadIcon className="w-5 h-5" />
                    Upload File
                  </>
                )}
              </button>
            </div>

            {selectedFile && (
              <div className="alert bg-info/10 border border-info/20 mt-4">
                <DataIcon className="w-5 h-5 text-info shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold">Selected: {selectedFile.name}</p>
                  <p className="text-base-content/70">Size: {(selectedFile.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Documents List */}
        <div className="card bg-base-100 shadow-xl border border-base-300">
          <div className="card-body">
            <h2 className="card-title flex items-center gap-2 mb-4">
              <DataIcon className="w-6 h-6 text-accent" />
              Uploaded Documents ({rdfDocuments.length})
            </h2>

            {rdfDocuments.length === 0 ? (
              <div className="text-center py-12">
                <DataIcon className="w-16 h-16 text-base-content/20 mx-auto mb-4" />
                <p className="text-base-content/60">No documents uploaded yet</p>
                <p className="text-sm text-base-content/50 mt-2">Upload your first RDF document to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rdfDocuments.map(doc => (
                  <div key={doc.id} className="card bg-base-200 border border-base-300">
                    <div className="card-body">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{doc.filename}</h3>
                          <div className="flex flex-wrap gap-2 text-xs mb-2">
                            <div className="badge badge-outline">Uploaded: {doc.uploadedAt.toLocaleDateString()}</div>
                            {doc.isValidated && !doc.validationError && (
                              <div className="badge badge-success gap-1">
                                <CheckCircleIcon className="w-3 h-3" />
                                Validated
                              </div>
                            )}
                            {doc.validationError && <div className="badge badge-error">Validation Failed</div>}
                            {doc.isSubmitted && (
                              <div className="badge badge-info gap-1">
                                <CheckCircleIcon className="w-3 h-3" />
                                Submitted
                              </div>
                            )}
                          </div>
                          {/* RDF Graph Metadata */}
                          {doc.graphType !== undefined && (
                            <div className="grid grid-cols-2 gap-2 text-xs bg-base-300/30 rounded-lg p-2 mt-2">
                              <div>
                                <span className="text-base-content/60">Graph Type:</span>{" "}
                                <span className="font-semibold">
                                  {
                                    ["ARTICLES", "ENTITIES", "MENTIONS", "NLP", "ECONOMICS", "RELATIONS", "PROVENANCE"][
                                      doc.graphType
                                    ]
                                  }
                                </span>
                              </div>
                              <div>
                                <span className="text-base-content/60">Dataset:</span>{" "}
                                <span className="font-semibold">
                                  {["ERR Online", "ÕL Online", "ÕL Print", "Äriregister"][doc.datasetVariant || 0]}
                                </span>
                              </div>
                              <div>
                                <span className="text-base-content/60">Year:</span>{" "}
                                <span className="font-semibold">{doc.year}</span>
                              </div>
                              <div>
                                <span className="text-base-content/60">Model:</span>{" "}
                                <span className="font-semibold">{doc.modelVersion}</span>
                              </div>
                              {doc.graphURI && (
                                <div className="col-span-2">
                                  <span className="text-base-content/60">Graph URI:</span>{" "}
                                  <span className="font-mono text-xs">{doc.graphURI}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {doc.validationError && <p className="text-sm text-error mt-2">{doc.validationError}</p>}
                          {doc.isSubmitted && doc.submittedAt && (
                            <p className="text-sm text-base-content/60 mt-2">
                              Submitted: {doc.submittedAt.toLocaleString()}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {!doc.isValidated && (
                            <button
                              onClick={() => handleValidate(doc.id)}
                              disabled={validatingId === doc.id}
                              className="btn btn-sm btn-outline btn-primary gap-2"
                            >
                              {validatingId === doc.id ? (
                                <>
                                  <SpinnerIcon className="w-4 h-4" />
                                  Validating...
                                </>
                              ) : (
                                <>
                                  <CheckCircleIcon className="w-4 h-4" />
                                  Validate RDF Syntax
                                </>
                              )}
                            </button>
                          )}

                          {doc.isValidated && !doc.validationError && !doc.isSubmitted && (
                            <button
                              onClick={() => handleSubmit(doc.id)}
                              disabled={submittingId === doc.id}
                              className="btn btn-sm btn-success gap-2"
                            >
                              {submittingId === doc.id ? (
                                <>
                                  <SpinnerIcon className="w-4 h-4" />
                                  Submitting...
                                </>
                              ) : (
                                <>
                                  <CheckCircleIcon className="w-4 h-4" />
                                  Submit for Approval
                                </>
                              )}
                            </button>
                          )}

                          {doc.isSubmitted && (
                            <div className="badge badge-lg badge-success gap-2">
                              <CheckCircleIcon className="w-4 h-4" />
                              Awaiting Committee Review
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="alert bg-primary/10 border border-primary/20 mt-8">
          <DataIcon className="w-6 h-6 text-primary shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">RDF Graph Submission Workflow</p>
            <ol className="list-decimal list-inside mt-2 text-base-content/70 space-y-1">
              <li>
                <strong>Configure Graph Metadata:</strong> Select graph type, dataset variant, year, and NLP model
                version
              </li>
              <li>
                <strong>Upload RDF File:</strong> Choose your .rdf, .ttl, or .xml file
              </li>
              <li>
                <strong>Validate Syntax:</strong> Click &quot;Validate RDF Syntax&quot; to check document structure and
                run MFSSIA authentication
              </li>
              <li>
                <strong>Submit for Approval:</strong> Once validated, submit to the GADataValidation contract
              </li>
              <li>
                <strong>Committee Review:</strong> The Validation Committee will review and approve your submission
              </li>
              <li>
                <strong>DKG Publication:</strong> After approval, the graph will be published to OriginTrail DKG
              </li>
            </ol>
            <div className="mt-3 pt-3 border-t border-primary/20">
              <p className="text-xs text-base-content/60">
                <strong>Note:</strong> Each submission creates a versioned RDF graph entry in the smart contract. The
                version number increments automatically for graphs with the same dataset variant and year.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
