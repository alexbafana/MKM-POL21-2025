# MFSSIA Integration Diagnostic Report

**Date:** January 3, 2026
**Status:** ⚠️ ORACLE MALFUNCTION DETECTED

---

## Current Issue

The MFSSIA API is creating challenge instances with `state: "VERIFIED"` for the "mfssia:Example-U" challenge set, but the oracle is **not creating attestations**. This breaks the authentication flow.

### Symptom Timeline

1. ✅ DID registration succeeds
2. ✅ Challenge instance creation succeeds (but returns `state: "VERIFIED"`)
3. ❌ Evidence submission **rejected** with error: "Challenge instance is not in progress"
4. ❌ Attestation polling **times out** after 60 seconds (oracle not responding)

---

## Root Cause Analysis

### Expected Flow (Normal Operation)
```
Register DID → Create Instance (IN_PROGRESS) → Submit Evidence → Oracle Verifies → Attestation Created
```

### Actual Flow (Current Bug)
```
Register DID → Create Instance (VERIFIED) → [Cannot Submit Evidence] → [Oracle Doesn't Create Attestation] → TIMEOUT
```

### Root Cause

The "mfssia:Example-U" challenge set is configured for **auto-verification** but:
- The oracle is not automatically creating attestations for VERIFIED instances
- Evidence submission is blocked because state is VERIFIED (not IN_PROGRESS)
- This creates a deadlock where attestations can never be created

---

## Evidence

### Challenge Instance Response
```json
{
  "id": "b98d50d4-b800-434f-8b1f-b9b20c116046",
  "challengeSet": "c37f86ec-4127-4946-86f2-cb2a033727e0",
  "state": "VERIFIED",  // ← Auto-verified on creation
  "evidences": [],      // ← No evidence submitted
  ...
}
```

### Attestation Response (Empty)
```json
{
  "success": true,
  "data": []  // ← No attestation exists
}
```

### Error When Trying to Submit Evidence
```
Error: [/api/mfssia/submit-evidence] Challenge instance is not in progress
```

---

## Attempted Fixes

### Fix #1: Next.js 15 Params Compatibility ✅
**Issue:** Route params not awaited
**Status:** Fixed in `/api/mfssia/attestation/[did]/route.ts`

### Fix #2: Auto-Verification Detection ✅
**Issue:** Code tried to submit evidence for VERIFIED instances
**Status:** Fixed in `/hooks/useOnboarding.ts` - now detects auto-verified instances and polls for attestation

### Fix #3: Oracle Response Waiting ⏳
**Issue:** Oracle not creating attestations
**Status:** Implemented 60-second polling, but oracle never responds

---

## Solutions

### Option 1: Contact MFSSIA Support (Recommended)

**Report to:** MFSSIA API Team
**Issue:** Oracle not creating attestations for auto-verified "mfssia:Example-U" challenge set

**Required Fix:**
- Enable oracle attestation creation for VERIFIED challenge instances, OR
- Disable auto-verification for "mfssia:Example-U" so evidence can be submitted normally

### Option 2: Use Alternative Challenge Set

Try using "mfssia:Example-A" instead:

**Required Code Changes:**
1. Update challenge set:
   ```typescript
   // In useOnboarding.ts line 234
   const challengeSet = "mfssia:Example-A"; // Instead of Example-U
   ```

2. Update evidence schemas to match C-A-1 and C-A-2:
   ```typescript
   // C-A-1 expects: { signature, message, publicKey }
   // C-A-2 expects: { interactionTime, userAgent, timestamp }
   ```

**Warning:** This requires updating evidence generation code in multiple files.

### Option 3: Disable MFSSIA (Temporary)

For development only:

```bash
# In .env.local
NEXT_PUBLIC_MFSSIA_ENABLED=false
```

This allows development of other features while waiting for MFSSIA fix.

---

## Technical Details

### Challenge Set Configuration

**Current:** `mfssia:Example-U` (UUID: `c37f86ec-4127-4946-86f2-cb2a033727e0`)
- Challenges: C-U-1 (Wallet Ownership), C-U-2 (Human Verification)
- Policy: ALL_MANDATORY
- **Auto-Verification:** ENABLED ← Problem source

**Expected Behavior:**
- Auto-verified instances should trigger oracle automatically
- Oracle should create attestation within 2-10 seconds
- Current reality: Oracle never responds

### API Endpoints Involved

1. `POST /api/identities/register` ✅ Works
2. `POST /api/challenge-instances` ✅ Works (but returns VERIFIED)
3. `POST /api/challenge-evidence` ❌ Blocked for VERIFIED instances
4. `GET /api/attestations/did/{did}` ❌ Returns empty array forever

---

## Code Changes Made

### `/packages/nextjs/app/api/mfssia/attestation/[did]/route.ts`
- Fixed Next.js 15 async params issue
- Changed `const { did } = params` to `const { did } = await params`
- Updated type: `params: Promise<{ did: string }>`

### `/packages/nextjs/hooks/useOnboarding.ts`
- Added auto-verification detection (lines 512-575)
- When instance state is VERIFIED:
  - Skip evidence submission (would be rejected)
  - Poll for oracle-created attestation (60 seconds)
  - Provide clear error if oracle doesn't respond
- Added comprehensive error messages with solution suggestions

---

## Current System State

### Working Components ✅
- DID registration
- Challenge instance creation
- Frontend UI and flow
- Smart contract integration
- Evidence generation code

### Broken Components ❌
- MFSSIA oracle (not creating attestations)
- Challenge set configuration (auto-verify enabled incorrectly)
- End-to-end authentication flow

### Impact
Users **cannot complete onboarding** until the MFSSIA oracle is fixed.

---

## Verification Steps

To verify the oracle starts working:

1. Create a new challenge instance:
   ```bash
   curl -X POST https://api.dymaxion-ou.co/api/challenge-instances \
     -H "Content-Type: application/json" \
     -d '{"did":"did:web:mkmpol21:0xTEST", "challengeSet":"mfssia:Example-U"}'
   ```

2. Check instance state (should be VERIFIED):
   ```bash
   curl https://api.dymaxion-ou.co/api/challenge-instances/{instanceId}
   ```

3. **Wait 10 seconds**, then check for attestation:
   ```bash
   curl https://api.dymaxion-ou.co/api/attestations/did/did:web:mkmpol21:0xTEST
   ```

4. If attestation exists → Oracle is fixed ✅
   If empty array → Oracle still broken ❌

---

## Next Steps

1. **Contact MFSSIA support** with this diagnostic report
2. **Request oracle fix** for "mfssia:Example-U" challenge set
3. **Alternative:** Ask MFSSIA to disable auto-verification for Example-U
4. **Monitor** API health using verification steps above
5. **Re-test** onboarding flow once oracle is working

---

## Files Modified

- `/packages/nextjs/app/api/mfssia/attestation/[did]/route.ts` - Next.js 15 fix
- `/packages/nextjs/hooks/useOnboarding.ts` - Auto-verification handling
- `/MFSSIA_DIAGNOSTIC.md` - This file

## Related Documentation

- `/MFSSIA_CHALLENGE_CREATION_REPORT.md` - Challenge creation history
- `/MFSSIA_INTEGRATION_PLAN.md` - Original integration plan
- `/NO_API_KEY_REQUIRED.md` - API authentication notes
