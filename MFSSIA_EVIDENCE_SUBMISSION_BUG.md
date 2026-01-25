# MFSSIA Bug Report: Challenge Set Not Found on Evidence Submission

**Date:** 2026-01-12
**Reporter:** MKMPOL21 DAO Integration Team
**Severity:** CRITICAL - Blocks onboarding flow
**API Version:** https://api.dymaxion-ou.co

---

## Summary

The `/api/challenge-evidence` endpoint returns `404 - Challenge Set not found` even though the challenge set exists and is queryable via `/api/challenge-sets`.

---

## Steps to Reproduce

### Step 1: Verify Challenge Set Exists

**Request:**
```bash
curl -X GET https://api.dymaxion-ou.co/api/challenge-sets/mfssia:Example-U
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "c37f86ec-4127-4946-86f2-cb2a033727e0",
    "code": "mfssia:Example-U",
    "name": "DAO User Onboarding",
    "status": "ACTIVE",
    "challenges": [
      {
        "id": "0ed5285d-26e5-4cef-a225-2e7625eafd2f",
        "code": "mfssia:C-U-1",
        "name": "Wallet Ownership Proof"
      },
      {
        "id": "fc49aaec-5b52-4ad6-ba46-63c708677bc2",
        "code": "mfssia:C-U-2",
        "name": "Human Interaction Verification"
      }
    ]
  }
}
```

**Result:** Challenge set EXISTS with UUID `c37f86ec-4127-4946-86f2-cb2a033727e0`

---

### Step 2: Create Challenge Instance (Works)

**Request:**
```bash
curl -X POST https://api.dymaxion-ou.co/api/challenge-instances \
  -H "Content-Type: application/json" \
  -d '{
    "did": "did:web:mkmpol21:0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
    "challengeSet": "mfssia:Example-U"
  }'
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "70d8881a-600a-4465-8af5-0139f46d70de",
    "challengeSet": "c37f86ec-4127-4946-86f2-cb2a033727e0",
    "nonce": "0xfb87648157a97ee4ba7b3b87926a4327",
    "state": "IN_PROGRESS",
    "expiresAt": "2026-01-12T11:36:47.564Z"
  }
}
```

**Result:** Instance created successfully using challenge set `c37f86ec-4127-4946-86f2-cb2a033727e0`

---

### Step 3: Submit Evidence (FAILS)

**Request:**
```bash
curl -X POST https://api.dymaxion-ou.co/api/challenge-evidence \
  -H "Content-Type: application/json" \
  -d '{
    "challengeInstanceId": "70d8881a-600a-4465-8af5-0139f46d70de",
    "challengeId": "0ed5285d-26e5-4cef-a225-2e7625eafd2f",
    "evidence": {
      "signature": "0xa2051b15f1fc4840a9a21a1a64a354cf7827b64a9956d8ade3f3ea12976335333f55219df01d61b01eb678d516a569f859310c5eaf4b47b58c981cc3075fe2161b",
      "nonce": "0xfb87648157a97ee4ba7b3b87926a4327",
      "address": "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720"
    }
  }'
```

**Response:** `404 Not Found`
```json
{
  "message": "Challenge Set c37f86ec-4127-4946-86f2-cb2a033727e0 not found",
  "error": "Not Found",
  "statusCode": 404
}
```

**Result:** FAILS - Cannot find challenge set that was just used to create the instance

---

## Variations Attempted

We tried multiple formats for `challengeId`:

| Format | Value | Result |
|--------|-------|--------|
| Challenge Code | `mfssia:C-U-1` | 404 - Challenge Set not found |
| Challenge Definition UUID | `0ed5285d-26e5-4cef-a225-2e7625eafd2f` | 404 - Challenge Set not found |

Both return the same error: the CHALLENGE SET cannot be found.

---

## Bug Analysis

### The Contradiction

1. **GET /api/challenge-sets/mfssia:Example-U** returns the challenge set with UUID `c37f86ec-4127-4946-86f2-cb2a033727e0`
2. **POST /api/challenge-instances** successfully creates instances using this challenge set
3. **POST /api/challenge-evidence** claims the SAME challenge set does not exist

### Likely Root Cause

The `/api/challenge-evidence` endpoint uses a **different data source** (database, cache, or microservice) than the other endpoints. This data source does not have the challenge set `c37f86ec-4127-4946-86f2-cb2a033727e0` registered.

Possible issues:
- Database replication lag between services
- Missing database migration on the evidence service
- Caching issue where old data is being served
- The evidence service queries a different table/collection
- Challenge set was created but not propagated to all services

---

## Impact

- **CRITICAL:** Complete blocker for DAO onboarding
- Users cannot submit evidence for identity verification
- The entire MFSSIA integration flow is non-functional

---

## Requested Actions

1. **Verify data consistency** between the challenge-sets service and challenge-evidence service
2. **Check if challenge set `c37f86ec-4127-4946-86f2-cb2a033727e0`** exists in the database used by the evidence endpoint
3. **Run database sync/migration** if necessary
4. **Clear any caches** that might be serving stale data
5. **Confirm the expected format** for `challengeId` field (code vs UUID)

---

## Environment

- **API URL:** https://api.dymaxion-ou.co
- **Challenge Set Code:** mfssia:Example-U
- **Challenge Set UUID:** c37f86ec-4127-4946-86f2-cb2a033727e0
- **Challenge Definition UUID (C-U-1):** 0ed5285d-26e5-4cef-a225-2e7625eafd2f
- **Client:** MKMPOL21 DAO (Next.js)

---

## Contact

Please respond with:
1. Confirmation of the bug
2. Expected resolution timeline
3. Any workaround we can implement client-side

Thank you for your prompt attention to this critical issue.
