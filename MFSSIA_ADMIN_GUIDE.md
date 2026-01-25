# MFSSIA Admin Guide for DAO Owner

**Last Updated:** 2025-12-30
**API Endpoint:** https://api.dymaxion-ou.co
**Purpose:** Configure challenge sets and definitions for MKM-POL21 DAO authentication

---

## Executive Summary

✅ **Yes, the DAO owner can manage challenge sets directly via the MFSSIA API**

The MFSSIA production node provides comprehensive admin endpoints for creating and managing:
- Challenge Definitions (individual challenges like C-A-1, C-B-1, etc.)
- Challenge Sets (grouped challenges like Example-A, Example-B, Example-D)

**Requirements:**
- Admin API key with governance/admin permissions
- Access to the `mfssia-admin-setup.ts` script (included in this repo)

---

## API Capabilities

### ✅ Available Admin Operations

| Operation | Endpoint | Method | Purpose |
|-----------|----------|--------|---------|
| Create Challenge Definition | `/api/challenge-definitions` | POST | Add new challenge type |
| Update Challenge Definition | `/api/challenge-definitions/{id}` | PATCH | Modify existing challenge (pre-publish only) |
| Delete Challenge Definition | `/api/challenge-definitions/{id}` | DELETE | Remove unused challenge |
| Create Challenge Set | `/api/challenge-sets` | POST | Create challenge set |
| Update Challenge Set | `/api/challenge-sets/{id}` | PATCH | Modify challenge set |
| Delete Challenge Set | `/api/challenge-sets/{id}` | DELETE | Remove unused set |
| List Challenge Definitions | `/api/challenge-definitions` | GET | View all definitions |
| List Challenge Sets | `/api/challenge-sets` | GET | View all sets |
| Get Specific Definition | `/api/challenge-definitions/{id}` | GET | View one definition |
| Get Specific Set | `/api/challenge-sets/{id}` | GET | View one set |

### 🔐 Authentication Requirements

All admin operations require:
```
Authorization: Bearer <ADMIN_API_KEY>
```

The API key must have **governance** or **admin** level permissions on the MFSSIA node.

---

## Required Challenge Sets for MKM-POL21 DAO

The DAO requires three challenge sets:

### 1. Example-A: Individual User Authentication
**Purpose:** Basic authentication for ordinary users

**Challenges:**
- ✅ `C-A-1`: Wallet Ownership (mandatory)
- ✅ `C-A-2`: Liveness Check (mandatory)
- ⚪ `C-A-3`: Geographic Location (optional)

**Policy:**
- Minimum challenges: 2
- Confidence threshold: 0.85
- Aggregation: ALL_MANDATORY_AND_WEIGHTED_CONFIDENCE

### 2. Example-B: Institutional Authentication
**Purpose:** Enhanced authentication for member institutions

**Challenges:**
- ✅ `C-B-1`: Domain Ownership (mandatory)
- ✅ `C-B-2`: Business Registry Verification (mandatory)
- ✅ `C-B-3`: Authorized Representative (mandatory)
- ✅ `C-B-4`: Institutional Signature (mandatory)

**Policy:**
- Minimum challenges: 4
- Confidence threshold: 0.90
- Aggregation: ALL_MANDATORY_AND_WEIGHTED_CONFIDENCE

### 3. Example-D: RDF Data Validation
**Purpose:** Employment trends RDF graph validation pipeline

**Challenges:**
- ✅ `C-D-1`: Source Authenticity (mandatory)
- ✅ `C-D-2`: Content Integrity (mandatory)
- ✅ `C-D-3`: NLP Determinism (mandatory)
- ✅ `C-D-4`: Semantic Coherence (mandatory)
- ✅ `C-D-5`: Employment Event Plausibility (mandatory)
- ✅ `C-D-6`: EMTAK Consistency (mandatory)
- ✅ `C-D-7`: Temporal Validity (mandatory)
- ✅ `C-D-8`: Provenance Closure (mandatory)
- ✅ `C-D-9`: Governance Acknowledgement (mandatory)

