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

/**
 * Hash a string using Web Crypto API (SHA-256)
 */
async function sha256Hash(data: string): Promise<string> {
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return "0x" + hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback for environments without Web Crypto
  const crypto = await import("crypto");
  return "0x" + crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Validate TTL (Turtle) RDF syntax
 * Checks for proper structure of pre-processed TTL files
 */
function validateTTLSyntax(content: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for empty content
  if (!content || content.trim().length === 0) {
    errors.push("File is empty");
    return { isValid: false, errors, warnings };
  }

  // Check for @prefix declarations
  const prefixPattern = /@prefix\s+\w*:\s*<[^>]+>\s*\./g;
  const prefixes = content.match(prefixPattern);
  if (!prefixes || prefixes.length === 0) {
    errors.push("No @prefix declarations found. TTL files must have namespace declarations.");
  }

  // Check for required prefixes for MKM data
  const requiredPrefixes = [
    { prefix: "art:", uri: "http://mkm.ee/article/", description: "Article namespace" },
    { prefix: "ex:", uri: "http://mkm.ee/schema/", description: "Schema namespace" },
    { prefix: "dct:", description: "Dublin Core Terms" },
    { prefix: "prov:", description: "Provenance namespace" },
  ];

  for (const req of requiredPrefixes) {
    if (!content.includes(`@prefix ${req.prefix}`)) {
      if (req.prefix === "art:" || req.prefix === "ex:") {
        errors.push(`Missing required prefix: ${req.prefix} (${req.description})`);
      } else {
        warnings.push(`Recommended prefix not found: ${req.prefix} (${req.description})`);
      }
    }
  }

  // Check for at least one subject definition (article)
  const subjectPattern = /art:\w+\s+a\s+ex:Article/;
  if (!subjectPattern.test(content)) {
    errors.push("No article definition found. Expected pattern: art:ID a ex:Article");
  }

  // Check for basic triple structure (subject predicate object)
  const triplePattern = /\w+:\w+\s+[\w:]+/;
  if (!triplePattern.test(content)) {
    errors.push("No valid RDF triples found");
  }

  // Check for unterminated strings
  const unclosedQuotes = (content.match(/"""/g) || []).length;
  if (unclosedQuotes % 2 !== 0) {
    errors.push("Unterminated multi-line string literal (unmatched triple quotes)");
  }

  // Check for statement terminators
  if (!content.includes(".") && !content.includes(";")) {
    errors.push("No statement terminators found (missing '.' or ';')");
  }

  // Check for common TTL elements
  if (content.includes("ex:bodyText") && !content.includes('"""')) {
    warnings.push("bodyText property found but no multi-line string literal detected");
  }

  // Validate date format if present
  const datePattern = /"\d{4}-\d{2}-\d{2}"\^\^xsd:date/;
  if (content.includes("dct:created") && !datePattern.test(content)) {
    warnings.push("dct:created found but date format may be incorrect (expected YYYY-MM-DD^^xsd:date)");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

interface RDFDocument {
  id: string;
  filename: string;
  content: string;
  uploadedAt: Date;
  // Validation status
  syntaxValid: boolean | null;
  syntaxErrors: string[];
  syntaxWarnings: string[];
  // Storage status
  storageId: string | null;
  isStored: boolean;
  // Submission status
  isSubmitted: boolean;
  submittedAt: Date | null;
  graphId: string | null;
  // Graph metadata (extracted or selected)
  graphType: number;
  datasetVariant: number;
  year: number;
  modelVersion: string;
  graphURI: string;
  documentHash: string | null;
}

/**
 * Data Provision Page - TTL File Upload and Submission
 * Simplified workflow:
 * 1. Upload pre-processed TTL files
 * 2. Validate TTL syntax
 * 3. Submit to blockchain for Validation Committee review
 * 4. Committee approves -> DKG publication (stubbed)
 *
 * Only accessible to Member Institution role (index 0) and Owner (index 5)
 */
export default function DataProvisionPage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const mkmpAddress = useMkmpAddress();
  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "GADataValidation" });

  const [rdfDocuments, setRdfDocuments] = useState<RDFDocument[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Graph metadata defaults
  const [graphType, setGraphType] = useState<number>(0); // ARTICLES
  const [datasetVariant, setDatasetVariant] = useState<number>(1); // OL_ONLINE (Õhtuleht)
  const [year, setYear] = useState<number>(2024);
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
      // Check file extension - TTL is the primary format
      if (!file.name.endsWith(".ttl") && !file.name.endsWith(".rdf") && !file.name.endsWith(".xml")) {
        alert("Please select a valid RDF file (.ttl preferred, or .rdf, .xml)");
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  // Upload and validate TTL file
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // Read file content
      const content = await selectedFile.text();

      // Validate TTL syntax
      const validationResult = validateTTLSyntax(content);

      // Generate document hash
      const documentHash = await sha256Hash(content);

      // Generate graphURI based on metadata
      const graphTypeNames = ["articles", "entities", "mentions", "nlp", "economics", "relations", "provenance"];
      const graphTypeName = graphTypeNames[graphType] || "graph";
      const graphURI = `urn:mkm:${graphTypeName}:${datasetVariant}:${year}`;

      // Upload to server-side storage for BDI agents
      let storageId: string | null = null;
      let isStored = false;

      if (validationResult.isValid) {
        try {
          console.log("[Data Provision] Uploading to TTL storage...");
          const storageResponse = await fetch("/api/ttl-storage/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content,
              expectedHash: documentHash,
              metadata: {
                graphType,
                datasetVariant,
                year,
                modelVersion,
                graphURI,
                submitter: address,
              },
            }),
          });

          const storageResult = await storageResponse.json();

          if (storageResult.success) {
            storageId = storageResult.storageId;
            isStored = true;
            console.log(`[Data Provision] Stored with ID: ${storageId}`);
          } else {
            console.warn("[Data Provision] Storage upload failed:", storageResult.error);
            // Continue without storage - fallback to browser-only
          }
        } catch (storageError) {
          console.warn("[Data Provision] Storage upload error:", storageError);
          // Continue without storage - fallback to browser-only
        }
      }

      // Create new document entry
      const newDoc: RDFDocument = {
        id: `ttl-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        filename: selectedFile.name,
        content,
        uploadedAt: new Date(),
        syntaxValid: validationResult.isValid,
        syntaxErrors: validationResult.errors,
        syntaxWarnings: validationResult.warnings,
        storageId,
        isStored,
        isSubmitted: false,
        submittedAt: null,
        graphId: null,
        graphType,
        datasetVariant,
        year,
        modelVersion,
        graphURI,
        documentHash,
      };

      setRdfDocuments(prev => [...prev, newDoc]);
      setSelectedFile(null);

      // Reset file input
      const fileInput = document.getElementById("ttl-file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      // Show validation result
      if (!validationResult.isValid) {
        alert(
          `TTL syntax validation failed:\n\n${validationResult.errors.join("\n")}\n\nPlease fix the errors and re-upload.`,
        );
      } else if (validationResult.warnings.length > 0) {
        alert(
          `TTL file uploaded with warnings:\n\n${validationResult.warnings.join("\n")}\n\n${isStored ? "File stored for agent validation." : "Note: Server storage unavailable - agents may not be able to validate."}`,
        );
      } else if (isStored) {
        // Silently stored - no alert needed for success
        console.log("[Data Provision] File validated and stored successfully");
      }
    } catch (error) {
      alert("Failed to upload file: " + (error as Error).message);
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, graphType, datasetVariant, year, modelVersion, address]);

  // Submit validated TTL to smart contract
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

        if (!doc.syntaxValid) {
          alert("Cannot submit: TTL syntax validation failed. Please fix errors and re-upload.");
          return;
        }

        if (!doc.documentHash) {
          alert("Missing document hash. Please re-upload the file.");
          return;
        }

        console.log("[Data Provision] Submitting to GADataValidation smart contract...");
        console.log(`  Graph URI: ${doc.graphURI}`);
        console.log(`  Document Hash: ${doc.documentHash}`);
        console.log(`  Graph Type: ${doc.graphType}`);
        console.log(`  Dataset Variant: ${doc.datasetVariant}`);
        console.log(`  Year: ${doc.year}`);
        console.log(`  Model Version: ${doc.modelVersion}`);
        console.log(`  Storage ID: ${doc.storageId || "not stored"}`);

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

        console.log(`[Data Provision] Transaction result:`, result);

        // Link storage ID to graph ID (for BDI agent retrieval)
        if (doc.storageId && result) {
          try {
            console.log(`[Data Provision] Linking storageId ${doc.storageId} to graphId...`);
            const linkResponse = await fetch("/api/ttl-storage/link", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                storageId: doc.storageId,
                graphId: result as string,
              }),
            });

            const linkResult = await linkResponse.json();
            if (linkResult.success) {
              console.log(`[Data Provision] Successfully linked to graphId: ${result}`);
            } else {
              console.warn("[Data Provision] Failed to link storage:", linkResult.error);
            }
          } catch (linkError) {
            console.warn("[Data Provision] Link error:", linkError);
            // Continue anyway - the submission succeeded
          }
        }

        setRdfDocuments(prev =>
          prev.map(d => {
            if (d.id === docId) {
              return {
                ...d,
                isSubmitted: true,
                submittedAt: new Date(),
                graphId: result as string,
              };
            }
            return d;
          }),
        );

        const graphTypeLabel = ["ARTICLES", "ENTITIES", "MENTIONS", "NLP", "ECONOMICS", "RELATIONS", "PROVENANCE"][
          doc.graphType
        ];
        const datasetLabel = ["ERR Online", "Õhtuleht Online", "Õhtuleht Print", "Äriregister"][doc.datasetVariant];

        alert(
          `TTL file submitted successfully!\n\n` +
            `Graph URI: ${doc.graphURI}\n` +
            `Graph Type: ${graphTypeLabel}\n` +
            `Dataset: ${datasetLabel}\n` +
            `Year: ${doc.year}\n` +
            `${doc.isStored ? "Server Storage: Linked for agent validation" : "Note: Content only in browser memory"}\n\n` +
            `Next steps:\n` +
            `1. Syntax Validator Agent will verify the TTL structure\n` +
            `2. Semantic Validator Agent will check RDF consistency\n` +
            `3. Validation Committee will review and approve\n` +
            `4. Once approved, the graph will be published to DKG`,
        );
      } catch (error: any) {
        console.error("[Data Provision] Error:", error);
        alert("Submission failed: " + (error?.shortMessage || error?.message || "Unknown error"));
      } finally {
        setSubmittingId(null);
      }
    },
    [address, rdfDocuments, writeContractAsync],
  );

  // Remove document from list
  const handleRemove = useCallback((docId: string) => {
    setRdfDocuments(prev => prev.filter(d => d.id !== docId));
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
              <p className="text-base-content/70">Upload pre-processed TTL files for committee validation</p>
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
              Upload TTL File
            </h2>
            <p className="text-sm text-base-content/70 mb-4">
              Upload pre-processed Turtle (.ttl) files containing RDF article data
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
                  <option value={0}>ARTICLES - Article content and metadata</option>
                  <option value={1}>ENTITIES - Named entities</option>
                  <option value={2}>MENTIONS - Entity mentions in text</option>
                  <option value={3}>NLP - NLP analysis results</option>
                  <option value={4}>ECONOMICS - Economic classifications</option>
                  <option value={5}>RELATIONS - Entity relationships</option>
                  <option value={6}>PROVENANCE - Data provenance</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Dataset Source</span>
                </label>
                <select
                  value={datasetVariant}
                  onChange={e => setDatasetVariant(Number(e.target.value))}
                  className="select select-bordered select-primary"
                >
                  <option value={0}>ERR Online - Estonian Public Broadcasting</option>
                  <option value={1}>Õhtuleht Online - Evening newspaper (online)</option>
                  <option value={2}>Õhtuleht Print - Evening newspaper (print)</option>
                  <option value={3}>Äriregister - Estonian Business Registry</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Dataset Year</span>
                </label>
                <input
                  type="number"
                  min="2000"
                  max="2030"
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="input input-bordered input-primary"
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
                  <span className="label-text">Select TTL File</span>
                </label>
                <input
                  id="ttl-file-input"
                  type="file"
                  accept=".ttl,.rdf,.xml"
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
                    Validating...
                  </>
                ) : (
                  <>
                    <UploadIcon className="w-5 h-5" />
                    Upload & Validate
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
              Uploaded Files ({rdfDocuments.length})
            </h2>

            {rdfDocuments.length === 0 ? (
              <div className="text-center py-12">
                <DataIcon className="w-16 h-16 text-base-content/20 mx-auto mb-4" />
                <p className="text-base-content/60">No files uploaded yet</p>
                <p className="text-sm text-base-content/50 mt-2">Upload your first TTL file to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rdfDocuments.map(doc => (
                  <div
                    key={doc.id}
                    className={`card border ${doc.syntaxValid === false ? "bg-error/5 border-error/30" : "bg-base-200 border-base-300"}`}
                  >
                    <div className="card-body">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{doc.filename}</h3>

                          {/* Status badges */}
                          <div className="flex flex-wrap gap-2 text-xs mb-3">
                            <div className="badge badge-outline">Uploaded: {doc.uploadedAt.toLocaleDateString()}</div>

                            {doc.syntaxValid === true && (
                              <div className="badge badge-success gap-1">
                                <CheckCircleIcon className="w-3 h-3" />
                                Syntax Valid
                              </div>
                            )}
                            {doc.syntaxValid === false && <div className="badge badge-error gap-1">Syntax Invalid</div>}
                            {doc.isStored && (
                              <div className="badge badge-secondary gap-1">
                                <CheckCircleIcon className="w-3 h-3" />
                                Stored for Agents
                              </div>
                            )}
                            {doc.syntaxValid && !doc.isStored && (
                              <div className="badge badge-warning gap-1">Browser Only</div>
                            )}
                            {doc.isSubmitted && (
                              <div className="badge badge-info gap-1">
                                <CheckCircleIcon className="w-3 h-3" />
                                Submitted to DAO
                              </div>
                            )}
                          </div>

                          {/* Graph Metadata */}
                          <div className="grid grid-cols-2 gap-2 text-xs bg-base-300/30 rounded-lg p-3 mb-3">
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
                                {["ERR Online", "ÕL Online", "ÕL Print", "Äriregister"][doc.datasetVariant]}
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
                            <div className="col-span-2">
                              <span className="text-base-content/60">Graph URI:</span>{" "}
                              <span className="font-mono text-xs">{doc.graphURI}</span>
                            </div>
                            {doc.documentHash && (
                              <div className="col-span-2">
                                <span className="text-base-content/60">Hash:</span>{" "}
                                <span className="font-mono text-xs truncate">{doc.documentHash.slice(0, 20)}...</span>
                              </div>
                            )}
                          </div>

                          {/* Validation errors */}
                          {doc.syntaxErrors.length > 0 && (
                            <div className="bg-error/10 rounded-lg p-3 mb-3">
                              <p className="text-sm font-semibold text-error mb-1">Syntax Errors:</p>
                              <ul className="text-xs text-error/80 list-disc list-inside">
                                {doc.syntaxErrors.map((err, i) => (
                                  <li key={i}>{err}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Validation warnings */}
                          {doc.syntaxWarnings.length > 0 && (
                            <div className="bg-warning/10 rounded-lg p-3 mb-3">
                              <p className="text-sm font-semibold text-warning mb-1">Warnings:</p>
                              <ul className="text-xs text-warning/80 list-disc list-inside">
                                {doc.syntaxWarnings.map((warn, i) => (
                                  <li key={i}>{warn}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {doc.isSubmitted && doc.submittedAt && (
                            <p className="text-sm text-success">
                              Submitted: {doc.submittedAt.toLocaleString()} - Awaiting agent validation and committee
                              review
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2">
                          {!doc.isSubmitted && (
                            <>
                              {doc.syntaxValid && (
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
                                      Submit to DAO
                                    </>
                                  )}
                                </button>
                              )}
                              <button onClick={() => handleRemove(doc.id)} className="btn btn-sm btn-outline btn-error">
                                Remove
                              </button>
                            </>
                          )}

                          {doc.isSubmitted && (
                            <Link href="/rdf-status" className="btn btn-sm btn-outline btn-info">
                              View Status
                            </Link>
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

        {/* Workflow Info */}
        <div className="alert bg-primary/10 border border-primary/20 mt-8">
          <DataIcon className="w-6 h-6 text-primary shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">TTL Submission Workflow</p>
            <ol className="list-decimal list-inside mt-2 text-base-content/70 space-y-1">
              <li>
                <strong>Upload:</strong> Select a pre-processed TTL file and configure metadata
              </li>
              <li>
                <strong>Syntax Validation:</strong> Basic TTL structure is validated on upload
              </li>
              <li>
                <strong>Submit to DAO:</strong> File hash and metadata are recorded on-chain
              </li>
              <li>
                <strong>Agent Validation:</strong> Syntax and Semantic Validator agents verify the RDF
              </li>
              <li>
                <strong>Committee Review:</strong> Validation Committee approves or rejects the submission
              </li>
              <li>
                <strong>DKG Publication:</strong> Approved graphs are published to OriginTrail DKG
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
