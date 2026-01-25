# MFSSIA Support Request - Oracle Not Creating Attestations

**Date:** January 3, 2026
**Issue:** Challenge instances are auto-verified but no attestations are created
**Impact:** Users cannot complete authentication

---

## Problem Summary

Challenge instances for "mfssia:Example-U" are created with `state: "VERIFIED"`, but the oracle never creates attestations. The attestation endpoint returns an empty array indefinitely.

---

## Request Bodies Sent to MFSSIA API

### 1. DID Registration (POST /api/identities/register)

**Request Body:**
```json
{
  "did": "did:web:mkmpol21:0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  "requestedChallengeSet": "mfssia:Example-U",
  "metadata": {
    "roleType": "ORDINARY_USER",
    "walletAddress": "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "platform": "mkm-pol21-dao",
    "timestamp": "2026-01-03T15:13:41.000Z"
  }
}
```

**Response Received:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "99cd302f-b537-4509-9bdb-21cde7de8e22",
    "identifier": "did:web:mkmpol21:0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "requestedChallengeSet": "mfssia:Example-U",
    "registrationState": "REGISTERED",
    "registeredAt": "2026-01-03T15:13:41.422Z",
    "createdAt": "2026-01-03T15:13:41.448Z",
    "updatedAt": "2026-01-03T15:13:41.448Z"
  },
  "statusCode": 201
}
```

**Result:** ✅ Success

---

### 2. Challenge Instance Creation (POST /api/challenge-instances)

**Request Body:**
```json
{
  "did": "did:web:mkmpol21:0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  "challengeSet": "mfssia:Example-U"
}
```

**Response Received:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "b98d50d4-b800-434f-8b1f-b9b20c116046",
    "challengeSet": "c37f86ec-4127-4946-86f2-cb2a033727e0",
    "nonce": "0x0c9e0edc6c6e824e66e5c2344cb36221",
    "issuedAt": "2026-01-03T15:13:42.970Z",
    "expiresAt": "2026-01-03T15:23:42.970Z",
    "state": "VERIFIED",
    "identity": {
      "id": "99cd302f-b537-4509-9bdb-21cde7de8e22",
      "identifier": "did:web:mkmpol21:0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      "requestedChallengeSet": "mfssia:Example-U",
      "registrationState": "REGISTERED",
      "registeredAt": "2026-01-03T15:13:41.422Z",
      "challengeInstances": [],
      "createdAt": "2026-01-03T15:13:41.448Z",
      "updatedAt": "2026-01-03T15:13:41.448Z"
    },
    "evidences": [],
    "createdAt": "2026-01-03T15:13:42.995Z",
    "updatedAt": "2026-01-03T15:13:42.995Z"
  },
  "statusCode": 201
}
```

**Result:** ✅ Success (but state is VERIFIED with no evidences)

**Notice:**
- `state: "VERIFIED"` - Instance is auto-verified
- `evidences: []` - No evidence was submitted
- Instance created at: 2026-01-03T15:13:42.995Z

---

### 3. Attestation Retrieval (GET /api/attestations/did/{did})

**Request:**
```
GET /api/attestations/did/did:web:mkmpol21:0x90F79bf6EB2c4f870365E785982E1f101E93b906
```

**Polling Details:**
- Started: 2026-01-03T15:13:49 (7 seconds after instance creation)
- Ended: 2026-01-03T15:14:49 (60 seconds later)
- Attempts: 30
- Interval: 2 seconds

**Response Received (All 30 Attempts):**
```json
{
  "success": true,
  "message": "Success",
  "data": [],
  "statusCode": 200
}
```

**Result:** ❌ No attestation created

---

## The Problem

### Expected Behavior

According to MFSSIA documentation, when a challenge instance has `state: "VERIFIED"`:
- Oracle should automatically create an attestation
- Attestation should appear within 2-10 seconds
- GET /api/attestations/did/{did} should return the attestation

### Actual Behavior

- Challenge instance created with `state: "VERIFIED"` ✓
- Oracle does NOT create attestation ✗
- Attestation endpoint returns empty array forever ✗

### Timeline

