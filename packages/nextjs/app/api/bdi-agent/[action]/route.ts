/**
 * BDI Agent API Endpoints
 *
 * REST API for external BDI agents (Jadex) to interact with MKMPOL21 DAO contracts.
 *
 * Endpoints:
 *   POST /api/bdi-agent/submit          - Submit RDF graph
 *   POST /api/bdi-agent/validate        - Mark graph as validated (on-chain)
 *   POST /api/bdi-agent/validate-syntax - Real N3.js syntax validation
 *   POST /api/bdi-agent/validate-semantics - SHACL semantic validation
 *   POST /api/bdi-agent/validate-and-record - Combined validation + on-chain recording
 *   POST /api/bdi-agent/fetch-content   - Retrieve TTL content by graphId
 *   POST /api/bdi-agent/approve         - Approve graph (committee)
 *   POST /api/bdi-agent/publish         - Mark graph as published to DKG
 *   POST /api/bdi-agent/status          - Get graph status
 *   POST /api/bdi-agent/check-permission - Check agent permission
 *   POST /api/bdi-agent/get-role        - Get agent role
 *   POST /api/bdi-agent/graph-count     - Get total graph count
 *
 * All endpoints require POST method with JSON body.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  BDIAgentService,
  DatasetVariant,
  GraphType,
  RDFSubmissionParams,
  getBDIAgentService,
} from "~~/services/BDIAgentService";
import { getRDFValidationService } from "~~/services/RDFValidationService";
import { getTTLStorageService } from "~~/services/TTLStorageService";

// Contract addresses - set via environment variables or defaults for localhost
const GA_ADDRESS = process.env.GA_DATA_VALIDATION_ADDRESS || process.env.NEXT_PUBLIC_GA_DATA_VALIDATION_ADDRESS || "";
const MKMPOL21_ADDRESS = process.env.MKMPOL21_ADDRESS || process.env.NEXT_PUBLIC_MKMPOL21_ADDRESS || "";
const RPC_URL = process.env.HARDHAT_RPC_URL || process.env.NEXT_PUBLIC_HARDHAT_RPC_URL || "http://localhost:8545";

/**
 * Get or create BDI Agent Service instance
 */
function getService(): BDIAgentService {
  if (!GA_ADDRESS || !MKMPOL21_ADDRESS) {
    throw new Error(
      "Contract addresses not configured. Set GA_DATA_VALIDATION_ADDRESS and MKMPOL21_ADDRESS environment variables.",
    );
  }
  return getBDIAgentService(RPC_URL, GA_ADDRESS, MKMPOL21_ADDRESS);
}

/**
 * Validate required fields in request body
 */