**Policy:**
- Minimum challenges: 9
- Confidence threshold: 0.85
- Aggregation: ALL_MANDATORY_AND_WEIGHTED_CONFIDENCE

---

## Setup Instructions

### Option 1: Automated Setup (Recommended)

Use the provided setup script to create all challenge definitions and sets automatically.

#### Step 1: Obtain Admin API Key

Contact the MFSSIA node administrator to obtain an API key with governance/admin permissions.

Store it securely in your environment:
```bash
export MFSSIA_ADMIN_API_KEY="your_admin_api_key_here"
```

#### Step 2: Run Setup Script

Navigate to the Next.js package and run the setup script:

```bash
cd packages/nextjs
npx tsx mfssia-admin-setup.ts
```

#### Step 3: Verify Setup

The script will:
1. Create 16 challenge definitions (3 for Example-A, 4 for Example-B, 9 for Example-D)
2. Create 3 challenge sets (Example-A, Example-B, Example-D)
3. Verify that all items were created successfully

**Expected Output:**
```
╔══════════════════════════════════════════════════════════╗
║            MFSSIA ADMIN SETUP SCRIPT                     ║
╚══════════════════════════════════════════════════════════╝

API Endpoint: https://api.dymaxion-ou.co
Admin API Key: ✅ Configured
Timestamp: 2025-12-30T15:00:00.000Z

============================================================
STEP 1: Creating Challenge Definitions
============================================================

Total definitions to create: 16

🔄 POST /api/challenge-definitions
✅ Success (350ms)
✅ mfssia:C-A-1

🔄 POST /api/challenge-definitions
✅ Success (320ms)
✅ mfssia:C-A-2

... (14 more definitions)

============================================================
STEP 2: Creating Challenge Sets
============================================================

Total challenge sets to create: 3

🔄 POST /api/challenge-sets
✅ Success (450ms)
✅ mfssia:Example-A

🔄 POST /api/challenge-sets
✅ Success (420ms)
✅ mfssia:Example-B

🔄 POST /api/challenge-sets
✅ Success (430ms)
✅ mfssia:Example-D

============================================================
📊 MFSSIA ADMIN SETUP SUMMARY
============================================================

Total Items: 19
✅ Success: 19
❌ Failed: 0

============================================================

🎉 ALL ITEMS CREATED!
```

---

### Option 2: Manual Setup via API

If you prefer manual control or need to create custom challenge sets:

#### Creating a Challenge Definition

**Endpoint:** `POST /api/challenge-definitions`

**Request Body Example:**
```json
{
  "code": "mfssia:C-A-1",
  "name": "Wallet Ownership",
  "description": "Verify that the user controls the wallet associated with their DID",
  "factorClass": "SourceIntegrity",
  "question": "Does the user control the cryptographic keys for this wallet?",
  "expectedEvidence": [
    {
      "type": "mfssia:SignedMessage",
      "name": "signature",
      "dataType": "string"
    },
    {
      "type": "mfssia:Message",
      "name": "message",
      "dataType": "string"
    },
    {
      "type": "mfssia:PublicKey",
      "name": "publicKey",
      "dataType": "string"
    }
  ],
  "oracle": {
    "type": "mfssia:Oracle",
    "name": "CryptoSignatureVerifier",
    "oracleType": "INTERNAL",
    "verificationMethod": "ECDSA signature verification"
  },
  "evaluation": {
    "resultType": "assertions",
    "passCondition": "Signature is cryptographically valid for the provided message and public key"
  },
  "failureEffect": "User cannot authenticate as an individual",
  "reusability": "GLOBAL",
  "version": "1.0.0",
  "status": "ACTIVE"
}
```

**cURL Example:**
```bash
curl -X POST https://api.dymaxion-ou.co/api/challenge-definitions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MFSSIA_ADMIN_API_KEY" \
  -d '{
    "code": "mfssia:C-A-1",
    "name": "Wallet Ownership",
    ...
  }'
```

