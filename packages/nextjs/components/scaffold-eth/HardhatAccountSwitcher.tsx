"use client";

import { rainbowkitBurnerWallet } from "burner-connector";
import { hardhat } from "viem/chains";
import { useAccount, useDisconnect } from "wagmi";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

// Correct burner wallet storage key from Scaffold-ETH
const BURNER_WALLET_PK_KEY = "burnerWallet.pk";

// Hardhat's default test accounts (first 10)
const HARDHAT_ACCOUNTS = [
  {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d719a7d09cd",
    label: "Account #0 (Deployer)",
  },
  {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    label: "Account #1",
  },
  {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    label: "Account #2",
  },
  {
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    privateKey: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    label: "Account #3",
  },
  {
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    privateKey: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
    label: "Account #4",
  },
  {
    address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    privateKey: "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
    label: "Account #5",
  },
  {
    address: "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
    privateKey: "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
    label: "Account #6",
  },
  {
    address: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
    privateKey: "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
    label: "Account #7",
  },
  {
    address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
    privateKey: "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
    label: "Account #8",
  },
  {
    address: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
    privateKey: "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
    label: "Account #9",
  },
];

/**
 * Hardhat Account Switcher
 * Allows switching between Hardhat's test accounts in the burner wallet
 * Only shows on local Hardhat network
 */
export const HardhatAccountSwitcher = () => {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { targetNetwork } = useTargetNetwork();

  // Only show on Hardhat local network
  if (targetNetwork.id !== hardhat.id) {
    return null;
  }

  const currentAccount = HARDHAT_ACCOUNTS.find(acc => acc.address.toLowerCase() === address?.toLowerCase());

  const switchAccount = async (privateKey: string, accountLabel: string) => {
    try {
      console.log(`[Account Switcher] Switching to ${accountLabel}...`);

      // Get the correct storage (localStorage or sessionStorage)
      const storage = rainbowkitBurnerWallet.useSessionStorage ? sessionStorage : localStorage;

      console.log(
        `[Account Switcher] Using ${rainbowkitBurnerWallet.useSessionStorage ? "sessionStorage" : "localStorage"}`,
      );
      console.log(`[Account Switcher] Current PK:`, storage.getItem(BURNER_WALLET_PK_KEY)?.slice(0, 10) + "...");

      // Update burner wallet private key
      storage.setItem(BURNER_WALLET_PK_KEY, privateKey);

      console.log(`[Account Switcher] Updated PK to:`, privateKey.slice(0, 10) + "...");

      // Disconnect current wallet
      console.log(`[Account Switcher] Disconnecting wallet...`);
      await disconnect();

      // Small delay to ensure disconnect completes
      await new Promise(resolve => setTimeout(resolve, 500));

      // Reload page to reconnect with new account
      console.log(`[Account Switcher] Reloading page...`);
      window.location.reload();
    } catch (error) {
      console.error("[Account Switcher] Failed to switch account:", error);
      alert(`Failed to switch to ${accountLabel}: ${error}`);
    }
  };

  return (
    <div className="dropdown dropdown-end dropdown-hover">
      <label tabIndex={0} className="btn btn-sm btn-ghost gap-2 normal-case">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-4 h-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
          />
        </svg>
        <span className="hidden md:inline">{currentAccount ? currentAccount.label : "Switch Account"}</span>
      </label>

      <ul
        tabIndex={0}
        className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-72 mt-2 max-h-96 overflow-y-auto"
      >
        <li className="menu-title">
          <span className="text-xs">Hardhat Test Accounts</span>
        </li>
        {HARDHAT_ACCOUNTS.map(account => {
          const isCurrent = account.address.toLowerCase() === address?.toLowerCase();
          return (
            <li key={account.address}>
              <button
                onClick={() => switchAccount(account.privateKey, account.label)}
                className={`${isCurrent ? "active bg-secondary" : ""} text-sm`}
                disabled={isCurrent}
              >
                <div className="flex flex-col items-start w-full">
                  <span className="font-medium">{account.label}</span>
                  <span className="text-xs opacity-60 font-mono">
                    {account.address.slice(0, 6)}...{account.address.slice(-4)}
                  </span>
                </div>
                {isCurrent && <span className="badge badge-xs badge-primary">Current</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
