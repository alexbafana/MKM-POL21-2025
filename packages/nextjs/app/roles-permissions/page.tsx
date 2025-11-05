"use client";

import { useMemo, useState } from "react";
import { isAddress, zeroAddress } from "viem";
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import Link from "next/link";

const MKMP_ABI = [
  { inputs:[{name:"user", type:"address"}], name:"hasRole", outputs:[{type:"uint32"}], stateMutability:"view", type:"function" },
  { inputs:[{name:"_user", type:"address"}, {name:"_role", type:"uint32"}], name:"assignRole", outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs:[{name:"_user", type:"address"}, {name:"_role", type:"uint32"}], name:"revokeRole", outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs:[{name:"_role", type:"uint32"},  {name:"_permissionIndex", type:"uint64"}], name:"grantPermission", outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs:[{name:"_role", type:"uint32"},  {name:"_permissionIndex", type:"uint64"}], name:"revokePermission", outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs:[{name:"user", type:"address"},  {name:"_permissionIndex", type:"uint64"}], name:"has_permission", outputs:[{type:"bool"}], stateMutability:"view", type:"function" },
] as const;

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
const useMkmpAddress = (): `0x${string}` | undefined => {
  const chainId = useChainId();
  return deployedContracts?.[chainId]?.contracts?.MKMPOL21?.address as `0x${string}` | undefined;
};

export default function RolesPermissions() {
  const { address } = useAccount();
  const chainId = useChainId();
  const mkmpAddress = useMkmpAddress();

  const { data: callerRaw } = useReadContract({
    address: mkmpAddress,
    abi: MKMP_ABI,
    functionName: "hasRole",
    args: [address ?? zeroAddress],
    query: { enabled: Boolean(mkmpAddress && address) },
  });
  const callerRoleIndex = Number(callerRaw ?? 0) & 31;
  const isOwner = callerRoleIndex === OWNER_INDEX;

  const { writeContract, data: txHash, error: writeErr, isPending } = useWriteContract();
  const { isLoading: isMining, isSuccess: isMined } = useWaitForTransactionReceipt({ hash: txHash });

  // forms
  const [user, setUser] = useState<string>("");
  const [roleValue, setRoleValue] = useState<number>(ROLES[1].value);
  const [permRoleValue, setPermRoleValue] = useState<number>(ROLES[1].value);
  const [permIndex, setPermIndex] = useState<number>(0);

  const canSubmitRole = isOwner && mkmpAddress && isAddress(user);
  const canSubmitPerm = mkmpAddress && isOwner;

  const onAssign = () => {
    if (!canSubmitRole) return;
    writeContract({ address: mkmpAddress!, abi: MKMP_ABI, functionName: "assignRole", args: [user as `0x${string}`, BigInt(roleValue)] });
  };
  const onRevoke = () => {
    if (!canSubmitRole) return;
    writeContract({ address: mkmpAddress!, abi: MKMP_ABI, functionName: "revokeRole", args: [user as `0x${string}`, BigInt(roleValue)] });
  };
  const onGrantPerm = () => {
    if (!canSubmitPerm) return;
    writeContract({ address: mkmpAddress!, abi: MKMP_ABI, functionName: "grantPermission", args: [BigInt(permRoleValue), BigInt(permIndex)] });
  };
  const onRevokePerm = () => {
    if (!canSubmitPerm) return;
    writeContract({ address: mkmpAddress!, abi: MKMP_ABI, functionName: "revokePermission", args: [BigInt(permRoleValue), BigInt(permIndex)] });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-4">
        <Link href="/" className="link">← Back to Home</Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">Roles &amp; Permissions</h1>
      <p className="opacity-70 mb-6">Chain {chainId} • Contract {mkmpAddress ?? "—"}</p>

      {!isOwner && (
        <div className="alert alert-warning mb-6">
          <span>You’re not recognized as <b>Owner</b> (index 5). Visibility enabled, but actions disabled.</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Assign/Revoke Role */}
        <fieldset className="bg-base-100 rounded-2xl p-5 shadow" disabled={!isOwner}>
          <legend className="font-semibold mb-4">Assign / Revoke Role</legend>
          <label className="form-control mb-3">
            <span className="label-text">User Address</span>
            <input className="input input-bordered font-mono" placeholder="0x..." value={user} onChange={e => setUser(e.target.value.trim())} />
          </label>
          <label className="form-control mb-4">
            <span className="label-text">Role</span>
            <select className="select select-bordered" value={roleValue} onChange={e => setRoleValue(Number(e.target.value))}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.name} (value {r.value}, index {r.index})</option>)}
            </select>
          </label>
          <div className="flex gap-3">
            <button className="btn btn-primary" disabled={!canSubmitRole || isPending || isMining} onClick={onAssign}>Assign</button>
            <button className="btn" disabled={!canSubmitRole || isPending || isMining} onClick={onRevoke}>Revoke</button>
          </div>
        </fieldset>

        {/* Grant/Revoke Permission */}
        <fieldset className="bg-base-100 rounded-2xl p-5 shadow" disabled={!isOwner}>
          <legend className="font-semibold mb-4">Grant / Revoke Permission</legend>
          <label className="form-control mb-3">
            <span className="label-text">Role</span>
            <select className="select select-bordered" value={permRoleValue} onChange={e => setPermRoleValue(Number(e.target.value))}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.name} (value {r.value}, index {r.index})</option>)}
            </select>
          </label>
          <label className="form-control mb-4">
            <span className="label-text">Permission Index</span>
            <input type="number" className="input input-bordered" min={0} value={permIndex} onChange={e => setPermIndex(Number(e.target.value))} />
          </label>
          <div className="flex gap-3">
            <button className="btn btn-primary" disabled={!canSubmitPerm || isPending || isMining} onClick={onGrantPerm}>Grant</button>
            <button className="btn" disabled={!canSubmitPerm || isPending || isMining} onClick={onRevokePerm}>Revoke</button>
          </div>
        </fieldset>
      </div>

      {writeErr && <div className="alert alert-error mt-6"><span className="font-mono">{(writeErr as any)?.shortMessage ?? writeErr.message}</span></div>}
      {txHash   && <div className="alert alert-info mt-6"><span className="font-mono">tx: {txHash}</span></div>}
      {isMined  && <div className="alert alert-success mt-6"><span>✅ Transaction included</span></div>}
    </div>
  );
}