function validateRequired(body: Record<string, unknown>, fields: string[]): string | null {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

/**
 * Get built-in SHACL shapes by type
 */
function getBuiltInShapes(shapesType: string): string {
  const shapes: Record<string, string> = {
    article: ARTICLE_SHAPES,
    employment: EMPLOYMENT_SHAPES,
    entity: ENTITY_SHAPES,
  };

  const content = shapes[shapesType.toLowerCase()];
  if (!content) {
    throw new Error(`Unknown shapes type: ${shapesType}. Valid types: ${Object.keys(shapes).join(", ")}`);
  }
  return content;
}

// Built-in SHACL shapes for MKM data types
const ARTICLE_SHAPES = `
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix ex: <http://mkm.ee/schema/> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:ArticleShape a sh:NodeShape ;
    sh:targetClass ex:Article ;
    sh:property [
        sh:path dct:title ;
        sh:minCount 1 ;
        sh:datatype xsd:string ;
        sh:message "Article must have at least one title"
    ] ;
    sh:property [
        sh:path dct:created ;
        sh:minCount 1 ;
        sh:or (
            [ sh:datatype xsd:date ]
            [ sh:datatype xsd:dateTime ]
        ) ;
        sh:message "Article must have a creation date (xsd:date or xsd:dateTime)"
    ] ;
    sh:property [
        sh:path ex:source ;
        sh:minCount 1 ;
        sh:message "Article must have a source"
    ] .
`;

const EMPLOYMENT_SHAPES = `
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix cls: <http://mkm.ee/classification/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix ex: <http://mkm.ee/schema/> .

ex:EMTAKShape a sh:NodeShape ;
    sh:targetSubjectsOf cls:hasEMTAKClassification ;
    sh:property [
        sh:path cls:hasEMTAKClassification ;
        sh:pattern "^cls:[0-9]{5}$" ;
        sh:message "EMTAK code must be exactly 5 digits"
    ] .

ex:JobCountShape a sh:NodeShape ;
    sh:targetSubjectsOf ex:employeeCount ;
    sh:property [
        sh:path ex:employeeCount ;
        sh:datatype xsd:integer ;
        sh:minInclusive 0 ;
        sh:message "Employee count must be a non-negative integer"
    ] .
`;

const ENTITY_SHAPES = `
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix ex: <http://mkm.ee/schema/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:NamedEntityShape a sh:NodeShape ;
    sh:targetClass ex:NamedEntity ;
    sh:property [
        sh:path rdfs:label ;
        sh:minCount 1 ;
        sh:datatype xsd:string ;
        sh:message "Named entity must have a label"
    ] ;
    sh:property [
        sh:path ex:entityType ;
        sh:minCount 1 ;
        sh:in (ex:Person ex:Organization ex:Location ex:Event ex:Product) ;
        sh:message "Entity type must be one of: Person, Organization, Location, Event, Product"
    ] .
`;

/**
 * POST handler for all BDI agent actions
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await params;
    const body = await request.json();

    const service = getService();

    switch (action) {
      // =======================================================================
      // Submit RDF Graph
      // =======================================================================
      case "submit": {
        const error = validateRequired(body, [
          "agentPrivateKey",
          "graphURI",
          "graphHash",
          "graphType",
          "datasetVariant",
          "year",
          "modelVersion",
        ]);
        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }

        const params: RDFSubmissionParams = {
          graphURI: body.graphURI as string,
          graphHash: body.graphHash as string,
          graphType: body.graphType as GraphType,
          datasetVariant: body.datasetVariant as DatasetVariant,
          year: body.year as number,
          modelVersion: body.modelVersion as string,
        };

        const result = await service.submitRDFGraph(body.agentPrivateKey as string, params);
        return NextResponse.json({
          success: true,
          ...result,
        });
      }

      // =======================================================================
      // Mark Graph Validated
      // =======================================================================
      case "validate": {
        const error = validateRequired(body, ["agentPrivateKey", "graphId", "isValid"]);
        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }

        const result = await service.markGraphValidated(
          body.agentPrivateKey as string,
          body.graphId as string,
          body.isValid as boolean,
        );
        return NextResponse.json({
          success: true,
          ...result,
        });
      }

      // =======================================================================
      // Approve Graph
      // =======================================================================
      case "approve": {
        const error = validateRequired(body, ["agentPrivateKey", "graphId"]);
        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }

        const result = await service.approveGraph(body.agentPrivateKey as string, body.graphId as string);
        return NextResponse.json({
          success: true,
          ...result,
        });
      }

      // =======================================================================
      // Mark Graph Published to DKG
      // =======================================================================
      case "publish": {
        const error = validateRequired(body, ["agentPrivateKey", "graphId", "dkgAssetUAL"]);
        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }

        const result = await service.markGraphPublished(
          body.agentPrivateKey as string,
          body.graphId as string,
          body.dkgAssetUAL as string,
        );
        return NextResponse.json({
          success: true,
          ...result,
        });
      }

      // =======================================================================
      // Get Graph Status
      // =======================================================================
      case "status": {
        const error = validateRequired(body, ["graphId"]);
        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }

        const status = await service.getGraphStatus(body.graphId as string);
        return NextResponse.json({
          success: true,
          graphId: body.graphId,
          ...status,
        });
      }

      // =======================================================================
      // Check Agent Permission
      // =======================================================================
      case "check-permission": {
        const error = validateRequired(body, ["agentAddress", "permissionIndex"]);
        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }

        const hasPermission = await service.checkPermission(
          body.agentAddress as string,
          body.permissionIndex as number,
        );
        return NextResponse.json({
          success: true,
          agentAddress: body.agentAddress,
          permissionIndex: body.permissionIndex,
          hasPermission,
        });
      }

      // =======================================================================
      // Get Agent Role
      // =======================================================================
      case "get-role": {
        const error = validateRequired(body, ["agentAddress"]);
        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }

        const roleInfo = await service.getAgentRole(body.agentAddress as string);
        return NextResponse.json({
          success: true,
          agentAddress: body.agentAddress,
          ...roleInfo,
        });
      }

      // =======================================================================
      // Get Graph Basic Info
      // =======================================================================
      case "graph-info": {
        const error = validateRequired(body, ["graphId"]);
        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }

        const basicInfo = await service.getGraphBasicInfo(body.graphId as string);
        const metadata = await service.getGraphMetadata(body.graphId as string);
        const status = await service.getGraphStatus(body.graphId as string);

        return NextResponse.json({
          success: true,
          graphId: body.graphId,
          ...basicInfo,
          ...metadata,
          ...status,
        });
      }

      // =======================================================================
      // Get Graph Count
      // =======================================================================
      case "graph-count": {
        const count = await service.getGraphCount();
        return NextResponse.json({
          success: true,
          count,
        });
      }

      // =======================================================================
      // Check if Ready for Publication
      // =======================================================================
      case "ready-for-publication": {
        const error = validateRequired(body, ["graphId"]);
        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }

        const ready = await service.isReadyForPublication(body.graphId as string);
        return NextResponse.json({
          success: true,
          graphId: body.graphId,
          readyForPublication: ready,
        });
      }

      // =======================================================================
      // Fetch TTL Content by GraphId
      // =======================================================================
      case "fetch-content": {
        const error = validateRequired(body, ["graphId"]);
        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }

        const storageService = getTTLStorageService();
        const result = await storageService.getByGraphId(body.graphId as string);

        return NextResponse.json({
          success: true,
          graphId: body.graphId,
          storageId: result.storageId,
          contentHash: result.contentHash,
          content: result.content,
          contentLength: result.content.length,
          metadata: result.metadata,
        });
      }

      // =======================================================================
      // Real Syntax Validation (N3.js)
      // =======================================================================
      case "validate-syntax": {
        // Either provide content directly or graphId to fetch from storage
        if (!body.content && !body.graphId) {
          return NextResponse.json({ error: "Either 'content' or 'graphId' is required" }, { status: 400 });
        }

        let ttlContent = body.content as string;

        // If graphId provided, fetch content from storage
        if (!ttlContent && body.graphId) {
          const storageService = getTTLStorageService();
          const stored = await storageService.getByGraphId(body.graphId as string);
          ttlContent = stored.content;
        }

        // Run N3.js validation
        const validationService = getRDFValidationService();
        const result = await validationService.validateSyntax(ttlContent);

        return NextResponse.json({
          success: true,
          graphId: body.graphId,
          validation: {
            isValid: result.isValid,
            errors: result.errors,
            warnings: result.warnings,
            stats: result.stats,
          },
        });
      }

      // =======================================================================
      // Real Semantic Validation (SHACL)
      // =======================================================================
      case "validate-semantics": {
        // Require content (or graphId) and shapes
        if (!body.content && !body.graphId) {
          return NextResponse.json({ error: "Either 'content' or 'graphId' is required" }, { status: 400 });
        }

        if (!body.shapesContent && !body.shapesType) {
          return NextResponse.json({ error: "Either 'shapesContent' or 'shapesType' is required" }, { status: 400 });
        }

        let ttlContent = body.content as string;

        // If graphId provided, fetch content from storage
        if (!ttlContent && body.graphId) {
          const storageService = getTTLStorageService();
          const stored = await storageService.getByGraphId(body.graphId as string);
          ttlContent = stored.content;
        }

        // Get shapes content (either provided or load from type)
        let shapesContent = body.shapesContent as string;
        if (!shapesContent && body.shapesType) {
          // Load built-in shapes based on type
          shapesContent = getBuiltInShapes(body.shapesType as string);
        }

        // Run SHACL validation
        const validationService = getRDFValidationService();
        const result = await validationService.validateSemantics(ttlContent, shapesContent);

        return NextResponse.json({
          success: true,
          graphId: body.graphId,
          validation: {
            conforms: result.conforms,
            violations: result.violations,
            shapesUsed: result.shapesUsed,
          },
        });
      }

      // =======================================================================
      // Combined Validation + On-Chain Recording
      // =======================================================================
      case "validate-and-record": {
        const error = validateRequired(body, ["agentPrivateKey", "graphId"]);
        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }

        // Step 1: Fetch content from storage
        const storageService = getTTLStorageService();
        let ttlContent: string;
        try {
          const stored = await storageService.getByGraphId(body.graphId as string);
          ttlContent = stored.content;
        } catch (fetchError) {
          return NextResponse.json(
            {
              success: false,
              error: `Failed to fetch content: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`,
              syntaxValid: false,
              semanticValid: false,
            },
            { status: 404 },
          );
        }

        // Step 2: Run syntax validation
        const validationService = getRDFValidationService();
        const syntaxResult = await validationService.validateSyntax(ttlContent);

        // Step 3: Run semantic validation if syntax is valid
        let semanticResult = null;
        if (syntaxResult.isValid && body.shapesContent) {
          semanticResult = await validationService.validateSemantics(ttlContent, body.shapesContent as string);
        }

        // Step 4: Determine overall validity
        const isValid = syntaxResult.isValid && (!semanticResult || semanticResult.conforms);

        // Step 5: Record result on-chain
        const txResult = await service.markGraphValidated(
          body.agentPrivateKey as string,
          body.graphId as string,
          isValid,
        );

        // Step 6: Prepare error summary (max 256 chars for contract)
        let errorSummary = "";
        if (!syntaxResult.isValid && syntaxResult.errors.length > 0) {
          errorSummary = syntaxResult.errors
            .map(e => e.message)
            .join("; ")
            .slice(0, 256);
        } else if (semanticResult && !semanticResult.conforms) {
          errorSummary = semanticResult.violations
            .map(v => v.message)
            .join("; ")
            .slice(0, 256);
        }

        return NextResponse.json({
          success: true,
          graphId: body.graphId,
          syntaxValid: syntaxResult.isValid,
          semanticValid: semanticResult ? semanticResult.conforms : null,
          isValid,
          errorSummary,
          syntaxErrors: syntaxResult.errors,
          syntaxWarnings: syntaxResult.warnings,
          syntaxStats: syntaxResult.stats,
          semanticViolations: semanticResult?.violations,
          txHash: txResult.txHash,
          validatorAddress: txResult.validatorAddress,
        });
      }

      // =======================================================================
      // Record Detailed Validation (with separate syntax/semantic flags)
      // =======================================================================
      case "record-detailed-validation": {
        const error = validateRequired(body, ["agentPrivateKey", "graphId", "syntaxValid", "semanticValid"]);
        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }

        const result = await service.markGraphValidatedWithDetails(
          body.agentPrivateKey as string,
          body.graphId as string,
          body.syntaxValid as boolean,
          body.semanticValid as boolean,
          (body.errorSummary as string) || "",
        );

        return NextResponse.json({
          success: true,
          ...result,
        });
      }

      // =======================================================================
      // Get Detailed Validation Status
      // =======================================================================
      case "validation-details": {
        const error = validateRequired(body, ["graphId"]);
        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }

        const details = await service.getValidationDetails(body.graphId as string);
        return NextResponse.json({
          success: true,
          graphId: body.graphId,
          ...details,
        });
      }

      // =======================================================================
      // Unknown Action
      // =======================================================================
      default:
        return NextResponse.json(
          {
            error: `Unknown action: ${action}`,
            validActions: [
              "submit",
              "validate",
              "validate-syntax",
              "validate-semantics",
              "validate-and-record",
              "record-detailed-validation",
              "validation-details",
              "fetch-content",
              "approve",
              "publish",
              "status",
              "check-permission",
              "get-role",
              "graph-info",
              "graph-count",
              "ready-for-publication",
            ],
          },
          { status: 400 },
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[BDI Agent API Error]", message);
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

/**
 * GET handler - Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    name: "BDI Agent API",
    version: "2.0.0",
    description: "REST API for BDI validation agents to interact with MKMPOL21 DAO",
    endpoints: {
      "POST /api/bdi-agent/submit": {
        description: "Submit RDF graph to DAO",
        requiredFields: [
          "agentPrivateKey",
          "graphURI",
          "graphHash",
          "graphType",
          "datasetVariant",
          "year",
          "modelVersion",
        ],
        permission: 8,
      },
      "POST /api/bdi-agent/validate": {
        description: "Mark graph as validated (on-chain only, no actual validation)",
        requiredFields: ["agentPrivateKey", "graphId", "isValid"],
        permission: 4,
      },
      "POST /api/bdi-agent/validate-syntax": {
        description: "Real N3.js syntax validation of TTL content",
        requiredFields: ["content OR graphId"],
        optionalFields: [],
        returns: "Detailed syntax errors with line numbers and statistics",
      },
      "POST /api/bdi-agent/validate-semantics": {
        description: "SHACL semantic validation of RDF content",
        requiredFields: ["content OR graphId", "shapesContent OR shapesType"],
        optionalFields: ["shapesType: 'article' | 'employment' | 'entity'"],
        returns: "SHACL violations with focus nodes and messages",
      },
      "POST /api/bdi-agent/validate-and-record": {
        description: "Combined validation (syntax + semantics) with on-chain recording",
        requiredFields: ["agentPrivateKey", "graphId"],
        optionalFields: ["shapesContent"],
        permission: 4,
        returns: "Full validation results and transaction hash",
      },
      "POST /api/bdi-agent/fetch-content": {
        description: "Retrieve TTL content from storage by graphId",
        requiredFields: ["graphId"],
        returns: "Decrypted TTL content and metadata",
      },
      "POST /api/bdi-agent/approve": {
        description: "Approve graph for publication",
        requiredFields: ["agentPrivateKey", "graphId"],
        permission: 6,
      },
      "POST /api/bdi-agent/publish": {
        description: "Mark graph as published to DKG",
        requiredFields: ["agentPrivateKey", "graphId", "dkgAssetUAL"],
        permission: 5,
      },
      "POST /api/bdi-agent/status": {
        description: "Get graph validation status",
        requiredFields: ["graphId"],
      },
      "POST /api/bdi-agent/check-permission": {
        description: "Check if agent has permission",
        requiredFields: ["agentAddress", "permissionIndex"],
      },
      "POST /api/bdi-agent/get-role": {
        description: "Get agent role information",
        requiredFields: ["agentAddress"],
      },
      "POST /api/bdi-agent/graph-info": {
        description: "Get full graph information",
        requiredFields: ["graphId"],
      },
      "POST /api/bdi-agent/graph-count": {
        description: "Get total number of graphs in registry",
        requiredFields: [],
      },
      "POST /api/bdi-agent/ready-for-publication": {
        description: "Check if graph is ready for DKG publication",
        requiredFields: ["graphId"],
      },
    },
    graphTypes: {
      ARTICLES: 0,
      ENTITIES: 1,
      MENTIONS: 2,
      NLP: 3,
      ECONOMICS: 4,
      RELATIONS: 5,
      PROVENANCE: 6,
    },
    datasetVariants: {
      ERR_ONLINE: 0,
      OL_ONLINE: 1,
      OL_PRINT: 2,
      ARIREGISTER: 3,
    },
    builtInShapes: {
      article: "Validates: dct:title (required), dct:created (date), ex:source (required)",
      employment: "Validates: EMTAK codes (5 digits), employee counts (positive integers)",
      entity: "Validates: rdfs:label (required), ex:entityType (enum)",
    },
  });
}
