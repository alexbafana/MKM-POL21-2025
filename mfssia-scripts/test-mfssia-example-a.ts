/**
 * MFSSIA Integration Test - Example-A Challenge Set
 *
 * This test verifies that the MFSSIA API works correctly with the
 * mfssia:Example-A challenge set (Baseline RDF Artifact Integrity)
 *
 * Run with: npx ts-node test-mfssia-example-a.ts
 */

const MFSSIA_API_URL = "https://api.dymaxion-ou.co";

interface APIResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  statusCode: number;
  timestamp: string;
}

interface IdentityResponse {
  id: string;
  identifier: string;
  requestedChallengeSet: string;
  registrationState: string;
}

interface ChallengeInstanceResponse {
  id: string;
  challengeSet: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  state: string;
  evidences?: any[];
}

interface ChallengeSetResponse {
  id: string;
  code: string;
  name: string;
  challenges: Array<{
    id: string;
    code: string;
    name: string;
    expectedEvidence: any[];
  }>;
}

/**
 * Helper to make API requests
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<APIResponse<T>> {
  const url = `${MFSSIA_API_URL}${endpoint}`;
  console.log(`\n[API] ${options.method || 'GET'} ${endpoint}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const text = await response.text();
  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    console.error(`[API] Failed to parse response: ${text.substring(0, 200)}`);
    throw new Error(`Invalid JSON response: ${response.status} ${response.statusText}`);
  }

  if (!response.ok) {
    console.error(`[API] Error ${response.status}:`, data);
    throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  console.log(`[API] Response:`, JSON.stringify(data, null, 2).substring(0, 500));
  return data;
}

/**
 * Generate a simple hash from a string (for testing)
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Generate evidence for C-A-1: Source Authenticity Challenge
 * Required: sourceDomainHash, contentHash
 */
function generateCA1Evidence(did: string, nonce: string): object {
  return {
    sourceDomainHash: simpleHash(`mkmpol21.dao:${did}`),
    contentHash: simpleHash(`content:${nonce}:${Date.now()}`),
  };
}

/**
 * Generate evidence for C-A-2: Content Integrity Challenge
 * Required: contentHash, semanticFingerprint, similarityScore
 */
function generateCA2Evidence(did: string, nonce: string): object {
  return {
    contentHash: simpleHash(`content:${did}:${nonce}`),
    semanticFingerprint: simpleHash(`fingerprint:${did}`),
    similarityScore: 0.1, // Low similarity = not a duplicate
  };
}

/**
 * Generate evidence for C-A-3: Temporal Validity Challenge
 * Required: claimedPublishDate, serverTimestamp, archiveEarliestCaptureDate
 */
function generateCA3Evidence(): object {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return {
    claimedPublishDate: yesterday.toISOString(),
    serverTimestamp: now.toISOString(),
    archiveEarliestCaptureDate: yesterday.toISOString(),
  };
}

/**
 * Generate evidence for C-A-4: Author Authenticity Challenge
 * Required: authorName, authorEmailDomain, affiliationRecordHash
 */
function generateCA4Evidence(did: string): object {
  return {
    authorName: `User-${did.slice(-8)}`,
    authorEmailDomain: 'mkmpol21.dao',
    affiliationRecordHash: simpleHash(`affiliation:${did}`),
  };
}

/**
 * Generate evidence for C-A-5: Provenance Chain Challenge (OPTIONAL)
 * Required: artifactSignature, merkleProof, signerPublicKeyId
 */
function generateCA5Evidence(did: string, nonce: string): object {
  return {
    artifactSignature: simpleHash(`sig:${did}:${nonce}`),
    merkleProof: simpleHash(`merkle:${did}`),
    signerPublicKeyId: `did:key:${did.slice(-16)}`,
  };
}

/**
 * Generate evidence for C-A-6: Distribution Integrity Challenge
 * Required: shareEventTimestamps, accountTrustSignals, networkClusterScore
 */
function generateCA6Evidence(): object {
  return {
    shareEventTimestamps: new Date().toISOString(),
    accountTrustSignals: 'verified_wallet',
    networkClusterScore: 0.2, // Low score = not coordinated amplification
  };
}

