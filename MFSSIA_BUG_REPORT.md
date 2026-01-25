# MFSSIA API Bug Report

**Date:** January 3, 2026
**Reporter:** MKMPOL21 DAO Development Team
**Severity:** Critical - Blocks Production Deployment
**Component:** Oracle Service + Challenge Set Configuration

---

## Summary

The MFSSIA API creates challenge instances for "mfssia:Example-U" with `state: "VERIFIED"`, but the oracle service **never creates attestations** for these instances, blocking the entire authentication flow.

---

## Bug Description

### Expected Behavior

When a challenge instance is created with `state: "VERIFIED"` (auto-verified challenge set):
1. Oracle service detects the VERIFIED instance
2. Oracle automatically evaluates the instance
3. Oracle creates an attestation within 2-10 seconds
4. `GET /api/attestations/did/{did}` returns the attestation

### Actual Behavior

When a challenge instance is created with `state: "VERIFIED"`:
1. Instance is created successfully ✓
2. Oracle service **never processes the instance** ✗
3. No attestation is ever created ✗
4. `GET /api/attestations/did/{did}` returns empty array `[]` indefinitely ✗

---

## Reproduction Steps

### 1. Register a DID
```bash
curl -X POST https://api.dymaxion-ou.co/api/identities/register \
  -H "Content-Type: application/json" \
  -d '{
    "did": "did:web:mkmpol21:0xTEST123",
    "requestedChallengeSet": "mfssia:Example-U",
    "metadata": {
      "platform": "mkmpol21-dao",
      "timestamp": "2026-01-03T15:00:00Z"
    }
  }'
```

**Response:** ✅ Success
```json
{
  "success": true,
  "data": {
    "id": "...",
    "identifier": "did:web:mkmpol21:0xTEST123",
    "registrationState": "REGISTERED"
  }
}
```

### 2. Create Challenge Instance
```bash
curl -X POST https://api.dymaxion-ou.co/api/challenge-instances \
  -H "Content-Type: application/json" \
  -d '{
    "did": "did:web:mkmpol21:0xTEST123",
    "challengeSet": "mfssia:Example-U"
  }'
```

**Response:** ✅ Success (but notice `state: "VERIFIED"`)
```json
{
  "success": true,
  "data": {
    "id": "b98d50d4-b800-434f-8b1f-b9b20c116046",
    "challengeSet": "c37f86ec-4127-4946-86f2-cb2a033727e0",
    "nonce": "0x0c9e0edc6c6e824e66e5c2344cb36221",
    "state": "VERIFIED",  // ← Auto-verified
    "evidences": [],
    "identity": {
      "identifier": "did:web:mkmpol21:0xTEST123",
      "registrationState": "REGISTERED"
    }
  }
}
```

### 3. Check for Attestation (After Waiting)
```bash
# Wait 10 seconds, then:
curl https://api.dymaxion-ou.co/api/attestations/did/did:web:mkmpol21:0xTEST123
```

**Response:** ✅ HTTP 200 (but empty data)
```json
{
  "success": true,
  "data": [],  // ← No attestation exists
  "statusCode": 200
}
```

### 4. Attempt Evidence Submission (Alternative Path)
```bash
curl -X POST https://api.dymaxion-ou.co/api/challenge-evidence \
  -H "Content-Type: application/json" \
  -d '{
    "challengeInstanceId": "b98d50d4-b800-434f-8b1f-b9b20c116046",
    "challengeId": "mfssia:C-U-1",
    "evidence": {
      "signature": "0x...",
      "nonce": "0x0c9e0edc6c6e824e66e5c2344cb36221",
      "address": "0xTEST123"
    }
  }'
```

**Response:** ❌ Error
```json
{
  "success": false,
  "message": "Challenge instance is not in progress",
  "statusCode": 400
}
```

---

## Root Cause Analysis

### Problem 1: Auto-Verification Without Oracle Processing

The "mfssia:Example-U" challenge set is configured to auto-verify instances:
- Challenge instances are created with `state: "VERIFIED"` immediately
- This appears to be intentional (demo/testing mode?)
- **However**, the oracle is not configured to process auto-verified instances

### Problem 2: Evidence Submission Blocked

Because `state: "VERIFIED"`:
- API rejects evidence submission
- Error: "Challenge instance is not in progress"
- This is expected behavior for VERIFIED instances
- **However**, it creates a deadlock: can't submit evidence, oracle doesn't create attestation

### Resulting Deadlock

```
Challenge Instance Created (state=VERIFIED)
    ↓
Evidence Submission → BLOCKED (not in progress)
    ↓
Oracle Processing → NEVER HAPPENS
    ↓
Attestation → NEVER CREATED
    ↓
User Authentication → BLOCKED FOREVER
```

---

## Impact

### User Experience
- ✅ Users can register DIDs
- ✅ Users can create challenge instances
- ❌ Users **cannot** obtain attestations
- ❌ Users **cannot** complete onboarding/authentication
- **Result:** 100% failure rate for authentication flow

### Production Readiness
- Cannot deploy to production
- All user onboarding is blocked
- No workaround available (evidence submission is rejected)

---

## Technical Details

### Challenge Set
- **Code:** `mfssia:Example-U`
- **UUID:** `c37f86ec-4127-4946-86f2-cb2a033727e0`
- **Challenges:** C-U-1 (Wallet Ownership), C-U-2 (Human Verification)
- **Policy:** ALL_MANDATORY
- **Auto-Verification:** ENABLED ← Source of problem

### Challenge Definitions
- **C-U-1 ID:** `0ed5285d-26e5-4cef-a225-2e7625eafd2f` (Created 2026-01-02, Status: ACTIVE)
- **C-U-2 ID:** `fc49aaec-5b52-4ad6-ba46-63c708677bc2` (Created 2026-01-02, Status: ACTIVE)

