package mkmpol.agents;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import okhttp3.*;
import java.io.IOException;
import java.util.concurrent.TimeUnit;

/**
 * HTTP Client for BDI agents to interact with MKMPOL21 DAO API.
 *
 * Calls the Next.js API endpoints at /api/bdi-agent/*
 */
public class DAOClient {
    private static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");

    private final String baseUrl;
    private final OkHttpClient httpClient;
    private final Gson gson;

    public DAOClient(String baseUrl) {
        this.baseUrl = baseUrl;
        this.httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build();
        this.gson = new Gson();
    }

    /**
     * Submit RDF graph to DAO
     */
    public SubmissionResult submitGraph(
        String privateKey,
        String graphURI,
        String graphHash,
        int graphType,
        int datasetVariant,
        int year,
        String modelVersion
    ) throws IOException {
        JsonObject body = new JsonObject();
        body.addProperty("agentPrivateKey", privateKey);
        body.addProperty("graphURI", graphURI);
        body.addProperty("graphHash", graphHash);
        body.addProperty("graphType", graphType);
        body.addProperty("datasetVariant", datasetVariant);
        body.addProperty("year", year);
        body.addProperty("modelVersion", modelVersion);

        String response = post("/submit", body.toString());
        return gson.fromJson(response, SubmissionResult.class);
    }

    /**
     * Mark graph as validated
     */
    public ValidationResult validateGraph(
        String privateKey,
        String graphId,
        boolean isValid
    ) throws IOException {
        JsonObject body = new JsonObject();
        body.addProperty("agentPrivateKey", privateKey);
        body.addProperty("graphId", graphId);
        body.addProperty("isValid", isValid);

        String response = post("/validate", body.toString());
        return gson.fromJson(response, ValidationResult.class);
    }

    /**
     * Get graph status
     */
    public GraphStatus getGraphStatus(String graphId) throws IOException {
        JsonObject body = new JsonObject();
        body.addProperty("graphId", graphId);

        String response = post("/status", body.toString());
        return gson.fromJson(response, GraphStatus.class);
    }

    /**
     * Check agent permission
     */
    public boolean checkPermission(String agentAddress, int permissionIndex) throws IOException {
        JsonObject body = new JsonObject();
        body.addProperty("agentAddress", agentAddress);
        body.addProperty("permissionIndex", permissionIndex);

        String response = post("/check-permission", body.toString());
        JsonObject result = gson.fromJson(response, JsonObject.class);
        return result.get("hasPermission").getAsBoolean();
    }

    /**
     * Get agent role
     */
    public RoleInfo getAgentRole(String agentAddress) throws IOException {
        JsonObject body = new JsonObject();
        body.addProperty("agentAddress", agentAddress);

        String response = post("/get-role", body.toString());
        return gson.fromJson(response, RoleInfo.class);
    }

    private String post(String endpoint, String jsonBody) throws IOException {
        RequestBody body = RequestBody.create(jsonBody, JSON);
        Request request = new Request.Builder()
            .url(baseUrl + endpoint)
            .post(body)
            .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Unexpected response code: " + response);
            }
            return response.body().string();
        }
    }

    // Response DTOs

    public static class SubmissionResult {
        public boolean success;
        public String graphId;
        public String txHash;
        public int blockNumber;
    }

    public static class ValidationResult {
        public boolean success;
        public String graphId;
        public boolean isValid;
        public String validatorAddress;
        public String txHash;
    }

    public static class GraphStatus {
        public boolean success;
        public String graphId;
        public boolean exists;
        public boolean validated;
        public boolean approved;
        public boolean published;
    }

    public static class RoleInfo {
        public boolean success;
        public String agentAddress;
        public int roleValue;
        public int roleIndex;
        public String roleName;
    }
}