/**
 * Main test function
 */
async function runTest() {
  console.log('='.repeat(60));
  console.log('MFSSIA Integration Test - Example-A Challenge Set');
  console.log('='.repeat(60));

  const testDid = `did:web:mkmpol21:test-${Date.now()}`;
  const challengeSet = 'mfssia:Example-A';

  try {
    // =========================================================================
    // Step 1: Fetch Challenge Set Details
    // =========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('Step 1: Fetching Challenge Set Details');
    console.log('='.repeat(60));

    try {
      const challengeSetResponse = await apiRequest<ChallengeSetResponse>(
        `/api/challenge-sets/${encodeURIComponent(challengeSet)}`
      );

      console.log('\n[INFO] Challenge Set Details:');
      console.log(`  ID: ${challengeSetResponse.data.id}`);
      console.log(`  Code: ${challengeSetResponse.data.code}`);
      console.log(`  Name: ${challengeSetResponse.data.name}`);

      if (challengeSetResponse.data.challenges) {
        console.log('\n[INFO] Challenges in set:');
        for (const challenge of challengeSetResponse.data.challenges) {
          console.log(`  - ${challenge.code}: ${challenge.name}`);
          console.log(`    ID: ${challenge.id}`);
          if (challenge.expectedEvidence) {
            console.log(`    Expected Evidence: ${JSON.stringify(challenge.expectedEvidence)}`);
          }
        }
      }
    } catch (error: any) {
      console.log(`[WARN] Could not fetch challenge set details: ${error.message}`);
      console.log('[INFO] Continuing with test...');
    }

    // =========================================================================
    // Step 2: Register DID
    // =========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('Step 2: Registering DID');
    console.log('='.repeat(60));

    const registrationResponse = await apiRequest<IdentityResponse>(
      '/api/identities/register',
      {
        method: 'POST',
        body: JSON.stringify({
          did: testDid,
          requestedChallengeSet: challengeSet,
          metadata: {
            platform: 'mkmpol21-dao-test',
            timestamp: new Date().toISOString(),
            testRun: true,
          },
        }),
      }
    );

    console.log(`\n[SUCCESS] DID registered: ${registrationResponse.data.identifier}`);
    console.log(`  Registration State: ${registrationResponse.data.registrationState}`);

    // =========================================================================
    // Step 3: Create Challenge Instance
    // =========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('Step 3: Creating Challenge Instance');
    console.log('='.repeat(60));

    const instanceResponse = await apiRequest<ChallengeInstanceResponse>(
      '/api/challenge-instances',
      {
        method: 'POST',
        body: JSON.stringify({
          did: testDid,
          challengeSet: challengeSet,
        }),
      }
    );

    const instanceId = instanceResponse.data.id;
    const nonce = instanceResponse.data.nonce;
    const instanceState = instanceResponse.data.state;

    console.log(`\n[SUCCESS] Challenge Instance created:`);
    console.log(`  Instance ID: ${instanceId}`);
    console.log(`  Nonce: ${nonce}`);
    console.log(`  State: ${instanceState}`);
    console.log(`  Expires: ${instanceResponse.data.expiresAt}`);

    // Check if instance is auto-verified
    if (instanceState === 'VERIFIED' || instanceState === 'COMPLETED') {
      console.log(`\n[INFO] Instance is already ${instanceState} (auto-verified)`);
      console.log('[INFO] Skipping evidence submission...');
    } else {
      // =========================================================================
      // Step 4: Submit Evidence for Each Challenge
      // =========================================================================
      console.log('\n' + '='.repeat(60));
      console.log('Step 4: Submitting Evidence for Challenges');
      console.log('='.repeat(60));

      // Define mandatory challenges for Example-A
      // Note: The challenge set definition mentions C-A-7 but it doesn't exist
      // We'll submit for C-A-1, C-A-2, C-A-3, C-A-4, C-A-6 (and optionally C-A-5)
      const challenges = [
        { code: 'mfssia:C-A-1', name: 'Source Authenticity', evidence: generateCA1Evidence(testDid, nonce) },
        { code: 'mfssia:C-A-2', name: 'Content Integrity', evidence: generateCA2Evidence(testDid, nonce) },
        { code: 'mfssia:C-A-3', name: 'Temporal Validity', evidence: generateCA3Evidence() },
        { code: 'mfssia:C-A-4', name: 'Author Authenticity', evidence: generateCA4Evidence(testDid) },
        { code: 'mfssia:C-A-5', name: 'Provenance Chain (Optional)', evidence: generateCA5Evidence(testDid, nonce) },
        { code: 'mfssia:C-A-6', name: 'Distribution Integrity', evidence: generateCA6Evidence() },
      ];

      for (const challenge of challenges) {
        console.log(`\n[INFO] Submitting evidence for ${challenge.code}: ${challenge.name}`);
        console.log(`  Evidence: ${JSON.stringify(challenge.evidence)}`);

        try {
          const evidenceResponse = await apiRequest<any>(
            '/api/challenge-evidence',
            {
              method: 'POST',
              body: JSON.stringify({
                challengeInstanceId: instanceId,
                challengeId: challenge.code,
                evidence: challenge.evidence,
              }),
            }
          );

          console.log(`  [SUCCESS] Evidence submitted for ${challenge.code}`);
        } catch (error: any) {
          console.log(`  [ERROR] Failed to submit evidence for ${challenge.code}: ${error.message}`);

          // If it's a 409 (conflict), the instance might be auto-verified
          if (error.message.includes('409') || error.message.includes('not in progress')) {
            console.log(`  [INFO] Instance may be in wrong state for evidence submission`);
          }
        }
      }
    }

    // =========================================================================
    // Step 5: Check Challenge Instance State
    // =========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('Step 5: Checking Challenge Instance State');
    console.log('='.repeat(60));

    try {
      const stateResponse = await apiRequest<ChallengeInstanceResponse>(
        `/api/challenge-instances/${instanceId}`
      );

      console.log(`\n[INFO] Instance State: ${stateResponse.data.state}`);
      if (stateResponse.data.evidences) {
        console.log(`  Evidences submitted: ${stateResponse.data.evidences.length}`);
      }
    } catch (error: any) {
      console.log(`[WARN] Could not check instance state: ${error.message}`);
    }

    // =========================================================================
    // Step 6: Wait for Oracle and Check Attestation
    // =========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('Step 6: Waiting for Oracle Verification');
    console.log('='.repeat(60));

    console.log('\n[INFO] Waiting 10 seconds for oracle processing...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    try {
      const attestationResponse = await apiRequest<any[]>(
        `/api/attestations/did/${encodeURIComponent(testDid)}`
      );

      if (Array.isArray(attestationResponse.data) && attestationResponse.data.length > 0) {
        const attestation = attestationResponse.data[0];
        console.log('\n[SUCCESS] Attestation found!');
        console.log(`  UAL: ${attestation.ual}`);
        console.log(`  Challenge Set: ${attestation.challengeSet}`);
        console.log(`  Issued At: ${attestation.validity?.issuedAt}`);
        console.log(`  Expires At: ${attestation.validity?.expiresAt}`);
        if (attestation.oracleProof) {
          console.log(`  Oracle Result: ${attestation.oracleProof.finalResult}`);
          console.log(`  Confidence: ${attestation.oracleProof.confidence}`);
          console.log(`  Passed Challenges: ${attestation.oracleProof.passedChallenges?.join(', ')}`);
        }
      } else {
        console.log('\n[WARN] No attestation found yet');
        console.log('[INFO] The oracle may need more time or may not be processing this challenge set');
      }
    } catch (error: any) {
      console.log(`[ERROR] Failed to fetch attestation: ${error.message}`);
    }

    // =========================================================================
    // Summary
    // =========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60));
    console.log(`  DID: ${testDid}`);
    console.log(`  Challenge Set: ${challengeSet}`);
    console.log(`  Instance ID: ${instanceId}`);
    console.log(`  Initial State: ${instanceState}`);

  } catch (error: any) {
    console.error('\n[FATAL] Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
runTest().then(() => {
  console.log('\n[DONE] Test completed');
}).catch((error) => {
  console.error('\n[FATAL] Unhandled error:', error);
  process.exit(1);
});