### API Endpoints Affected
1. `POST /api/challenge-instances` - Works, returns VERIFIED ✓
2. `GET /api/attestations/did/{did}` - Returns empty array ✗
3. `POST /api/challenge-evidence` - Rejects submission ✗

---

## Requested Fix

Please choose **ONE** of the following solutions:

### Option A: Enable Oracle for Auto-Verified Instances (Recommended)

Configure the oracle service to:
1. Monitor challenge instances with `state: "VERIFIED"`
2. Automatically evaluate them
3. Create attestations within 2-10 seconds

**Why:** This maintains the auto-verification feature while making it functional.

### Option B: Disable Auto-Verification

Change "mfssia:Example-U" configuration:
1. Challenge instances should start with `state: "IN_PROGRESS"` or `"PENDING_CHALLENGE"`
2. Allow evidence submission
3. Oracle evaluates after evidence is submitted
4. Oracle creates attestation if evidence passes

**Why:** This follows the normal challenge flow and is already supported by the API.

### Option C: Create New Challenge Set

Create a new challenge set (e.g., "mfssia:Example-U-v2"):
1. Use the same challenges (C-U-1, C-U-2)
2. Disable auto-verification
3. Allow normal evidence submission flow

**Why:** Preserves existing behavior while providing a working alternative.

---

## Verification Steps (After Fix)

To verify the oracle is working:

```bash
# 1. Create new instance
INSTANCE_ID=$(curl -X POST https://api.dymaxion-ou.co/api/challenge-instances \
  -H "Content-Type: application/json" \
  -d '{"did":"did:web:test:new", "challengeSet":"mfssia:Example-U"}' \
  | jq -r '.data.id')

# 2. Wait 10 seconds
sleep 10

# 3. Check for attestation
curl https://api.dymaxion-ou.co/api/attestations/did/did:web:test:new | jq

# Expected: attestation object with "ual" field
# Actual (currently): empty array []
```

**Success Criteria:**
- Attestation should exist within 10 seconds
- Response should include `"ual": "..."`
- Response should include `"oracleProof": { "finalResult": true }`

---

## Code Changes Made (Client-Side)

While waiting for the server-side fix, we've implemented:

### 1. Next.js 15 Compatibility
- Fixed async params handling in attestation route
- No functional impact, just compatibility fix

### 2. Auto-Verification Detection
- Detect when instances are auto-verified
- Skip evidence submission (would be rejected anyway)
- Poll for oracle-created attestation
- **Provide clear error when oracle fails** (current state)

### What We Did NOT Do
- ❌ No mock attestations
- ❌ No fallback mechanisms
- ❌ No workarounds that hide the problem

We want the real attestation from the oracle.

---

## Logs and Evidence

### Frontend Error Message (Clear Bug Report)
```
Error: MFSSIA API Bug: Oracle Not Creating Attestations

Problem: The "mfssia:Example-U" challenge set creates instances with state="VERIFIED"
but the oracle service does not create attestations for them.

Technical Details:
- Challenge Instance: b98d50d4-b800-434f-8b1f-b9b20c116046
- Instance State: VERIFIED
- DID: did:web:mkmpol21:0x90F79bf6EB2c4f870365E785982E1f101E93b906
- Challenge Set: mfssia:Example-U (UUID: c37f86ec-4127-4946-86f2-cb2a033727e0)

Expected Behavior:
When a challenge instance is created with state="VERIFIED", the oracle should
automatically create an attestation within 2-10 seconds.

Actual Behavior:
Attestation endpoint returns empty array indefinitely. Oracle appears to be
misconfigured or not processing this challenge set.
```

### Server Response Logs
```
POST /api/challenge-instances → HTTP 200, state="VERIFIED" ✓
GET /api/attestations/did/{did} → HTTP 200, data=[] ✗
POST /api/challenge-evidence → HTTP 400, "Challenge instance is not in progress" ✗
```

---

## Timeline

- **2025-12-30:** Challenges C-A-1, C-A-2, C-A-3 created (pre-existing)
- **2026-01-02:** Challenges C-U-1, C-U-2 created for DAO use case
- **2026-01-02:** Challenge set creation attempts → 500 errors (separate issue)
- **2026-01-03:** Discovered oracle not creating attestations for auto-verified instances
- **2026-01-03:** This bug report created

---

## Related Issues

### Issue 1: Challenge Set Creation Failures (Separate)
- Cannot create new challenge sets via API
- POST `/api/challenge-sets` returns 500 Internal Server Error
- This is a **different issue** from the oracle problem
- See `MFSSIA_CHALLENGE_CREATION_REPORT.md` for details

### Issue 2: Working Challenge Set "mfssia:Example-U" Exists
- Challenge set UUID `c37f86ec-4127-4946-86f2-cb2a033727e0` exists
- It was created server-side (not via API)
- It references our challenges C-U-1 and C-U-2
- **But oracle is not configured to process it**

---

## Contact Information

**Project:** MKMPOL21 DAO - Public Data Governance Platform
**Integration:** MFSSIA for user authentication
**Environment:** Production API (api.dymaxion-ou.co)
**Reporter:** Development Team

**Related Files:**
- `/MFSSIA_CHALLENGE_CREATION_REPORT.md` - Challenge creation history
- `/MFSSIA_DIAGNOSTIC.md` - Detailed diagnostic analysis
- `/packages/nextjs/hooks/useOnboarding.ts` - Client implementation

---

## Summary for MFSSIA Team

**The oracle service is not processing auto-verified challenge instances for "mfssia:Example-U".**

Please either:
1. Configure oracle to process auto-verified instances, OR
2. Disable auto-verification for this challenge set

This is blocking our production deployment. Please advise on timeline for fix.

Thank you!