#### Creating a Challenge Set

**Endpoint:** `POST /api/challenge-sets`

**Request Body Example:**
```json
{
  "code": "mfssia:Example-A",
  "name": "Individual User Authentication",
  "description": "Basic authentication for ordinary users accessing the DAO platform",
  "version": "1.0.0",
  "status": "ACTIVE",
  "publishedBy": {
    "type": "Organization",
    "name": "MKM-POL21 DAO"
  },
  "mandatoryChallenges": ["mfssia:C-A-1", "mfssia:C-A-2"],
  "optionalChallenges": ["mfssia:C-A-3"],
  "policy": {
    "minChallengesRequired": 2,
    "aggregationRule": "ALL_MANDATORY_AND_WEIGHTED_CONFIDENCE",
    "confidenceThreshold": 0.85
  },
  "lifecycle": {
    "creationEvent": "DAO_APPROVAL",
    "mutation": "IMMUTABLE",
    "deprecationPolicy": "VERSIONED_REPLACEMENT"
  }
}
```

**cURL Example:**
```bash
curl -X POST https://api.dymaxion-ou.co/api/challenge-sets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MFSSIA_ADMIN_API_KEY" \
  -d '{
    "code": "mfssia:Example-A",
    "name": "Individual User Authentication",
    ...
  }'
```

---

## Schema Reference

### Challenge Definition Schema

```typescript
interface CreateChallengeDefinitionDto {
  code: string;                          // Unique identifier (e.g., "mfssia:C-A-1")
  name: string;                          // Human-readable name
  description: string;                   // Detailed description
  factorClass: "SourceIntegrity" | "DataIntegrity" | "ProcessIntegrity" |
               "Semantic" | "Provenance" | "Governance";
  question: string;                      // Verification question
  expectedEvidence: EvidenceTypeDto[];   // Required evidence structure
  oracle: OracleDto;                     // Oracle configuration
  evaluation: EvaluationDto;             // Evaluation rules
  failureEffect: string;                 // Consequence of failure
  reusability: string;                   // Scope (typically "GLOBAL")
  version: string;                       // Version number
  status: "ACTIVE" | "DEPRECATED" | "DRAFT";
}

interface EvidenceTypeDto {
  type: string;                          // Evidence type identifier
  name: string;                          // Field name
  dataType: string;                      // Data type (string, number, etc.)
}

interface OracleDto {
  type: string;                          // Oracle type identifier
  name: string;                          // Oracle name
  oracleType: "CHAINLINK" | "INTERNAL" | "DAO" | "PYTH";
  verificationMethod: string;            // How verification is performed
}

interface EvaluationDto {
  resultType: "entities" | "assertions";
  passCondition: string;                 // Pass criteria
}
```

### Challenge Set Schema

```typescript
interface CreateChallengeSetDto {
  code: string;                          // Unique identifier (pattern: "mfssia:Example-[A-Z]")
  name: string;                          // Set name
  description: string;                   // Detailed description
  version: string;                       // Version number
  status: string;                        // Status (e.g., "ACTIVE")
  publishedBy: PublishedByDto;           // Publisher information
  mandatoryChallenges: string[];         // Required challenge codes
  optionalChallenges: string[];          // Optional challenge codes
  policy: PolicyDto;                     // Policy rules
  lifecycle: LifecycleDto;               // Lifecycle metadata
}

interface PublishedByDto {
  type: string;                          // Publisher type (e.g., "Organization")
  name: string;                          // Publisher name
}

interface PolicyDto {
  minChallengesRequired: number;         // Minimum passing challenges
  aggregationRule: "ALL_MANDATORY" |
                   "ALL_MANDATORY_AND_THRESHOLD" |
                   "ALL_MANDATORY_AND_WEIGHTED_CONFIDENCE";
  confidenceThreshold?: number;          // Confidence threshold (0.0-1.0)
}

interface LifecycleDto {
  creationEvent: string;                 // Creation trigger (e.g., "DAO_APPROVAL")
  mutation: string;                      // Mutability (e.g., "IMMUTABLE")
  deprecationPolicy: string;             // Deprecation strategy
}
```

