/**
 * Oracle Poll Test - Checks if MFSSIA Oracle processes Example-A
 * Polls for attestation for 60 seconds
 */

const MFSSIA_API_URL = "https://api.dymaxion-ou.co";

async function testOraclePolling() {
  console.log("Testing MFSSIA Oracle with Example-A...\n");

  const timestamp = Date.now();
  const testDid = `did:web:mkmpol21:oracle-test-${timestamp}`;
  const challengeSet = "mfssia:Example-A";

  // Helper for hex conversion
  function toHex(str: string): string {
    let hex = "";
    for (let i = 0; i < str.length; i++) {
      hex += str.charCodeAt(i).toString(16).padStart(2, "0");
    }
    return "0x" + hex.slice(0, 64).padStart(64, "0");
  }

  try {
    // Step 1: Register DID
    console.log("1. Registering DID:", testDid);
    const regRes = await fetch(`${MFSSIA_API_URL}/api/identities/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ did: testDid, requestedChallengeSet: challengeSet }),
    });
    const regData = await regRes.json();
    console.log("   Result:", regData.success ? "OK" : "FAILED");

    // Step 2: Create challenge instance
    console.log("\n2. Creating challenge instance...");
    const instRes = await fetch(`${MFSSIA_API_URL}/api/challenge-instances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ did: testDid, challengeSet }),
    });
    const instData = await instRes.json();
    const instanceId = instData.data?.id;
    const nonce = instData.data?.nonce;
    console.log("   Instance ID:", instanceId);
    console.log("   State:", instData.data?.state);

    if (!instanceId) {
      console.error("   Failed to create instance!");
      process.exit(1);
    }

    // Step 3: Submit evidence for mandatory challenges (C-A-1 and C-A-2)
    console.log("\n3. Submitting evidence...");

    // C-A-1
    const ca1Res = await fetch(`${MFSSIA_API_URL}/api/challenge-evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challengeInstanceId: instanceId,
        challengeId: "mfssia:C-A-1",
        evidence: {
          sourceDomainHash: toHex(`source:${testDid}`),
          contentHash: toHex(`content:${nonce}`),
        },
      }),
    });
    const ca1Data = await ca1Res.json();
    console.log("   C-A-1:", ca1Data.success ? "OK" : "FAILED");

    // C-A-2
    const ca2Res = await fetch(`${MFSSIA_API_URL}/api/challenge-evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challengeInstanceId: instanceId,
        challengeId: "mfssia:C-A-2",
        evidence: {
          contentHash: toHex(`integrity:${testDid}`),
          semanticFingerprint: toHex(`fingerprint:${testDid}`),
          similarityScore: 0.05,
        },
      }),
    });
    const ca2Data = await ca2Res.json();
    console.log("   C-A-2:", ca2Data.success ? "OK" : "FAILED");

    // Step 4: Poll for attestation
    console.log("\n4. Polling for attestation (60 seconds)...");
    const startTime = Date.now();
    const maxWait = 60000; // 60 seconds

    while (Date.now() - startTime < maxWait) {
      await new Promise((r) => setTimeout(r, 5000));

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const attRes = await fetch(
        `${MFSSIA_API_URL}/api/attestations/did/${encodeURIComponent(testDid)}`
      );
      const attData = await attRes.json();

      if (attData.data && attData.data.length > 0) {
        console.log(`\n   SUCCESS! Attestation found after ${elapsed}s`);
        console.log("   UAL:", attData.data[0].ual);
        console.log("   Challenge Set:", attData.data[0].challengeSet);
        if (attData.data[0].oracleProof) {
          console.log("   Oracle Result:", attData.data[0].oracleProof.finalResult);
          console.log("   Confidence:", attData.data[0].oracleProof.confidence);
        }
        console.log("\n   ORACLE IS WORKING FOR Example-A!");
        return true;
      }

      console.log(`   ${elapsed}s: No attestation yet...`);
    }

    console.log("\n   TIMEOUT: No attestation after 60 seconds");
    console.log("   The oracle may not be processing Example-A");

    // Check final instance state
    const finalStateRes = await fetch(
      `${MFSSIA_API_URL}/api/challenge-instances/${instanceId}`
    );
    const finalState = await finalStateRes.json();
    console.log("\n   Final instance state:", finalState.data?.state);

    return false;
  } catch (error: any) {
    console.error("\nError:", error.message);
    return false;
  }
}

testOraclePolling()
  .then((success) => {
    console.log("\n" + "=".repeat(50));
    console.log(success ? "TEST PASSED: Oracle is working" : "TEST FAILED: Oracle not responding");
    process.exit(success ? 0 : 1);
  })
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  });
