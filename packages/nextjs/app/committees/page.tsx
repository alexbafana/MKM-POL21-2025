"use client";

import Link from "next/link";
import { useChainId } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import deployedContracts from "~~/contracts/deployedContracts";

const CommitteeRow = ({
  name,
  route,
  contractKey,
}: {
  name: string;
  route: string;
  contractKey: "Consortium" | "ValidationCommittee" | "DisputeResolutionBoard";
}) => {
  const chainId = useChainId();
  const addr = (deployedContracts as any)?.[chainId]?.[contractKey]?.address as `0x${string}` | undefined;
  return (
    <div className="flex items-center justify-between border border-base-300 rounded-xl p-4">
      <div>
        <div className="font-semibold">{name}</div>
        <div className="text-sm opacity-70">Contract: {addr ? <Address address={addr} /> : "not deployed"}</div>
      </div>
      <Link
        href={route}
        className="btn btn-primary"
        aria-disabled={!addr}
        onClick={e => {
          if (!addr) e.preventDefault();
        }}
      >
        Open
      </Link>
    </div>
  );
};

export default function Committees() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Committees</h1>
      <p className="opacity-70 mb-6">Each committee has its own voting protocol and UI.</p>
      <div className="space-y-4">
        <CommitteeRow name="Consortium" route="/committees/consortium" contractKey="Consortium" />
        <CommitteeRow name="Validation Committee" route="/committees/validation" contractKey="ValidationCommittee" />
        <CommitteeRow
          name="Dispute Resolution Board"
          route="/committees/dispute"
          contractKey="DisputeResolutionBoard"
        />
      </div>
    </div>
  );
}
