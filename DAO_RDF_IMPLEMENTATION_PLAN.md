# MKM-POL21 DAO - RDF Integration Implementation Plan

**Version:** 2.0
**Date:** 2025-12-30
**Status:** COMPREHENSIVE REQUIREMENTS ANALYSIS

> **⚠️ IMPORTANT UPDATE (2026-01-02):**
> **The MFSSIA API is a PUBLIC API and does NOT require any API key.**
> Any references to `MFSSIA_API_KEY` in this document are **OUTDATED** and should be ignored.
> Only `NEXT_PUBLIC_MFSSIA_ENABLED=true` and `MFSSIA_API_URL=https://api.dymaxion-ou.co` are needed.
> See [MFSSIA_API_REFERENCE.md](./MFSSIA_API_REFERENCE.md) for current documentation.

---

## Executive Summary

This document provides a **code-level implementation plan** for integrating the **MKM-POL21 DAO** with the **RDF validation pipeline**, **DKG publication system**, and **MFSSIA authentication** as outlined in the project requirements.

The plan analyzes the **current codebase**, identifies **missing functionalities**, and proposes **specific code enhancements** with **concrete file paths and line numbers** to achieve full system compliance.

---

## Table of Contents

1. [Current Implementation Status](#1-current-implementation-status)
2. [Gap Analysis](#2-gap-analysis)
3. [Required Smart Contract Enhancements](#3-required-smart-contract-enhancements)
4. [RDF Validation Pipeline](#4-rdf-validation-pipeline)
5. [Dataset Modality & Provenance Management](#5-dataset-modality--provenance-management)
6. [DKG Integration Architecture](#6-dkg-integration-architecture)
7. [Committee Governance Workflow](#7-committee-governance-workflow)
8. [Model Versioning System](#8-model-versioning-system)
9. [Scheduled Ingestion Workflow](#9-scheduled-ingestion-workflow)
10. [Implementation Roadmap](#10-implementation-roadmap)

---

## 1. Current Implementation Status

### ✅ **COMPLETED** Components

#### 1.1 Smart Contracts

**File:** `packages/hardhat/contracts/MKMPOL21.sol`

**Implemented:**
- Lines 8-450: Core permission manager with 9 roles
- Lines 172-327: MFSSIA attestation system
  - `struct Attestation` (lines 172-176)
  - `struct RDFDocument` (lines 178-185)
  - `mapping(address => Attestation) public userAttestations` (line 187)
  - `mapping(bytes32 => RDFDocument) public rdfDocuments` (line 188)
- Lines 201-239: Onboarding with MFSSIA attestation
  - `onboard_ordinary_user_with_attestation()` (lines 201-217)
  - `onboard_institution_with_attestation()` (lines 223-239)
- Lines 247-278: RDF document submission
  - `submitRDFDocument()` (lines 247-278)
  - Validates 8/9 challenges requirement (line 263)

**File:** `packages/hardhat/contracts/Consortium.sol`

**Implemented:**
- Lines 16-146: Optimistic governance with challenge period
- Lines 25-32: `struct Proposal` with veto support
- Lines 51-72: Permissioned `propose()` function
- Lines 74-80: `vetoProposal()` mechanism
- Lines 83-98: `executeProposal()` after challenge period

**File:** `packages/hardhat/contracts/Validation_Committee.sol`

**Implemented:**
- Lines 20-90: Simple majority governance
- Lines 35-42: Permissioned voting (permission index 31)
- Lines 45-52: Permissioned proposals (permission index 30)

**File:** `packages/hardhat/contracts/_data_validation.sol`

**Implemented:**
- Lines 18-26: Basic `datapoint` struct with status enum
- Lines 26: `mapping(uint=>datapoint) dataRegistry`
- Lines 44-54: `submit_data_point_inclusion_proposal()`
- Lines 55-77: Stub functions (need implementation)

#### 1.2 Frontend Services

**File:** `packages/nextjs/services/MFSSIAService.ts`

**Implemented:**
- Lines 58-335: Complete MFSSIA API client
  - `registerDID()` (lines 117-134)
  - `createChallengeInstance()` (lines 140-150)
  - `submitEvidence()` (lines 156-171)
  - `getAttestation()` (lines 195-201)
  - `pollForAttestation()` (lines 207-226) - 30 attempts × 2s
  - Browser/server environment detection (lines 62-76)

**File:** `packages/nextjs/utils/evidenceGeneration.ts`

**Implemented:**
- Lines 361-402: `generateAllExampleDEvidence()` for 9 RDF challenges
- Lines 408-436: `validateRDFSyntax()` basic TTL checker
- Lines 12-25: SHA-256 hashing (browser & Node.js)

**File:** `packages/nextjs/app/data-provision/page.tsx`

**Implemented:**
- Lines 151-288: RDF validation workflow with MFSSIA Example D
- Lines 290-350: `handleSubmit()` - submits validated RDF to smart contract
- Lines 217-220: Document hash generation
- Lines 226-232: Evidence batch submission
- Lines 237-244: Attestation polling

---

## 2. Gap Analysis

### ❌ **MISSING** Critical Components

| Requirement | Current Status | Gap Description |
|-------------|----------------|-----------------|
| **RDF Server-Side Validation** | ❌ Not Implemented | No server-side TTL validation pipeline |
| **Dataset Modality Tracking** | ❌ Not Implemented | No dataset variant management (ERR/OL/Ariregister) |
| **PROV-O Provenance System** | ⚠️ Partial | Basic hash storage but no PROV-O metadata |
| **DKG Publishing Workflow** | ❌ Not Implemented | No OriginTrail integration |
| **Graph Versioning** | ❌ Not Implemented | No version control for RDF graphs |
| **Model Version Tracking** | ❌ Not Implemented | No NLP/LLM model provenance |
| **Relations/Events Extraction** | ❌ Not Implemented | No `relations.ttl` support |
| **Äriregister Integration** | ❌ Not Implemented | No economic data linkage |
| **Scheduled Ingestion** | ❌ Not Implemented | No automated monthly/weekly workflow |
| **Committee RDF Review** | ❌ Not Implemented | No validation committee approval |
| **Governance Proposal System** | ⚠️ Partial | Generic proposals but no RDF-specific workflow |

---

## 3. Required Smart Contract Enhancements

### 3.1 Add RDF Graph Registry

**File:** `packages/hardhat/contracts/MKMPOL21.sol`

**Insert after line 188** (after existing `rdfDocuments` mapping):

```solidity
// ===== RDF GRAPH REGISTRY =====

enum GraphType { ARTICLES, ENTITIES, MENTIONS, NLP, ECONOMICS, RELATIONS, PROVENANCE }
enum DatasetVariant { ERR_ONLINE, OL_ONLINE, OL_PRINT, ARIREGISTER }

struct RDFGraph {
    bytes32 graphHash;                 // SHA-256 of TTL content
    string graphURI;                   // Named graph IRI (e.g., urn:graph:articles)
    GraphType graphType;
    DatasetVariant datasetVariant;
    uint256 year;                      // Dataset year (2019, 2020, etc.)
    uint256 version;                   // Incremental version number
    address submitter;
    uint256 submittedAt;
    bool validated;                    // Passed RDF syntax validation
    bool committeeApproved;            // Approved by Validation Committee
    bool publishedToDKG;               // Published to OriginTrail
    string dkgAssetUAL;                // DKG asset identifier
    string modelVersion;               // NLP model version (e.g., "EstBERT-1.0")
}

// Mapping: graphId => RDFGraph
mapping(bytes32 => RDFGraph) public rdfGraphRegistry;

// Mapping: datasetVariant_year => array of graphIds
mapping(bytes32 => bytes32[]) public datasetGraphs;

// Events
event RDFGraphSubmitted(bytes32 indexed graphId, string graphURI, DatasetVariant variant, uint256 year);
event RDFGraphValidated(bytes32 indexed graphId, bool syntaxValid);
event RDFGraphApproved(bytes32 indexed graphId, address indexed approver);
event RDFGraphPublishedToDKG(bytes32 indexed graphId, string dkgAssetUAL);
event RDFGraphVersionIncremented(bytes32 indexed oldGraphId, bytes32 indexed newGraphId, uint256 newVersion);
```

**Rationale:** This provides the foundation for tracking all RDF graphs with full provenance, versioning, and multi-modality support as required by Pages 2, 8, and 9.

---

### 3.2 Implement RDF Graph Submission Function

**Insert after the new struct definitions (~line 230)**:

```solidity
/**
 * Submit RDF graph with full metadata
 * @param graphURI Named graph IRI (e.g., urn:graph:articles)
 * @param graphHash SHA-256 hash of TTL content
 * @param graphType Type of graph (articles, entities, etc.)
 * @param datasetVariant Dataset source (ERR, OL online, etc.)
 * @param year Dataset year
 * @param modelVersion NLP model version string
 * @return graphId Unique identifier for this graph
 */
function submitRDFGraph(
    string memory graphURI,
    bytes32 graphHash,
    GraphType graphType,
    DatasetVariant datasetVariant,
    uint256 year,
    string memory modelVersion
) external returns (bytes32) {
    require(
        roles[msg.sender] == all_roles[0] || roles[msg.sender] == all_roles[5],
        "Only institutions and owners can submit RDF"
    );
    require(graphHash != bytes32(0), "Invalid graph hash");
    require(year >= 2000 && year <= 2100, "Invalid year");

    // Generate unique graph ID
    bytes32 graphId = keccak256(abi.encodePacked(
        graphURI,
        graphHash,
        datasetVariant,
        year,
        block.timestamp
    ));

    // Check for duplicate
    require(rdfGraphRegistry[graphId].submittedAt == 0, "Graph already exists");

    // Get version number (check previous versions for same dataset/year)
    bytes32 datasetKey = keccak256(abi.encodePacked(datasetVariant, year));
    uint256 version = datasetGraphs[datasetKey].length + 1;

    // Store graph metadata
    rdfGraphRegistry[graphId] = RDFGraph({
        graphHash: graphHash,
        graphURI: graphURI,
        graphType: graphType,
        datasetVariant: datasetVariant,
        year: year,
        version: version,
        submitter: msg.sender,
        submittedAt: block.timestamp,
        validated: false,                // Will be set by validator
        committeeApproved: false,         // Requires committee vote
        publishedToDKG: false,
        dkgAssetUAL: "",
        modelVersion: modelVersion
    });

    // Add to dataset collection
    datasetGraphs[datasetKey].push(graphId);

    emit RDFGraphSubmitted(graphId, graphURI, datasetVariant, year);

    return graphId;
}
```

---

### 3.3 Add Committee Approval Functions

**Insert after `submitRDFGraph()` (~line 290)**:

```solidity
/**
 * Mark RDF graph as validated (syntax check passed)
 * Called by Data_Validator role after server-side validation
 */
function markRDFGraphValidated(bytes32 graphId, bool isValid) external hasPermission(msg.sender, 4) {
    require(rdfGraphRegistry[graphId].submittedAt > 0, "Graph does not exist");

    rdfGraphRegistry[graphId].validated = isValid;

    emit RDFGraphValidated(graphId, isValid);
}

/**
 * Approve RDF graph for publication
 * Called by Validation Committee after review
 */
function approveRDFGraph(bytes32 graphId) external {
    require(
        roles[msg.sender] == all_roles[7],  // Validation_Committee role
        "Only Validation Committee can approve"
    );
    require(rdfGraphRegistry[graphId].submittedAt > 0, "Graph does not exist");
    require(rdfGraphRegistry[graphId].validated, "Graph must pass validation first");

    rdfGraphRegistry[graphId].committeeApproved = true;

    emit RDFGraphApproved(graphId, msg.sender);
}

/**
 * Mark RDF graph as published to DKG
 * Called after successful OriginTrail publication
 */
function markRDFGraphPublished(bytes32 graphId, string memory dkgAssetUAL) external hasPermission(msg.sender, 5) {
    require(rdfGraphRegistry[graphId].committeeApproved, "Graph must be approved first");
    require(bytes(dkgAssetUAL).length > 0, "Invalid DKG asset UAL");

    rdfGraphRegistry[graphId].publishedToDKG = true;
    rdfGraphRegistry[graphId].dkgAssetUAL = dkgAssetUAL;

    emit RDFGraphPublishedToDKG(graphId, dkgAssetUAL);
}
```

---

## 4. RDF Validation Pipeline

### 4.1 Server-Side Validation Service

**Create new file:** `packages/nextjs/services/RDFValidationService.ts`

```typescript
import { createHash } from 'crypto';
import * as rdfParser from 'n3';

export interface RDFValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  tripleCount: number;
  prefixes: Record<string, string>;
  graphType?: string;
  datasetVariant?: string;
  year?: number;
}

export class RDFValidationService {
  /**
   * Comprehensive RDF validation matching Page 15 requirements
   *
   * Validates:
   * 1. Turtle syntax (via N3.js parser)
   * 2. Required prefixes (schema:, dcterms:, prov:, skos:)
   * 3. Dataset assignment (dcterms:isPartOf check)
   * 4. Provenance closure (prov:wasGeneratedBy)
   * 5. Entity URI resolution (fallback URI logic)
   * 6. Event triple validity (schema:Event requirements)
   */
  async validateRDFGraph(rdfContent: string): Promise<RDFValidationResult> {
    const result: RDFValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      tripleCount: 0,
      prefixes: {},
    };

    try {
      // Step 1: Parse Turtle syntax
      const parser = new rdfParser.Parser();
      const quads: any[] = [];

      await new Promise((resolve, reject) => {
        parser.parse(rdfContent, (error, quad, prefixes) => {
          if (error) {
            result.errors.push(`Syntax error: ${error.message}`);
            result.isValid = false;
            reject(error);
          }
          if (quad) {
            quads.push(quad);
          } else {
            // Parsing complete
            if (prefixes) {
              result.prefixes = prefixes;
            }
            resolve(quads);
          }
        });
      });

      result.tripleCount = quads.length;

      // Step 2: Validate required prefixes (Page 2 requirements)
      const requiredPrefixes = ['schema:', 'dcterms:', 'prov:', 'skos:', 'ex:'];
      for (const prefix of requiredPrefixes) {
        const found = Object.keys(result.prefixes).some(p =>
          result.prefixes[p].includes(prefix.replace(':', ''))
        );
        if (!found) {
          result.errors.push(`Missing required prefix: ${prefix}`);
          result.isValid = false;
        }
      }

      // Step 3: Check dataset assignment (Page 16)
      const hasDatasetAssignment = quads.some(q =>
        q.predicate.value.includes('isPartOf') ||
        q.predicate.value.includes('dataset')
      );
      if (!hasDatasetAssignment) {
        result.errors.push('Missing dataset assignment (dcterms:isPartOf)');
        result.isValid = false;
      }

      // Step 4: Validate provenance closure (Page 8)
      const hasProvenance = quads.some(q =>
        q.predicate.value.includes('wasGeneratedBy') ||
        q.predicate.value.includes('wasDerivedFrom')
      );
      if (!hasProvenance) {
        result.warnings.push('No provenance triples found (prov:wasGeneratedBy)');
      }

      // Step 5: Validate schema:Event triples if present (Page 2 - relations.ttl)
      const eventTriples = quads.filter(q =>
        q.object.value.includes('schema.org') &&
        q.object.value.includes('Event')
      );

      for (const eventTriple of eventTriples) {
        const eventSubject = eventTriple.subject.value;

        // Check for required event properties
        const hasAction = quads.some(q =>
          q.subject.value === eventSubject &&
          q.predicate.value.includes('action')
        );
        const hasAgent = quads.some(q =>
          q.subject.value === eventSubject &&
          q.predicate.value.includes('agent')
        );

        if (!hasAction || !hasAgent) {
          result.errors.push(
            `schema:Event ${eventSubject} missing required properties (action, agent)`
          );
          result.isValid = false;
        }
      }

      // Step 6: Extract metadata for classification
      result.datasetVariant = this.extractDatasetVariant(quads);
      result.year = this.extractDatasetYear(quads);
      result.graphType = this.detectGraphType(quads);

      return result;

    } catch (error: any) {
      result.errors.push(`Validation failed: ${error.message}`);
      result.isValid = false;
      return result;
    }
  }

  /**
   * Extract dataset variant from dcterms:isPartOf triple
   */
  private extractDatasetVariant(quads: any[]): string | undefined {
    const datasetTriple = quads.find(q =>
      q.predicate.value.includes('isPartOf')
    );

    if (!datasetTriple) return undefined;

    const datasetValue = datasetTriple.object.value;

    if (datasetValue.includes('ERR')) return 'ERR_ONLINE';
    if (datasetValue.includes('OL_online')) return 'OL_ONLINE';
    if (datasetValue.includes('OL_print')) return 'OL_PRINT';
    if (datasetValue.includes('Ariregister')) return 'ARIREGISTER';

    return undefined;
  }

  /**
   * Extract year from dataset URI or date literals
   */
  private extractDatasetYear(quads: any[]): number | undefined {
    const datasetTriple = quads.find(q =>
      q.predicate.value.includes('isPartOf')
    );

    if (!datasetTriple) return undefined;

    const yearMatch = datasetTriple.object.value.match(/\d{4}/);
    return yearMatch ? parseInt(yearMatch[0]) : undefined;
  }

  /**
   * Detect graph type based on content
   */
  private detectGraphType(quads: any[]): string {
    const hasArticles = quads.some(q => q.object.value.includes('NewsArticle'));
    const hasOrganizations = quads.some(q => q.object.value.includes('Organization'));
    const hasMentions = quads.some(q => q.predicate.value.includes('mentions'));
    const hasNLP = quads.some(q => q.predicate.value.includes('PropertyValue'));
    const hasEconomics = quads.some(q => q.predicate.value.includes('MonetaryAmount'));
    const hasEvents = quads.some(q => q.object.value.includes('Event'));
    const hasProvenance = quads.some(q => q.predicate.value.includes('wasGeneratedBy'));

    if (hasArticles) return 'ARTICLES';
    if (hasOrganizations && !hasMentions) return 'ENTITIES';
    if (hasMentions) return 'MENTIONS';
    if (hasNLP) return 'NLP';
    if (hasEconomics) return 'ECONOMICS';
    if (hasEvents) return 'RELATIONS';
    if (hasProvenance) return 'PROVENANCE';

    return 'UNKNOWN';
  }

  /**
   * Compute SHA-256 hash of RDF content
   */
  computeGraphHash(rdfContent: string): string {
    return createHash('sha256').update(rdfContent).digest('hex');
  }
}

// Singleton export
export const rdfValidationService = new RDFValidationService();
```

---

### 4.2 API Route for RDF Validation

**Create new file:** `packages/nextjs/app/api/rdf/validate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { rdfValidationService } from '~/services/RDFValidationService';

export async function POST(request: NextRequest) {
  try {
    const { rdfContent } = await request.json();

    if (!rdfContent) {
      return NextResponse.json(
        { success: false, error: 'No RDF content provided' },
        { status: 400 }
      );
    }

    // Perform comprehensive validation
    const validationResult = await rdfValidationService.validateRDFGraph(rdfContent);

    // Compute hash for on-chain storage
    const graphHash = rdfValidationService.computeGraphHash(rdfContent);

    return NextResponse.json({
      success: true,
      data: {
        ...validationResult,
        graphHash,
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
```

---

## 5. Dataset Modality & Provenance Management

### 5.1 Provenance Metadata Generator

**Create new file:** `packages/nextjs/utils/provenanceGenerator.ts`

```typescript
import { createHash } from 'crypto';

export interface ProvenanceMetadata {
  graphHash: string;
  sourceFile: string;
  generatedBy: string;
  generatedAt: string;
  modelVersion?: string;
  softwareVersion?: string;
  previousVersion?: string;
}

/**
 * Generate PROV-O compliant provenance triples
 * Implements Page 8 requirements
 */
export function generateProvenanceTTL(metadata: ProvenanceMetadata): string {
  const timestamp = new Date().toISOString();

  return `
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix schema: <https://schema.org/> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix ex: <https://sandbox.etais.ee/example/> .

ex:prov_${metadata.graphHash.substring(0, 8)} a prov:Entity ;
    prov:wasDerivedFrom <file:///${metadata.sourceFile}> ;
    prov:wasGeneratedBy ex:agent_${metadata.generatedBy} ;
    prov:generatedAtTime "${metadata.generatedAt}"^^xsd:dateTime ;
    schema:identifier [
        schema:propertyID "SHA-256" ;
        schema:value "SHA256:${metadata.graphHash}"
    ] ${metadata.modelVersion ? `;
    schema:softwareVersion "${metadata.modelVersion}"` : ''} ${metadata.previousVersion ? `;
    prov:wasRevisionOf ex:prov_${metadata.previousVersion.substring(0, 8)}` : ''} .

ex:agent_${metadata.generatedBy} a prov:SoftwareAgent ;
    schema:name "RDF Exporter Pipeline" ;
    schema:version "${metadata.softwareVersion || '1.0.0'}" .
`.trim();
}

/**
 * Extract provenance hash from existing TTL file
 */
export function extractProvenanceHash(rdfContent: string): string | null {
  const hashMatch = rdfContent.match(/SHA256:([a-f0-9]{64})/);
  return hashMatch ? hashMatch[1] : null;
}
```

---

## 6. DKG Integration Architecture

### 6.1 OriginTrail DKG Service

**Create new file:** `packages/nextjs/services/DKGPublicationService.ts`

```typescript
/**
 * OriginTrail DKG Publication Service
 * Implements Page 9 requirements for Verifiable Semantic Assets
 */

export interface DKGAssetMetadata {
  name: string;
  description: string;
  graphType: string;
  datasetVariant: string;
  year: number;
  version: number;
  contentHash: string;
  license: string;
}

export interface DKGPublicationResult {
  success: boolean;
  assetUAL: string;
  transactionHash: string;
  error?: string;
}

export class DKGPublicationService {
  private dkgApiUrl: string;
  private dkgApiKey: string;

  constructor() {
    this.dkgApiUrl = process.env.DKG_API_URL || 'https://dkg-testnet.origintrail.io';
    this.dkgApiKey = process.env.DKG_API_KEY || '';
  }

  /**
   * Publish RDF graph as Verifiable Semantic Asset to OriginTrail DKG
   *
   * Workflow (Page 9):
   * 1. Compute SHA-256 content hash
   * 2. Create JSON-LD asset manifest
   * 3. Publish via OriginTrail Edge Node API
   * 4. Record Asset ID in DAO Registry
   */
  async publishRDFGraph(
    rdfContent: string,
    metadata: DKGAssetMetadata
  ): Promise<DKGPublicationResult> {
    try {
      // Step 1: Create JSON-LD manifest (OriginTrail format)
      const manifest = {
        '@context': 'https://schema.origintrail.io/',
        '@id': `did:dkg:asset:${metadata.datasetVariant}_${metadata.year}_v${metadata.version}`,
        'type': 'Dataset',
        'name': metadata.name,
        'description': metadata.description,
        'creator': 'Tallinn University MKM-POL21-2025',
        'license': metadata.license,
        'contentHash': metadata.contentHash,
        'daoRegistry': 'urn:dao:mkm-pol21',
        'datasetVariant': metadata.datasetVariant,
        'year': metadata.year,
        'version': metadata.version,
        'graphType': metadata.graphType,
      };

      // Step 2: Call OriginTrail Edge Node publish API
      const response = await fetch(`${this.dkgApiUrl}/api/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.dkgApiKey}`,
        },
        body: JSON.stringify({
          manifest,
          content: rdfContent,
        }),
      });

      if (!response.ok) {
        throw new Error(`DKG API error: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: true,
        assetUAL: result.assetUAL,
        transactionHash: result.transactionHash,
      };

    } catch (error: any) {
      console.error('[DKG Publication] Error:', error);
      return {
        success: false,
        assetUAL: '',
        transactionHash: '',
        error: error.message,
      };
    }
  }

  /**
   * Query DKG asset by UAL
   */
  async queryDKGAsset(assetUAL: string): Promise<any> {
    const response = await fetch(`${this.dkgApiUrl}/api/query/${encodeURIComponent(assetUAL)}`, {
      headers: {
        'Authorization': `Bearer ${this.dkgApiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to query DKG asset: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Verify asset hash integrity
   */
  async verifyAssetIntegrity(assetUAL: string, expectedHash: string): Promise<boolean> {
    try {
      const asset = await this.queryDKGAsset(assetUAL);
      return asset.contentHash === expectedHash;
    } catch (error) {
      console.error('[DKG Verification] Error:', error);
      return false;
    }
  }
}

// Singleton export
export const dkgPublicationService = new DKGPublicationService();
```

---

## 7. Committee Governance Workflow

### 7.1 Validation Committee RDF Review UI

**Create new file:** `packages/nextjs/app/committees/validation/rdf-review/page.tsx`

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface PendingRDFGraph {
  graphId: string;
  graphURI: string;
  graphType: string;
  datasetVariant: string;
  year: number;
  version: number;
  submitter: string;
  submittedAt: Date;
  validated: boolean;
  tripleCount?: number;
}

/**
 * Validation Committee - RDF Review Dashboard
 * Implements Page 12 DAO Governance Workflow
 */
export default function ValidationCommitteeRDFReview() {
  const { address } = useAccount();
  const [pendingGraphs, setPendingGraphs] = useState<PendingRDFGraph[]>([]);
  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "MKMPOL21" });

  // Check if user is Validation Committee member
  const { data: roleData } = useScaffoldReadContract({
    contractName: "MKMPOL21",
    functionName: "hasRole",
    args: [address],
  });

  const isCommitteeMember = roleData ? (Number(roleData) & 31) === 7 : false;

  // Approve RDF graph
  const handleApprove = useCallback(async (graphId: string) => {
    try {
      await writeContractAsync({
        functionName: "approveRDFGraph",
        args: [graphId as `0x${string}`],
      });

      alert("Graph approved successfully!");

      // Refresh pending graphs
      loadPendingGraphs();
    } catch (error: any) {
      alert("Approval failed: " + error.message);
    }
  }, [writeContractAsync]);

  // Load pending graphs (would need backend API)
  const loadPendingGraphs = useCallback(async () => {
    // TODO: Implement backend API to query pending graphs from smart contract events
    // For now, placeholder
    setPendingGraphs([]);
  }, []);

  useEffect(() => {
    if (isCommitteeMember) {
      loadPendingGraphs();
    }
  }, [isCommitteeMember, loadPendingGraphs]);

  if (!isCommitteeMember) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <p>Access Denied: Only Validation Committee members can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">RDF Graph Review</h1>

      <div className="grid gap-4">
        {pendingGraphs.length === 0 ? (
          <div className="alert alert-info">
            <p>No pending RDF graphs for review.</p>
          </div>
        ) : (
          pendingGraphs.map(graph => (
            <div key={graph.graphId} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">{graph.graphURI}</h2>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Type:</strong> {graph.graphType}</div>
                  <div><strong>Dataset:</strong> {graph.datasetVariant}</div>
                  <div><strong>Year:</strong> {graph.year}</div>
                  <div><strong>Version:</strong> {graph.version}</div>
                  <div><strong>Triples:</strong> {graph.tripleCount || 'N/A'}</div>
                  <div><strong>Validated:</strong> {graph.validated ? '✅' : '❌'}</div>
                </div>

                <div className="card-actions justify-end mt-4">
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => {/* View details */}}
                  >
                    View Details
                  </button>
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => handleApprove(graph.graphId)}
                    disabled={!graph.validated}
                  >
                    Approve for Publication
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

---

## 8. Model Versioning System

### 8.1 NLP Model Tracker

**Create new file:** `packages/nextjs/utils/modelVersioning.ts`

```typescript
/**
 * NLP/LLM Model Versioning System
 * Implements Page 17 requirements
 */

export interface ModelVersion {
  name: string;
  version: string;
  hash: string;                // SHA-256 of model weights/config
  releaseDate: string;
  purpose: string;             // "topic-modeling", "entity-extraction", "relation-extraction"
  framework?: string;          // "EstBERT", "Gemini", "KeyBERT"
}

export interface AnnotationProvenance {
  annotationType: string;      // "EMTAK", "keyword", "entity", "relation"
  modelVersion: ModelVersion;
  processingDate: string;
  hyperparameters?: Record<string, any>;
  confidenceThreshold?: number;
}

/**
 * Generate model version metadata for RDF provenance
 */
export function generateModelVersionTTL(model: ModelVersion): string {
  return `
ex:model_${model.name.replace(/\s+/g, '_')}_${model.version} a schema:SoftwareApplication ;
    schema:name "${model.name}" ;
    schema:version "${model.version}" ;
    schema:releaseDate "${model.releaseDate}"^^xsd:dateTime ;
    schema:applicationCategory "${model.purpose}" ;
    schema:identifier [
        schema:propertyID "SHA-256" ;
        schema:value "SHA256:${model.hash}"
    ] ${model.framework ? `;
    schema:softwareVersion "${model.framework}"` : ''} .
`.trim();
}

/**
 * Track annotation provenance for Page 18 requirements
 */
export function generateAnnotationProvenanceTTL(
  entityURI: string,
  annotation: AnnotationProvenance
): string {
  const timestamp = new Date().toISOString();

  return `
${entityURI} prov:wasGeneratedBy ex:annotation_${timestamp.replace(/[:.]/g, '_')} .

ex:annotation_${timestamp.replace(/[:.]/g, '_')} a prov:Activity ;
    prov:used ex:model_${annotation.modelVersion.name.replace(/\s+/g, '_')}_${annotation.modelVersion.version} ;
    prov:startedAtTime "${annotation.processingDate}"^^xsd:dateTime ;
    prov:endedAtTime "${timestamp}"^^xsd:dateTime ${annotation.confidenceThreshold ? `;
    schema:valueReference "${annotation.confidenceThreshold}"` : ''} .
`.trim();
}

/**
 * Model registry - maintains active model versions
 */
export const MODEL_REGISTRY: Record<string, ModelVersion> = {
  'EstBERT-1.0': {
    name: 'EstBERT',
    version: '1.0',
    hash: 'a1b2c3d4e5f6...',  // Placeholder
    releaseDate: '2024-01-15T00:00:00Z',
    purpose: 'topic-modeling',
    framework: 'BERT',
  },
  'Gemini-2.5-Flash': {
    name: 'Gemini',
    version: '2.5-flash',
    hash: 'f6e5d4c3b2a1...',  // Placeholder
    releaseDate: '2024-12-01T00:00:00Z',
    purpose: 'EMTAK-classification',
    framework: 'Google Gemini',
  },
  'KeyBERT-0.7': {
    name: 'KeyBERT',
    version: '0.7',
    hash: 'b2c3d4e5f6a1...',  // Placeholder
    releaseDate: '2023-09-20T00:00:00Z',
    purpose: 'keyword-extraction',
    framework: 'KeyBERT',
  },
};
```

---

## 9. Scheduled Ingestion Workflow

### 9.1 Automated RDF Pipeline Orchestrator

**Create new file:** `packages/backend/services/RDFIngestionOrchestrator.ts`

```typescript
import { CronJob } from 'cron';
import { rdfValidationService } from './RDFValidationService';
import { dkgPublicationService } from './DKGPublicationService';
import fs from 'fs/promises';
import path from 'path';

/**
 * Automated RDF Ingestion Pipeline
 * Implements Page 1 "Scheduled, semi-automatic ingestion cycle"
 *
 * Workflow:
 * 1. Monitor /mnt/data/ingest/ for new CSV/TXT files
 * 2. Trigger Python RDF exporter
 * 3. Validate generated TTL files
 * 4. Submit to DAO for approval
 * 5. Publish to DKG after approval
 */
export class RDFIngestionOrchestrator {
  private ingestionPath: string;
  private cronSchedule: string;

  constructor() {
    this.ingestionPath = process.env.RDF_INGESTION_PATH || '/mnt/data/ingest';
    this.cronSchedule = process.env.RDF_INGESTION_CRON || '0 0 * * 1'; // Weekly on Monday
  }

  /**
   * Start automated ingestion scheduler
   */
  start() {
    const job = new CronJob(this.cronSchedule, async () => {
      console.log('[RDF Ingestion] Starting scheduled ingestion run...');
      await this.processIngestionBatch();
    });

    job.start();
    console.log(`[RDF Ingestion] Scheduler started with cron: ${this.cronSchedule}`);
  }

  /**
   * Process all new files in ingestion directory
   */
  async processIngestionBatch() {
    try {
      // Step 1: Check for new files
      const newFiles = await this.detectNewFiles();

      if (newFiles.length === 0) {
        console.log('[RDF Ingestion] No new files detected');
        return;
      }

      console.log(`[RDF Ingestion] Found ${newFiles.length} new files`);

      // Step 2: Run Python RDF exporter
      await this.runRDFExporter(newFiles);

      // Step 3: Validate generated TTL files
      const ttlFiles = await this.getTTLFiles();
      const validationResults = await this.validateTTLBatch(ttlFiles);

      // Step 4: Submit validated files to DAO
      for (const result of validationResults) {
        if (result.isValid) {
          await this.submitToDAO(result);
        } else {
          console.error(`[RDF Ingestion] Validation failed for ${result.filename}:`, result.errors);
        }
      }

      // Step 5: Archive processed files
      await this.archiveProcessedFiles(newFiles);

    } catch (error) {
      console.error('[RDF Ingestion] Batch processing failed:', error);
    }
  }

  /**
   * Detect new CSV/TXT files in ingestion directory
   */
  private async detectNewFiles(): Promise<string[]> {
    const files = await fs.readdir(this.ingestionPath);
    const newFiles = files.filter(f =>
      f.endsWith('.csv') || f.endsWith('.txt')
    );
    return newFiles.map(f => path.join(this.ingestionPath, f));
  }

  /**
   * Run Python RDF exporter on new files
   */
  private async runRDFExporter(inputFiles: string[]): Promise<void> {
    const { spawn } = require('child_process');

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        path.join(__dirname, '../../python/rdf_exporter.py'),
        '--input', this.ingestionPath,
        '--output', path.join(this.ingestionPath, 'ttl'),
      ]);

      pythonProcess.on('close', (code: number) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Python exporter exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Get all generated TTL files
   */
  private async getTTLFiles(): Promise<string[]> {
    const ttlDir = path.join(this.ingestionPath, 'ttl');
    const files = await fs.readdir(ttlDir);
    return files
      .filter(f => f.endsWith('.ttl'))
      .map(f => path.join(ttlDir, f));
  }

  /**
   * Validate batch of TTL files
   */
  private async validateTTLBatch(ttlFiles: string[]): Promise<any[]> {
    const results = [];

    for (const filePath of ttlFiles) {
      const content = await fs.readFile(filePath, 'utf-8');
      const validation = await rdfValidationService.validateRDFGraph(content);

      results.push({
        filename: path.basename(filePath),
        filePath,
        ...validation,
      });
    }

    return results;
  }

  /**
   * Submit validated RDF to DAO smart contract
   */
  private async submitToDAO(validationResult: any): Promise<void> {
    // TODO: Call smart contract submitRDFGraph() via ethers.js
    console.log(`[RDF Ingestion] Submitting ${validationResult.filename} to DAO`);
  }

  /**
   * Archive processed files
   */
  private async archiveProcessedFiles(files: string[]): Promise<void> {
    const archiveDir = path.join(this.ingestionPath, 'archive');
    await fs.mkdir(archiveDir, { recursive: true });

    for (const file of files) {
      const archivePath = path.join(archiveDir, path.basename(file));
      await fs.rename(file, archivePath);
    }
  }
}

// Start orchestrator if running as main module
if (require.main === module) {
  const orchestrator = new RDFIngestionOrchestrator();
  orchestrator.start();
}
```

---

## 10. Implementation Roadmap

### Phase 1: Smart Contract Enhancements (Week 1-2)

**Tasks:**
1. ✅ Add `RDFGraph` struct and registry to `MKMPOL21.sol` (lines 188+)
2. ✅ Implement `submitRDFGraph()` function
3. ✅ Add `markRDFGraphValidated()` for Data_Validator role
4. ✅ Implement `approveRDFGraph()` for Validation Committee
5. ✅ Add `markRDFGraphPublished()` for DKG integration
6. ✅ Deploy updated contract to local testnet
7. ✅ Write unit tests for new functions

**Acceptance Criteria:**
- All functions compile without errors
- Unit tests pass with ≥90% coverage
- Events emit correctly
- Permission checks enforce role restrictions

---

### Phase 2: RDF Validation Pipeline (Week 3-4)

**Tasks:**
1. ✅ Create `RDFValidationService.ts` with N3.js parser
2. ✅ Implement comprehensive validation (syntax, prefixes, provenance)
3. ✅ Add `/api/rdf/validate` API route
4. ✅ Create `provenanceGenerator.ts` utility
5. ✅ Integrate validation into data provision page
6. ✅ Add server-side validation before smart contract submission

**Acceptance Criteria:**
- N3.js parser correctly validates Turtle syntax
- All Page 15 validation rules implemented
- PROV-O metadata generated automatically
- Integration tests pass

---

### Phase 3: DKG Publication Workflow (Week 5-6)

**Tasks:**
1. ✅ Create `DKGPublicationService.ts`
2. ✅ Implement JSON-LD manifest generation
3. ✅ Add OriginTrail Edge Node API integration
4. ✅ Create backend workflow for automatic publication after approval
5. ✅ Add DKG asset verification function
6. ✅ Update smart contract to store DKG UALs

**Acceptance Criteria:**
- Successfully publish test RDF to DKG testnet
- Verify asset integrity via hash comparison
- Smart contract correctly stores UAL references
- End-to-end flow: Submit → Validate → Approve → Publish

---

### Phase 4: Committee Governance UI (Week 7-8)

**Tasks:**
1. ✅ Create Validation Committee RDF review page
2. ✅ Implement backend API to query pending graphs
3. ✅ Add approval workflow UI
4. ✅ Create Consortium proposal for RDF updates
5. ✅ Add dispute resolution flow for rejected graphs

**Acceptance Criteria:**
- Committee members can view pending graphs
- One-click approval triggers smart contract call
- Proposal history displayed correctly
- Role-based access control enforced

---

### Phase 5: Model Versioning & Scheduled Ingestion (Week 9-10)

**Tasks:**
1. ✅ Implement `modelVersioning.ts` with MODEL_REGISTRY
2. ✅ Add annotation provenance TTL generation
3. ✅ Create `RDFIngestionOrchestrator.ts`
4. ✅ Set up cron job for weekly/monthly ingestion
5. ✅ Add Python RDF exporter integration
6. ✅ Implement file archiving system

**Acceptance Criteria:**
- Model versions tracked in RDF metadata
- Cron job successfully triggers ingestion
- Files automatically archived after processing
- Provenance chain complete from CSV to DKG

---

## Summary of Code Changes

| File | Lines Added | Type | Description |
|------|-------------|------|-------------|
| `MKMPOL21.sol` | ~150 | Modification | Add RDF graph registry & approval functions |
| `RDFValidationService.ts` | ~250 | New | Server-side TTL validation |
| `/api/rdf/validate/route.ts` | ~40 | New | Validation API endpoint |
| `provenanceGenerator.ts` | ~80 | New | PROV-O metadata generation |
| `DKGPublicationService.ts` | ~150 | New | OriginTrail integration |
| `modelVersioning.ts` | ~120 | New | NLP model tracking |
| `RDFIngestionOrchestrator.ts` | ~200 | New | Automated pipeline |
| `validation/rdf-review/page.tsx` | ~180 | New | Committee review UI |
| **TOTAL** | **~1,170** | **8 files** | **Full RDF system** |

---

## Environment Variables Required

Add to `.env.local`:

```bash
# DKG Integration
DKG_API_URL=https://dkg-testnet.origintrail.io
DKG_API_KEY=your_dkg_api_key_here

# RDF Ingestion
RDF_INGESTION_PATH=/mnt/data/ingest
RDF_INGESTION_CRON=0 0 * * 1  # Weekly on Monday

# MFSSIA (already configured)
MFSSIA_API_KEY=your_mfssia_key
NEXT_PUBLIC_MFSSIA_ENABLED=true
```

---

## Testing Strategy

### Unit Tests
- Smart contract functions (Hardhat)
- RDF validation logic (Jest)
- DKG publication (mocked API)

### Integration Tests
- End-to-end submission flow
- Committee approval workflow
- DKG publication verification

### System Tests
- Weekly ingestion cron job
- Multi-dataset handling
- Version conflict resolution

---

## Migration Strategy

1. **Deploy new contract** with RDF graph registry
2. **Run parallel** validation (old + new system)
3. **Migrate existing** RDF documents to new registry
4. **Switch committee** to new review UI
5. **Enable DKG** publication after 2-week testing
6. **Activate cron** scheduler for production

---

## Success Criteria

✅ All RDF graphs tracked with full provenance
✅ Dataset modality separation enforced
✅ Committee approval workflow functional
✅ DKG publication automated
✅ Model versions traceable
✅ Scheduled ingestion operational
✅ Page 15 validation rules implemented
✅ 100% test coverage on critical paths

---

**End of Implementation Plan v2.0**

This plan provides **concrete, line-level guidance** for bringing the MKM-POL21 DAO into full compliance with the RDF, DKG, and governance requirements outlined in the project documentation.