---

## Verification

After running the setup script, verify that everything was created correctly:

### Check Challenge Sets

```bash
curl https://api.dymaxion-ou.co/api/challenge-sets \
  -H "Authorization: Bearer $MFSSIA_ADMIN_API_KEY"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "code": "mfssia:Example-A",
      "name": "Individual User Authentication",
      ...
    },
    {
      "code": "mfssia:Example-B",
      "name": "Institutional Authentication",
      ...
    },
    {
      "code": "mfssia:Example-D",
      "name": "RDF Data Validation",
      ...
    }
  ],
  "statusCode": 200
}
```

### Check Challenge Definitions

```bash
curl https://api.dymaxion-ou.co/api/challenge-definitions \
  -H "Authorization: Bearer $MFSSIA_ADMIN_API_KEY"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "code": "mfssia:C-A-1",
      "name": "Wallet Ownership",
      ...
    },
    {
      "code": "mfssia:C-A-2",
      "name": "Liveness Check",
      ...
    },
    ... (14 more definitions)
  ],
  "statusCode": 200
}
```

### Test Challenge Instance Creation

Once challenge sets are configured, test creating a challenge instance:

```bash
curl -X POST https://api.dymaxion-ou.co/api/challenge-instances \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MFSSIA_ADMIN_API_KEY" \
  -d '{
    "did": "did:web:test:12345",
    "challengeSet": "mfssia:Example-A"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "challengeSet": "mfssia:Example-A",
    "subjectDid": "did:web:test:12345",
    "nonce": "a1b2c3d4e5f6",
    "issuedAt": "2025-12-30T15:00:00.000Z",
    "expiresAt": "2025-12-30T16:00:00.000Z",
    "state": "PENDING_CHALLENGE",
    "submittedEvidenceCount": 0
  },
  "statusCode": 201
}
```

---

## Updating Challenge Sets

### Important Restrictions

- **Challenge Definitions:** Can only be updated before publication (status: DRAFT)
- **Challenge Sets:** Versioning is recommended instead of in-place updates
- **Deletion:** Only allowed if the challenge/set is not being used

### Update Example

```bash
curl -X PATCH https://api.dymaxion-ou.co/api/challenge-sets/mfssia:Example-A \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MFSSIA_ADMIN_API_KEY" \
  -d '{
    "description": "Updated description for individual authentication"
  }'
```

### Delete Example (Only if Unused)

```bash
curl -X DELETE https://api.dymaxion-ou.co/api/challenge-definitions/mfssia:C-A-1 \
  -H "Authorization: Bearer $MFSSIA_ADMIN_API_KEY"
```

---

## Troubleshooting

### Error: "Unauthorized" or 401

**Cause:** API key is missing or invalid

**Solution:**
1. Verify `MFSSIA_ADMIN_API_KEY` is set correctly
2. Confirm the API key has admin/governance permissions
3. Contact MFSSIA node administrator to obtain correct key

### Error: "Challenge Set already exists"

**Cause:** Attempting to create a challenge set that already exists

**Solution:**
1. Use PATCH to update instead of POST
2. Or delete the existing set first (if unused)
3. Or create a new version with a different code

### Error: "Challenge Definition not found"

**Cause:** Trying to create a challenge set referencing non-existent challenges

**Solution:**
1. Create all challenge definitions first
2. Then create challenge sets that reference them
3. Verify challenge codes match exactly (case-sensitive)

### Error: "Cannot delete - challenge is in use"

**Cause:** Attempting to delete a challenge that's referenced by existing instances

**Solution:**
1. Check which challenge sets reference this challenge
2. Remove from challenge sets first
3. Ensure no active challenge instances exist

---

## Security Best Practices