```
15:13:41 - DID registered
15:13:42 - Challenge instance created (state=VERIFIED)
15:13:43 - [Oracle should create attestation here]
15:13:49 - Start polling for attestation
15:13:51 - Attempt 1/30: Empty array
15:13:53 - Attempt 2/30: Empty array
...
15:14:47 - Attempt 29/30: Empty array
15:14:49 - Attempt 30/30: Empty array
15:14:49 - Timeout: No attestation found
```

**Total wait time:** 60 seconds
**Oracle response:** None

---

## Evidence Submission Attempts

We attempted to submit evidence manually, but it was rejected:

### Attempted Request (POST /api/challenge-evidence)

**Request Body:**
```json
{
  "challengeInstanceId": "b98d50d4-b800-434f-8b1f-b9b20c116046",
  "challengeId": "mfssia:C-U-1",
  "evidence": {
    "signature": "0x...",
    "nonce": "0x0c9e0edc6c6e824e66e5c2344cb36221",
    "address": "0x90F79bf6EB2c4f870365E785982E1f101E93b906"
  }
}
```

**Response:**
```json
{
  "success": false,
  "message": "Challenge instance is not in progress",
  "statusCode": 400
}
```

**This is expected** because the instance state is VERIFIED, not IN_PROGRESS.

---

## Challenge Set Details

**Challenge Set Code:** `mfssia:Example-U`
**Challenge Set UUID:** `c37f86ec-4127-4946-86f2-cb2a033727e0`

**Challenges in Set:**
- `mfssia:C-U-1` - Wallet Ownership Proof (ID: 0ed5285d-26e5-4cef-a225-2e7625eafd2f)
- `mfssia:C-U-2` - Human Interaction Verification (ID: fc49aaec-5b52-4ad6-ba46-63c708677bc2)

**Policy:** ALL_MANDATORY

---

## Questions for MFSSIA Team

1. **Is "mfssia:Example-U" configured for auto-verification?**
   - If yes, why is the oracle not creating attestations?
   - If no, why are instances created with state="VERIFIED"?

2. **Should we submit evidence for auto-verified instances?**
   - Current behavior: Evidence submission is rejected
   - Expected: What is the correct flow for this challenge set?

3. **How long should we wait for oracle attestation?**
   - Current: We wait 60 seconds (30 attempts × 2 seconds)
   - Is this sufficient, or is the oracle not running?

4. **Is the oracle service running for this challenge set?**
   - Can you verify the oracle is monitoring "mfssia:Example-U"?
   - Are there any logs showing why attestations aren't being created?

---

## Requested Fix

Please either:

### Option A: Enable Oracle for Auto-Verified Instances
- Configure oracle to monitor instances with state="VERIFIED"
- Oracle should create attestations automatically for "mfssia:Example-U"
- Attestations should appear within 10 seconds

### Option B: Disable Auto-Verification
- Change "mfssia:Example-U" to create instances with state="IN_PROGRESS"
- Allow evidence submission via POST /api/challenge-evidence
- Oracle creates attestation after evidence is verified

### Option C: Provide Alternative Challenge Set
- Create a new challenge set (e.g., "mfssia:Example-U-v2")
- Use normal evidence submission flow
- Oracle processes evidence and creates attestations

---

## System Information

**API Endpoint:** https://api.dymaxion-ou.co
**Client:** MKMPOL21 DAO Frontend
**Integration:** Next.js 15 + MFSSIA Service Client
**Environment:** Production

**User Impact:**
- Cannot complete onboarding
- All authentication attempts fail
- Blocking production deployment

---

## Test DID for Reproduction

You can test with this DID:
- **DID:** `did:web:mkmpol21:0x90F79bf6EB2c4f870365E785982E1f101E93b906`
- **Challenge Instance:** `b98d50d4-b800-434f-8b1f-b9b20c116046`
- **State:** VERIFIED
- **Attestation:** Does not exist

Steps to reproduce:
1. GET /api/challenge-instances/b98d50d4-b800-434f-8b1f-b9b20c116046
   - Verify state=VERIFIED
2. GET /api/attestations/did/did:web:mkmpol21:0x90F79bf6EB2c4f870365E785982E1f101E93b906
   - Observe empty array

---

## Contact

**Project:** MKMPOL21 DAO
**Issue Priority:** Critical - Blocking Production
**Awaiting:** Oracle configuration or challenge set fix

Thank you for your assistance!
