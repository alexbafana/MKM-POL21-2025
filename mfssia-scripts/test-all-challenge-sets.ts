/**
 * Test all MFSSIA Challenge Sets to find one that works with the oracle
 */

const MFSSIA_API_URL = "https://api.dymaxion-ou.co";

interface TestResult {
  challengeSet: string;
  didRegistered: boolean;
  instanceCreated: boolean;
  instanceState: string;
  evidenceSubmitted: boolean;
  attestationFound: boolean;
  error?: string;
}

async function testChallengeSet(challengeSetCode: string): Promise<TestResult> {
  const result: TestResult = {
    challengeSet: challengeSetCode,
    didRegistered: false,
    instanceCreated: false,
    instanceState: "",
    evidenceSubmitted: false,
    attestationFound: false,
  };

  const timestamp = Date.now();
  const testDid = `did:web:mkmpol21:test-${challengeSetCode.replace(/[^a-zA-Z0-9]/g, "")}-${timestamp}`;

  function toHex(str: string): string {
    let hex = "";
    for (let i = 0; i < str.length; i++) {
      hex += str.charCodeAt(i).toString(16).padStart(2, "0");
    }
    return "0x" + hex.slice(0, 64).padStart(64, "0");
  }

  try {
    // 1. Check if challenge set exists
    console.log(`  Checking challenge set ${challengeSetCode}...`);
    const csRes = await fetch(
      `${MFSSIA_API_URL}/api/challenge-sets/${encodeURIComponent(challengeSetCode)}`
    );
    if (!csRes.ok) {
      result.error = `Challenge set not found: ${csRes.status}`;
      return result;
    }
    const csData = await csRes.json();
    console.log(`    Name: ${csData.data?.name}`);
    console.log(`    Mandatory: ${csData.data?.mandatoryChallenges?.join(", ") || "none listed"}`);

    // 2. Register DID
    const regRes = await fetch(`${MFSSIA_API_URL}/api/identities/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ did: testDid, requestedChallengeSet: challengeSetCode }),
    });
    const regData = await regRes.json();
    result.didRegistered = regData.success === true;

    if (!result.didRegistered) {
      result.error = `DID registration failed: ${regData.message}`;
      return result;
    }

    // 3. Create instance
    const instRes = await fetch(`${MFSSIA_API_URL}/api/challenge-instances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ did: testDid, challengeSet: challengeSetCode }),
    });
    const instData = await instRes.json();
    result.instanceCreated = instData.success === true;
    result.instanceState = instData.data?.state || "unknown";

    if (!result.instanceCreated) {
      result.error = `Instance creation failed: ${instData.message}`;
      return result;
    }

    const instanceId = instData.data.id;
    const nonce = instData.data.nonce;

    // If already VERIFIED, skip evidence submission
    if (result.instanceState === "VERIFIED" || result.instanceState === "COMPLETED") {
      console.log(`    Instance is auto-verified: ${result.instanceState}`);
      result.evidenceSubmitted = true; // Not needed
    } else {
      // 4. Submit minimal evidence based on challenge set
      const mandatoryChallenges = csData.data?.mandatoryChallenges || [];

      for (const challengeCode of mandatoryChallenges.slice(0, 2)) {
        // Just first 2
        const evidenceRes = await fetch(`${MFSSIA_API_URL}/api/challenge-evidence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challengeInstanceId: instanceId,
            challengeId: challengeCode,
            evidence: {
              source: "mkmpol21.dao",
              sourceDomainHash: toHex(`source:${testDid}`),
              contentHash: toHex(`content:${nonce}`),
              semanticFingerprint: toHex(`fp:${testDid}`),
              similarityScore: 0.05,
              claimedPublishDate: new Date().toISOString(),
              serverTimestamp: new Date().toISOString(),
              archiveEarliestCaptureDate: new Date().toISOString(),
            },
          }),
        });
        const evData = await evidenceRes.json();
        if (evData.success) {
          result.evidenceSubmitted = true;
          console.log(`    Evidence for ${challengeCode}: OK`);
        } else {
          console.log(`    Evidence for ${challengeCode}: FAILED - ${evData.message}`);
        }
      }
    }

    // 5. Quick poll for attestation (15 seconds)
    console.log(`    Checking for attestation (15s)...`);
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const attRes = await fetch(
        `${MFSSIA_API_URL}/api/attestations/did/${encodeURIComponent(testDid)}`
      );
      const attData = await attRes.json();
      if (attData.data && attData.data.length > 0) {
        result.attestationFound = true;
        console.log(`    ATTESTATION FOUND!`);
        break;
      }
    }

    if (!result.attestationFound) {
      console.log(`    No attestation after 15s`);
    }

    return result;
  } catch (error: any) {
    result.error = error.message;
    return result;
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("Testing All MFSSIA Challenge Sets");
  console.log("=".repeat(60));

  const challengeSets = [
    "mfssia:Example-A",
    "mfssia:Example-B",
    "mfssia:Example-C",
    "mfssia:Example-D",
  ];

  const results: TestResult[] = [];

  for (const cs of challengeSets) {
    console.log(`\nTesting ${cs}...`);
    const result = await testChallengeSet(cs);
    results.push(result);
  }

  console.log("\n" + "=".repeat(60));
  console.log("Results Summary");
  console.log("=".repeat(60));

  for (const r of results) {
    console.log(`\n${r.challengeSet}:`);
    console.log(`  DID Registered: ${r.didRegistered ? "YES" : "NO"}`);
    console.log(`  Instance Created: ${r.instanceCreated ? "YES" : "NO"}`);
    console.log(`  Instance State: ${r.instanceState}`);
    console.log(`  Evidence Submitted: ${r.evidenceSubmitted ? "YES" : "NO"}`);
    console.log(`  Attestation Found: ${r.attestationFound ? "YES" : "NO"}`);
    if (r.error) {
      console.log(`  Error: ${r.error}`);
    }
  }

  const working = results.filter((r) => r.attestationFound);
  if (working.length > 0) {
    console.log("\n" + "=".repeat(60));
    console.log("WORKING CHALLENGE SETS:");
    for (const r of working) {
      console.log(`  - ${r.challengeSet}`);
    }
  } else {
    console.log("\n" + "=".repeat(60));
    console.log("NO CHALLENGE SETS PRODUCED ATTESTATIONS");
    console.log("The MFSSIA oracle may not be processing any of these challenge sets.");
  }
}

main().catch(console.error);
