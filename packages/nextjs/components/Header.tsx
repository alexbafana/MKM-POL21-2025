"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hardhat } from "viem/chains";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { FaucetButton, HardhatAccountSwitcher, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-eth";

/** Single-level link */
type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

/** Multi-level item (for Committees) */
type HeaderMenuGroup = {
  label: string;
  items: HeaderMenuLink[];
};

const singleLinks: HeaderMenuLink[] = [
  { label: "Onboarding", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Roles & Permissions", href: "/roles-permissions" },
];

const committeesGroup: HeaderMenuGroup = {
  label: "Committees",
  items: [
    { label: "Consortium", href: "/committees/consortium" },
    { label: "Validation Committee", href: "/committees/validation" },
    { label: "Dispute Resolution Board", href: "/committees/dispute" },
  ],
};

const DesktopNav = () => {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;

  return (
    <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-1 gap-2">
      {singleLinks.map(({ label, href, icon }) => (
        <li key={href}>
          <Link
            href={href}
            className={`${isActive(href) ? "bg-secondary shadow-md" : ""} hover:bg-secondary hover:shadow-md focus:!bg-secondary active:!text-neutral py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col`}
          >
            {icon}
            <span>{label}</span>
          </Link>
        </li>
      ))}

      {/* Committees dropdown (desktop) */}
      <li className="dropdown dropdown-hover dropdown-end">
        <Link
          href="/committees"
          tabIndex={0}
          className={`${pathname.startsWith("/committees") ? "bg-secondary shadow-md" : ""} py-1.5 px-3 text-sm rounded-full hover:bg-secondary hover:shadow-md inline-flex items-center gap-1`}
        >
          {committeesGroup.label}
        </Link>
        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-64 mt-2">
          {committeesGroup.items.map(({ label, href }) => (
            <li key={href}>
              <Link href={href} className={isActive(href) ? "active" : ""}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </li>
    </ul>
  );
};

const MobileNav = ({ onSelect }: { onSelect: () => void }) => {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;

  return (
    <ul
      className="menu menu-compact dropdown-content mt-3 p-2 shadow-sm bg-base-100 rounded-box w-60"
      onClick={onSelect}
    >
      {singleLinks.map(({ label, href, icon }) => (
        <li key={href}>
          <Link
            href={href}
            className={`${isActive(href) ? "bg-secondary shadow-md" : ""} py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col`}
          >
            {icon}
            <span>{label}</span>
          </Link>
        </li>
      ))}

      <li className="menu-title mt-2">
        <Link href="/committees" className="hover:text-primary">
          {committeesGroup.label}
        </Link>
      </li>
      {committeesGroup.items.map(({ label, href }) => (
        <li key={href}>
          <Link
            href={href}
            className={`${isActive(href) ? "bg-secondary shadow-md" : ""} py-1.5 px-3 text-sm rounded-full`}
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
};

/** Site header */
export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;

  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  return (
    <div className="sticky lg:static top-0 navbar bg-base-100 min-h-0 shrink-0 justify-between z-20 shadow-md shadow-secondary px-0 sm:px-2">
      <div className="navbar-start w-auto lg:w-1/2">
        {/* Mobile burger only shows on small screens */}
        <details className="dropdown" ref={burgerMenuRef}>
          <summary className="ml-1 btn btn-ghost lg:hidden hover:bg-transparent">
            <Bars3Icon className="h-1/2" />
          </summary>
          <MobileNav onSelect={() => burgerMenuRef?.current?.removeAttribute("open")} />
        </details>

        {/* Logo + brand */}
        <Link href="/" className="hidden lg:flex items-center gap-2 ml-4 mr-6 shrink-0">
          <div className="flex flex-col leading-tight">
            <span className="font-extrabold tracking-tight">MKMPOL21 DAO</span>
            <span className="text-xs opacity-70">Public Data Governance</span>
          </div>
        </Link>

        {/* Desktop menu */}
        <DesktopNav />
      </div>

      <div className="navbar-end grow mr-4">
        <RainbowKitCustomConnectButton />
        {isLocalNetwork && (
          <>
            <HardhatAccountSwitcher />
            <FaucetButton />
          </>
        )}
      </div>
    </div>
  );
};
