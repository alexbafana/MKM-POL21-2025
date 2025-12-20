"use client";

interface StatusBadgeProps {
  status: "success" | "warning" | "error" | "info" | "pending";
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  className?: string;
}

/**
 * StatusBadge component for displaying status indicators
 * Used throughout the application for transaction states, role statuses, etc.
 */
export const StatusBadge = ({ status, children, size = "md", pulse = false, className = "" }: StatusBadgeProps) => {
  const statusColors = {
    success: "badge-success text-success-content",
    warning: "badge-warning text-warning-content",
    error: "badge-error text-error-content",
    info: "badge-info text-info-content",
    pending: "bg-base-300 text-base-content",
  };

  const sizeStyles = {
    sm: "badge-sm text-xs",
    md: "badge-md",
    lg: "badge-lg text-base",
  };

  return (
    <span
      className={`
      badge ${statusColors[status]} ${sizeStyles[size]}
      ${pulse ? "animate-pulse" : ""}
      ${className}
    `}
    >
      {status === "pending" && <span className="status-indicator pending mr-1.5" />}
      {status === "success" && <span className="status-indicator active mr-1.5" />}
      {children}
    </span>
  );
};
