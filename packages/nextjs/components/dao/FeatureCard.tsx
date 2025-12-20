"use client";

import Link from "next/link";
import { ArrowRightIcon } from "./Icons";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  className?: string;
  variant?: "default" | "primary" | "outline";
}

/**
 * FeatureCard component for displaying features or navigation options
 * Used in landing pages and dashboards
 */
export const FeatureCard = ({
  icon,
  title,
  description,
  href,
  onClick,
  className = "",
  variant = "default",
}: FeatureCardProps) => {
  const baseStyles = `
    card bg-base-100 shadow-lg card-hover cursor-pointer
    border border-base-300 overflow-hidden group
    ${className}
  `;

  const variantStyles = {
    default: "",
    primary: "border-primary/30 bg-gradient-to-br from-base-100 to-primary/5",
    outline: "border-primary/20 hover:border-primary/50",
  };

  const content = (
    <div className="card-body">
      <div className="flex items-start gap-4">
        <div
          className={`
          p-3 rounded-xl shrink-0 transition-colors duration-300
          ${variant === "primary" ? "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-content" : "bg-base-200 text-primary group-hover:bg-primary/10"}
        `}
        >
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="card-title text-lg mb-1">{title}</h3>
          <p className="text-sm text-base-content/70 leading-relaxed">{description}</p>
        </div>
        {href && (
          <ArrowRightIcon className="w-5 h-5 text-base-content/30 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={`${baseStyles} ${variantStyles[variant]}`}>
        {content}
      </Link>
    );
  }

  return (
    <div className={`${baseStyles} ${variantStyles[variant]}`} onClick={onClick}>
      {content}
    </div>
  );
};
