import fs from "node:fs/promises";
import path from "node:path";
import { ethers } from "ethers";
import * as rdf from "rdf-canonize";

export async function canonicalize(source: string): Promise<string> {
  return rdf.canonize(source, { algorithm: "RDFC-1.0", inputFormat: "application/n-quads", maxWorkFactor: 1 });
}
export const digest = (canonical: string) => ethers.keccak256(ethers.toUtf8Bytes(canonical));
export async function publishAndConfirm(
  registry: any,
  signer: any,
  assetId: string,
  source: string,
  directory: string,
) {
  if ((await registry.adapter()).toLowerCase() !== signer.address.toLowerCase())
    throw new Error("Appointed adapter required before publication");
  const asset = await registry.assets(assetId);
  if (Number(asset.state) !== 3) throw new Error("Authorization required before publication");
  const provider = signer.provider;
  const block = await provider.getBlock("latest");
  if (BigInt(block.timestamp) > asset.deadline) throw new Error("Authorization expired before publication");
  const canonical = await canonicalize(source);
  const hash = digest(canonical);
  if (hash !== asset.contentHash) throw new Error("Approved-content mismatch before publication");
  await fs.mkdir(directory, { recursive: true });
  const filename = path.join(directory, `${hash}.nq`);
  // A deterministic content address; an existing differing object is not overwritten.
  try {
    await fs.writeFile(filename, canonical, { flag: "wx" });
  } catch (error: any) {
    if (error.code !== "EEXIST") throw error;
  }
  const observed = digest(await canonicalize(await fs.readFile(filename, "utf8")));
  if (observed !== hash) throw new Error("Publication read-back mismatch");
  const network = await provider.getNetwork();
  const manifest = {
    profile: "PaperB-local-RDFC1.0-keccak256-v1",
    chainId: network.chainId.toString(),
    registry: await registry.getAddress(),
    assetId,
    proposalId: asset.proposalId.toString(),
    approvedHash: asset.contentHash,
    observedHash: observed,
    publicationId: hash,
    evidenceHash: asset.evidenceHash,
    modelHash: asset.modelHash,
    adapter: signer.address,
  };
  const receiptHash = digest(JSON.stringify(manifest));
  const tx = await registry.connect(signer).confirm(assetId, asset.proposalId, observed, hash, receiptHash);
  const receipt = await tx.wait();
  await fs.writeFile(
    path.join(directory, `${assetId}.receipt.json`),
    JSON.stringify({ ...manifest, receiptHash, confirmationTransaction: receipt.hash }, null, 2),
  );
  return { manifest, receiptHash, receipt, filename };
}

// A narrow synthetic fixture rule, not EMTAK/NLP accuracy or institutional semantic validation.
export async function validateFixture(source: string) {
  const canonical = await canonicalize(source);
  const quads = rdf.NQuads.parse(canonical);
  const classifications = quads.filter((q: any) => q.predicate.value === "urn:paperb:employment:classification");
  const syntaxValid = quads.length > 0;
  const semanticValid =
    classifications.length === 1 &&
    classifications[0].object.termType === "Literal" &&
    ["job-gain", "job-loss"].includes(classifications[0].object.value) &&
    quads.some(
      (q: any) =>
        q.subject.value === classifications[0].subject.value &&
        q.predicate.value === "urn:paperb:employment:source" &&
        q.object.termType === "NamedNode",
    );
  const evidence = {
    profile: "synthetic-employment-fixture-rule-v1",
    contentHash: digest(canonical),
    syntaxValid,
    semanticValid,
  };
  return { ...evidence, evidenceHash: digest(JSON.stringify(evidence)) };
}