1. **Protect Admin API Key:**
   - Never commit API keys to version control
   - Store in environment variables or secure vaults
   - Rotate keys periodically

2. **Test in Staging First:**
   - If available, test setup on staging MFSSIA node
   - Verify all challenge sets work as expected
   - Then replicate to production

3. **Immutability:**
   - Once published, challenge sets should be immutable
   - Use versioning for updates (Example-A-v2, Example-A-v3)
   - Maintain backward compatibility

4. **Audit Trail:**
   - Keep logs of all admin operations
   - Document who created/modified which challenges
   - Track changes over time

---

## Next Steps After Setup

Once challenge sets are configured:

1. **Enable MFSSIA in DAO:**
   ```bash
   export NEXT_PUBLIC_MFSSIA_ENABLED=true
   ```

2. **Test Authentication Flow:**
   ```bash
   cd packages/nextjs
   npx tsx test-mfssia-integration.ts
   ```

3. **Update Frontend:**
   - Onboarding flow will now use real MFSSIA authentication
   - Role assignment will require attestations
   - Monitor for successful UAL generation

4. **Monitor MFSSIA Health:**
   - Set up monitoring for MFSSIA API availability
   - Track attestation success rates
   - Log failed challenges for investigation

---

## Support

### MFSSIA API Documentation
- **API Docs:** https://api.dymaxion-ou.co/docs
- **Swagger Spec:** https://api.dymaxion-ou.co/docs-json

### MKM-POL21 DAO Resources
- **Integration Test:** `packages/nextjs/test-mfssia-integration.ts`
- **Test Report:** `MFSSIA_INTEGRATION_TEST_REPORT.md`
- **Service Client:** `packages/nextjs/services/MFSSIAService.ts`

### Contact
For issues with:
- **MFSSIA Node:** Contact MFSSIA node administrator
- **DAO Integration:** Check test reports and integration documentation
- **Smart Contracts:** Review `packages/hardhat/contracts/`

---

## Appendix: Challenge Definitions Reference

### Example-A Challenges

| Code | Name | Factor Class | Oracle Type | Confidence Impact |
|------|------|--------------|-------------|-------------------|
| C-A-1 | Wallet Ownership | SourceIntegrity | INTERNAL | High |
| C-A-2 | Liveness Check | ProcessIntegrity | INTERNAL | Medium |
| C-A-3 | Geographic Location | DataIntegrity | INTERNAL | Low (optional) |

### Example-B Challenges

| Code | Name | Factor Class | Oracle Type | Confidence Impact |
|------|------|--------------|-------------|-------------------|
| C-B-1 | Domain Ownership | SourceIntegrity | INTERNAL | High |
| C-B-2 | Business Registry | SourceIntegrity | CHAINLINK | High |
| C-B-3 | Authorized Rep | ProcessIntegrity | INTERNAL | High |
| C-B-4 | Institutional Sig | SourceIntegrity | INTERNAL | High |

### Example-D Challenges

| Code | Name | Factor Class | Oracle Type | Confidence Impact |
|------|------|--------------|-------------|-------------------|
| C-D-1 | Source Authenticity | SourceIntegrity | INTERNAL | Critical |
| C-D-2 | Content Integrity | DataIntegrity | INTERNAL | Critical |
| C-D-3 | NLP Determinism | ProcessIntegrity | INTERNAL | High |
| C-D-4 | Semantic Coherence | Semantic | INTERNAL | High |
| C-D-5 | Employment Plausibility | Semantic | INTERNAL | Medium |
| C-D-6 | EMTAK Consistency | Semantic | CHAINLINK | High |
| C-D-7 | Temporal Validity | DataIntegrity | INTERNAL | Medium |
| C-D-8 | Provenance Closure | Provenance | INTERNAL | High |
| C-D-9 | Governance Acknowledgement | Governance | DAO | Critical |

---

**Document Version:** 1.0
**Last Updated:** 2025-12-30
**Maintainer:** MKM-POL21 DAO Development Team
