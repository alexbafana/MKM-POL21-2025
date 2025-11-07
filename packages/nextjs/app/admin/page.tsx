"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { isAddress, zeroAddress } from "viem";
import { useAccount, useChainId, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useDeployedMkmp } from "~~/hooks/useDeployedMkmp";

const MKMP_ABI = [
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "hasRole",
    outputs: [{ internalType: "uint32", name: "", type: "uint32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_user", type: "address" },
      { internalType: "uint32", name: "_role", type: "uint32" },
    ],
    name: "assignRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// same mapping you use on-chain
const ROLES = [
  { name: "Member_Institution", value: 1152, index: 0 },
  { name: "Ordinary_User", value: 1153, index: 1 },
  { name: "MFSSIA_Guardian_Agent", value: 3074, index: 2 },
  { name: "Eliza_Data_Extractor_Agent", value: 3075, index: 3 },
  { name: "Data_Validator", value: 1156, index: 4 },
  { name: "MKMPOL21Owner", value: 1029, index: 5 },
  { name: "Consortium", value: 1030, index: 6 },
  { name: "Validation_Committee", value: 1031, index: 7 },
  { name: "Dispute_Resolution_Board", value: 1032, index: 8 },
];

const OWNER_INDEX = 5;

export default function AdminPage() {
  const chainId = useChainId();
  const { address } = useAccount();
  const mkmpAddress = useDeployedMkmp();

  // read caller's role from *current* contract
  const { data: rawRole } = useReadContract({
    address: mkmpAddress,
    abi: MKMP_ABI,
    functionName: "hasRole",
    args: [address ?? zeroAddress],
    query: { enabled: Boolean(mkmpAddress && address) },
  });

  const callerRoleValue = Number(rawRole ?? 0);
  const callerRoleIndex = callerRoleValue & 31;
  const isOwner = callerRoleIndex === OWNER_INDEX;

  // --- grant form state ---
  const [to, setTo] = useState<string>("");
  const [roleValue, setRoleValue] = useState<number>(ROLES[1].value); // default Ordinary_User
  const selectedRole = useMemo(() => ROLES.find(r => r.value === roleValue), [roleValue]);

  // write
  const { writeContract, data: txHash, isPending: isGranting, error: writeErr } = useWriteContract();
  const { isLoading: isMining, isSuccess: isMined } = useWaitForTransactionReceipt({ hash: txHash });

  const canSubmit = isOwner && mkmpAddress && isAddress(to);

  const onGrant = () => {
    if (!canSubmit) return;
    writeContract({
      address: mkmpAddress!,
      abi: MKMP_ABI,
      functionName: "assignRole",
      args: [to as `0x${string}`, roleValue],
    });
  };

  // simple banner when contract isn’t found
  if (!mkmpAddress) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-4">
          <Link href="/" className="link">
            ← Back to Home
          </Link>
        </div>
        <h1 className="text-2xl font-bold mb-2">MKMPOL21 • Admin</h1>
        <p className="text-warning">
          MKMPOL21 is not deployed for chain {chainId}. Deploy, restart the app, and retry.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <Link href="/" className="link">
          ← Back to Home
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">MKMPOL21 • Admin</h1>
      <p className="opacity-70 mb-6">
        Contract: <span className="font-mono">{mkmpAddress}</span>
      </p>

      <div className="bg-base-100 rounded-2xl p-5 shadow mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm opacity-70">Connected</div>
            <div className="font-mono">{address ?? "—"}</div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-70">Your role</div>
            <div className="font-mono">
              value {callerRoleValue} • index {callerRoleIndex} • {ROLES[callerRoleIndex]?.name ?? "Unknown"}
            </div>
          </div>
        </div>
      </div>

      {!isOwner && (
        <div className="alert alert-warning mb-6">
          <span>
            You are <b>not</b> MKMPOL21Owner (index 5) on this contract. If you granted OWNER on a previous deployment,
            re-grant it on this instance.
          </span>
        </div>
      )}

      {/* Owner-only grant panel */}
      <fieldset className="bg-base-100 rounded-2xl p-5 shadow mb-6" disabled={!isOwner}>
        <legend className="font-semibold mb-4">Grant Role</legend>
        <div className="grid md:grid-cols-3 gap-4">
          <label className="form-control md:col-span-2">
            <span className="label-text">Recipient address</span>
            <input
              className="input input-bordered w-full font-mono"
              placeholder="0x..."
              value={to}
              onChange={e => setTo(e.target.value.trim())}
            />
          </label>

          <label className="form-control">
            <span className="label-text">Role</span>
            <select
              className="select select-bordered w-full"
              value={roleValue}
              onChange={e => setRoleValue(Number(e.target.value))}
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>
                  {r.name} (value {r.value}, index {r.index})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            className="btn btn-primary"
            onClick={onGrant}
            disabled={!canSubmit || isGranting || isMining}
            title={!isOwner ? "Owner only" : !isAddress(to) ? "Enter a valid address" : ""}
          >
            {isGranting || isMining ? "Granting..." : "Grant Role"}
          </button>
          <div className="text-sm opacity-70">
            {selectedRole && (
              <>
                Granting <b>{selectedRole.name}</b> (value {selectedRole.value})
              </>
            )}
          </div>
        </div>

        {writeErr && (
          <div className="alert alert-error mt-4">
            <span className="font-mono">{(writeErr as any)?.shortMessage ?? writeErr.message}</span>
          </div>
        )}
        {txHash && (
          <div className="alert alert-info mt-4">
            <span className="font-mono">tx: {txHash}</span>
          </div>
        )}
        {isMined && (
          <div className="alert alert-success mt-4">
            <span>✅ Role granted. Refresh will show updated status.</span>
          </div>
        )}
      </fieldset>

      <p className="text-sm opacity-70">
        Tip: If this still says you’re not owner, double-check you granted OWNER on **this** MKMPOL21 address (from{" "}
        <code>deployedContracts.ts</code>) and that your wallet is on the same chain (31337).
      </p>
    </div>
  );
}
