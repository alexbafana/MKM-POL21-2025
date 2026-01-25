/**
 * BDI Agent API Endpoints
 *
 * REST API for external BDI agents (Jadex) to interact with MKMPOL21 DAO contracts.
 *
 * Endpoints:
 *   POST /api/bdi-agent/submit          - Submit RDF graph
 *   POST /api/bdi-agent/validate        - Mark graph as validated
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
      // Unknown Action
      // =======================================================================
      default:
        return NextResponse.json(
          {
            error: `Unknown action: ${action}`,
            validActions: [
              "submit",
              "validate",
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
    version: "1.0.0",
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
        description: "Mark graph as validated",
        requiredFields: ["agentPrivateKey", "graphId", "isValid"],
        permission: 4,
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
  });
}
