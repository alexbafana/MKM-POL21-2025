"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ArrowRightIcon, CheckCircleIcon, SpinnerIcon, XCircleIcon } from "~~/components/dao";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

interface ChallengeDefinition {
  code: string;
  name: string;
  description: string;
  factorClass: string;
  question: string;
  expectedEvidence: any[];
  oracle: any;
  evaluation: any;
  failureEffect: string;
  reusability: string;
  version: string;
  status: string;
}

interface ChallengeSet {
  code: string;
  name: string;
  description: string;
  version: string;
  status: string;
  publishedBy: any;
  mandatoryChallenges: string[];
  optionalChallenges: string[];
  policy: any;
  lifecycle: any;
}

const MFSSIA_API_URL = process.env.NEXT_PUBLIC_MFSSIA_API_URL || "https://api.dymaxion-ou.co";

/**
 * MFSSIA Configuration Page
 * Allows DAO owner to create and manage challenge sets
 */
export default function MFSSIAConfigPage() {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [existingDefinitions, setExistingDefinitions] = useState<ChallengeDefinition[]>([]);
  const [existingSets, setExistingSets] = useState<ChallengeSet[]>([]);

  // Check if user is owner - hasRole returns the role value (uint32)
  // Role index 5 (Owner) has value 1029 = (32 << 5) | 5 = 1029
  const { data: userRole } = useScaffoldReadContract({
    contractName: "MKMPOL21",
    functionName: "hasRole",
    args: [address],
  });

  // Role value 1029 = Owner (index 5), extract index from lower 5 bits
  const roleIndex = userRole ? Number(userRole) & 0x1f : 0;
  const isOwner = roleIndex === 5;

  /**
   * Fetch existing challenge definitions and sets
   */
  const fetchExisting = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [defsRes, setsRes] = await Promise.all([
        fetch(`${MFSSIA_API_URL}/api/challenge-definitions`),
        fetch(`${MFSSIA_API_URL}/api/challenge-sets`),
      ]);

      const defsData = await defsRes.json();
      const setsData = await setsRes.json();

      setExistingDefinitions(defsData.data || []);
      setExistingSets(setsData.data || []);
      setStatusMessage("Successfully loaded existing configuration");
    } catch (err: any) {
      setError(`Failed to fetch configuration: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Create challenge definitions
   */
  const createDefinitions = async () => {
    setIsLoading(true);
    setError("");
    setStatusMessage("Creating challenge definitions...");

    const definitions: ChallengeDefinition[] = [
      {
        code: "mfssia:C-A-1",
        name: "Wallet Ownership",
        description: "Verify that the user controls the wallet associated with their DID",
        factorClass: "SourceIntegrity",
        question: "Does the user control the cryptographic keys for this wallet?",
        expectedEvidence: [
          { type: "mfssia:SignedMessage", name: "signature", dataType: "string" },
          { type: "mfssia:Message", name: "message", dataType: "string" },
          { type: "mfssia:PublicKey", name: "publicKey", dataType: "string" },
        ],
        oracle: {
          type: "mfssia:Oracle",
          name: "CryptoSignatureVerifier",
          oracleType: "INTERNAL",
          verificationMethod: "ECDSA signature verification",
        },
        evaluation: {
          resultType: "assertions",
          passCondition: "Signature is cryptographically valid",
        },
        failureEffect: "User cannot authenticate",
        reusability: "GLOBAL",
        version: "1.0.0",
        status: "ACTIVE",
      },
      {
        code: "mfssia:C-A-2",
        name: "Liveness Check",
        description: "Verify that the authentication is performed by a live human",
        factorClass: "ProcessIntegrity",
        question: "Is this authentication performed by a live human user?",
        expectedEvidence: [
          { type: "mfssia:InteractionTime", name: "interactionTime", dataType: "number" },
          { type: "mfssia:UserAgent", name: "userAgent", dataType: "string" },
          { type: "mfssia:Timestamp", name: "timestamp", dataType: "string" },
        ],
        oracle: {
          type: "mfssia:Oracle",
          name: "LivenessDetector",
          oracleType: "INTERNAL",
          verificationMethod: "Behavioral analysis",
        },
        evaluation: {
          resultType: "assertions",
          passCondition: "Interaction patterns consistent with human behavior",
        },
        failureEffect: "Authentication flagged as potentially automated",
        reusability: "GLOBAL",
        version: "1.0.0",
        status: "ACTIVE",
      },
      {
        code: "mfssia:C-A-3",
        name: "Geographic Location",
        description: "Optional verification of user's geographic location",
        factorClass: "DataIntegrity",
        question: "Is the user located in an authorized jurisdiction?",
        expectedEvidence: [
          { type: "mfssia:IPAddress", name: "ipAddress", dataType: "string" },
          { type: "mfssia:Country", name: "country", dataType: "string" },
        ],
        oracle: {
          type: "mfssia:Oracle",
          name: "GeolocationVerifier",
          oracleType: "INTERNAL",
          verificationMethod: "IP geolocation database lookup",
        },
        evaluation: {
          resultType: "assertions",
          passCondition: "User is in an authorized jurisdiction",
        },
        failureEffect: "Optional challenge - does not block authentication",
        reusability: "GLOBAL",
        version: "1.0.0",
        status: "ACTIVE",
      },
    ];

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const definition of definitions) {
      // Check if already exists
      if (existingDefinitions.some(d => d.code === definition.code)) {
        console.log(`Skipping ${definition.code} - already exists`);
        skipped++;
        continue;
      }

      try {
        const response = await fetch(`${MFSSIA_API_URL}/api/challenge-definitions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(definition),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        created++;
        console.log(`Created ${definition.code}`);
      } catch (err: any) {
        console.error(`Failed to create ${definition.code}:`, err);
        failed++;
      }
    }

    setStatusMessage(`Challenge definitions: ${created} created, ${skipped} skipped, ${failed} failed`);
    setIsLoading(false);
    await fetchExisting();
  };

  /**
   * Create challenge sets
   * Note: Currently failing on MFSSIA backend (500 error)
   */
  const createChallengeSets = async () => {
    setIsLoading(true);
    setError("");
    setStatusMessage("Creating challenge sets...");

    const challengeSet: ChallengeSet = {
      code: "mfssia:Example-A",
      name: "Individual User Authentication",
      description: "Basic authentication for ordinary users",
      version: "1.0.0",
      status: "ACTIVE",
      publishedBy: {
        type: "Organization",
        name: "MKM-POL21 DAO",
      },
      mandatoryChallenges: ["mfssia:C-A-1", "mfssia:C-A-2"],
      optionalChallenges: ["mfssia:C-A-3"],
      policy: {
        minChallengesRequired: 2,
        aggregationRule: "ALL_MANDATORY_AND_WEIGHTED_CONFIDENCE",
        confidenceThreshold: 0.85,
      },
      lifecycle: {
        creationEvent: "DAO_APPROVAL",
        mutation: "IMMUTABLE",
        deprecationPolicy: "VERSIONED_REPLACEMENT",
      },
    };

    try {
      const response = await fetch(`${MFSSIA_API_URL}/api/challenge-sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(challengeSet),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      setStatusMessage("Challenge set created successfully!");
      await fetchExisting();
    } catch (err: any) {
      setError(
        `Failed to create challenge set: ${err.message}. Note: MFSSIA backend currently has issues with challenge set creation (returns 500 error). Contact MFSSIA administrator.`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOwner) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <div className="alert alert-error max-w-md">
          <XCircleIcon className="w-6 h-6 shrink-0" />
          <div>
            <h3 className="font-bold">Access Denied</h3>
            <div className="text-sm">Only the DAO owner can configure MFSSIA challenge sets</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-secondary/5 to-primary/10 py-12 border-b border-base-300">
        <div className="max-w-6xl mx-auto px-6">
          <Link href="/admin" className="btn btn-ghost btn-sm mb-6 gap-2">
            <ArrowRightIcon className="w-4 h-4 rotate-180" />
            Back to Admin
          </Link>

          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-primary/10 text-primary">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">MFSSIA Configuration</h1>
              <p className="text-base-content/70">Configure challenge sets for authentication</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Status Messages */}
        {statusMessage && (
          <div className="alert alert-success mb-6">
            <CheckCircleIcon className="w-6 h-6 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {error && (
          <div className="alert alert-error mb-6">
            <XCircleIcon className="w-6 h-6 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="card bg-base-100 shadow-xl border border-base-300">
            <div className="card-body">
              <h2 className="card-title">1. Load Current Configuration</h2>
              <p className="text-sm text-base-content/70">
                Fetch existing challenge definitions and sets from MFSSIA node
              </p>
              <div className="card-actions justify-end mt-4">
                <button onClick={fetchExisting} disabled={isLoading} className="btn btn-primary gap-2">
                  {isLoading ? <SpinnerIcon className="w-5 h-5" /> : <CheckCircleIcon className="w-5 h-5" />}
                  Load Configuration
                </button>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl border border-base-300">
            <div className="card-body">
              <h2 className="card-title">2. Create Challenge Definitions</h2>
              <p className="text-sm text-base-content/70">Create C-A-1 (Wallet), C-A-2 (Liveness), C-A-3 (Location)</p>
              <div className="card-actions justify-end mt-4">
                <button onClick={createDefinitions} disabled={isLoading} className="btn btn-secondary gap-2">
                  {isLoading ? <SpinnerIcon className="w-5 h-5" /> : <CheckCircleIcon className="w-5 h-5" />}
                  Create Definitions
                </button>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl border border-base-300">
            <div className="card-body">
              <h2 className="card-title">3. Create Challenge Set</h2>
              <p className="text-sm text-base-content/70">Create Example-A for individual user authentication</p>
              <div className="alert alert-warning mt-2">
                <span className="text-xs">
                  ⚠️ Currently failing on MFSSIA backend (500 error). Contact MFSSIA administrator.
                </span>
              </div>
              <div className="card-actions justify-end mt-4">
                <button onClick={createChallengeSets} disabled={isLoading} className="btn btn-accent gap-2">
                  {isLoading ? <SpinnerIcon className="w-5 h-5" /> : <CheckCircleIcon className="w-5 h-5" />}
                  Create Challenge Set
                </button>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl border border-base-300">
            <div className="card-body">
              <h2 className="card-title">4. Test Authentication</h2>
              <p className="text-sm text-base-content/70">Run integration test to verify authentication flow</p>
              <div className="card-actions justify-end mt-4">
                <Link href="/onboarding" className="btn btn-info gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  Test Onboarding
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Existing Challenge Definitions */}
        <div className="card bg-base-100 shadow-xl border border-base-300 mb-8">
          <div className="card-body">
            <h2 className="card-title">Challenge Definitions ({existingDefinitions.length})</h2>
            {existingDefinitions.length === 0 ? (
              <p className="text-base-content/70">No challenge definitions configured yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Factor Class</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingDefinitions.map(def => (
                      <tr key={def.code}>
                        <td className="font-mono text-sm">{def.code}</td>
                        <td>{def.name}</td>
                        <td>
                          <div className="badge badge-outline">{def.factorClass}</div>
                        </td>
                        <td>
                          <div className={`badge ${def.status === "ACTIVE" ? "badge-success" : "badge-ghost"}`}>
                            {def.status}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Existing Challenge Sets */}
        <div className="card bg-base-100 shadow-xl border border-base-300">
          <div className="card-body">
            <h2 className="card-title">Challenge Sets ({existingSets.length})</h2>
            {existingSets.length === 0 ? (
              <div className="alert alert-warning">
                <XCircleIcon className="w-6 h-6 shrink-0" />
                <div>
                  <p className="font-semibold">No Challenge Sets Configured</p>
                  <p className="text-sm">
                    Authentication will not work until at least one challenge set is created. Currently the MFSSIA
                    backend has issues creating challenge sets (returns 500 error). Please contact the MFSSIA node
                    administrator.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Mandatory Challenges</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingSets.map(set => (
                      <tr key={set.code}>
                        <td className="font-mono text-sm">{set.code}</td>
                        <td>{set.name}</td>
                        <td>{set.mandatoryChallenges.length}</td>
                        <td>
                          <div className={`badge ${set.status === "ACTIVE" ? "badge-success" : "badge-ghost"}`}>
                            {set.status}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Documentation Link */}
        <div className="alert bg-info/10 border border-info/20 mt-8">
          <svg className="w-6 h-6 text-info shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm">
            <p className="font-semibold">MFSSIA Documentation</p>
            <p className="text-base-content/70 mt-1">
              For more information, see:{" "}
              <a href={`${MFSSIA_API_URL}/docs`} target="_blank" rel="noopener noreferrer" className="link">
                MFSSIA API Docs
              </a>{" "}
              and <code className="bg-base-200 px-1 rounded">MFSSIA_ADMIN_GUIDE.md</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
