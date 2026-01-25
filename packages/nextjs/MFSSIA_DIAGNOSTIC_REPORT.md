# MFSSIA Integration Diagnostic Report

**Generated:** 2026-01-19

## Test Script Location
`packages/nextjs/scripts/test-mfssia-e2e.ts`

## Run Command
```bash
npx tsx scripts/test-mfssia-e2e.ts
```

## Test Results Summary

| Step | Status | Duration | Notes |
|------|--------|----------|-------|
| DID Registration | ✅ PASS | ~700ms | Uses `requestedChallengeSet` not `challengeSet` |
| Challenge Instance Creation | ✅ PASS | ~500ms | State starts as `IN_PROGRESS` |
| WebSocket Connection | ✅ PASS | ~200ms | Connects to `/ws/oracle` path |
| Evidence Submission | ✅ PASS | ~18s | All 6 challenges submitted successfully |
| Oracle Verification | ❌ FAIL | 3+ min | Stuck in `VERIFICATION_IN_PROGRESS` |
| WebSocket Events | ⚠️ PARTIAL | - | Only received `oracle_connected` and `oracle.subscribed` |
| Attestation Fetch | ❌ FAIL | - | No attestation created (Oracle never completed) |

## Key Findings

### 1. WebSocket Event Naming Convention - MIXED
The MFSSIA Oracle server uses **mixed notation** for event names:
- `oracle_connected` - **UNDERSCORE** notation
- `oracle.subscribed` - **DOT** notation with correct `verificationInstanceId`

**Important:** The `oracle.subscribed` event DOES include the correct `verificationInstanceId`, proving the server CAN include it.

### 2. No Verification Events Received
After evidence submission, the test received:
- ✅ `oracle_connected` (immediately on connect)
- ✅ `oracle.subscribed` (after subscribing to instance)
- ❌ No `oracle.verification.processing` events
- ❌ No `oracle.verification.success` events
- ❌ No `oracle.verification.failed` events

### 3. Oracle Server Stuck in VERIFICATION_IN_PROGRESS
The challenge instance state:
- After evidence submission: `AWAITING_EVIDENCE` → `VERIFICATION_IN_PROGRESS`
- After 3+ minutes polling: Still `VERIFICATION_IN_PROGRESS`
- Never transitions to `VERIFIED` or `FAILED`

### 4. API Endpoint Corrections
| Operation | Incorrect Endpoint | Correct Endpoint |
|-----------|-------------------|------------------|
| DID Registration | `challengeSet` field | `requestedChallengeSet` field |
| Evidence Submission | `/api/challenge-evidence/batch` | `/api/challenge-evidence` with `responses[]` |
| Attestation Fetch | `/api/attestations/{did}` | `/api/attestations/did/{did}` |

## Root Cause Analysis

### Primary Issue: Oracle Not Processing
The MFSSIA Oracle server is **not processing verification requests**. Evidence is successfully submitted, but:
1. The Oracle never emits `oracle.verification.processing` events
2. The instance state never changes from `VERIFICATION_IN_PROGRESS`
3. No attestation is ever created

### Possible Causes
1. **Oracle service is down or overloaded** - The Oracle worker processes may not be running
2. **Queue backed up** - Verification requests may be stuck in a processing queue
3. **Evidence format mismatch** - The Oracle may expect different evidence structure
4. **Challenge set configuration** - Example-A challenges may not be properly configured on the Oracle
5. **Network/timeout issues** - The Oracle may be timing out when calling external verification services

## Recommendations

### For MFSSIA Team
1. Check if Oracle worker processes are running
2. Check the Oracle processing queue for stuck items
3. Review Oracle logs for errors when processing Example-A challenges
4. Verify the challenge set `d3d5c984-7dad-4a74-b6e9-241fa27b5c1a` (Example-A) is properly configured

### For Our Integration
The following changes have been made to handle the issues:

1. **MFSSIAWebSocketService.ts** - Added listeners for both underscore and dot notation events
2. **useArtifactIntegrity.ts** - Added polling fallback with 5-minute timeout
3. **MFSSIAService.ts** - Uses correct endpoint formats

## WebSocket Event Handlers Implemented

```typescript
// Dot notation (as documented)
socket.on('oracle.verification.processing', handler);
socket.on('oracle.verification.success', handler);
socket.on('oracle.verification.failed', handler);

// Underscore notation (discovered via testing)
socket.on('oracle_verification_processing', handler);
socket.on('oracle_verification_success', handler);
socket.on('oracle_verification_failed', handler);
```

## Evidence Structure (Working)

```json
{
  "challengeInstanceId": "uuid",
  "responses": [
    {
      "challengeId": "mfssia:C-A-1",
      "evidence": {
        "sourceDomainHash": "sha256-hash",
        "contentHash": "sha256-hash"
      }
    },
    // ... other challenges
  ]
}
```

## Instance State Machine (Observed)

```
PENDING_CHALLENGE → IN_PROGRESS → AWAITING_EVIDENCE → VERIFICATION_IN_PROGRESS → ???
                                                                                  ↓
                                                      (Never reaches VERIFIED or FAILED)
```

## Next Steps

1. **Contact MFSSIA support** with this diagnostic report
2. Request Oracle status and processing queue information
3. Ask for example of successfully processed verification
4. Consider implementing longer timeout or retry mechanism
5. Monitor for `VERIFICATION_IN_PROGRESS` state and alert user that Oracle is processing (may take time)
