"use client";

import { SpinnerIcon } from "./Icons";

interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * LoadingState component for displaying loading indicators
 * Used throughout the application during async operations
 */
export const LoadingState = ({ message = "Loading...", size = "md", className = "" }: LoadingStateProps) => {
  const sizeStyles = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <SpinnerIcon className={`text-primary ${sizeStyles[size]}`} />
      {message && <p className="text-base-content/70 text-sm animate-pulse">{message}</p>}
    </div>
  );
};

interface LoadingOverlayProps {
  message?: string;
  visible: boolean;
}

/**
 * LoadingOverlay component for full-screen loading states
 */
export const LoadingOverlay = ({ message = "Processing...", visible }: LoadingOverlayProps) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-base-100/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="card bg-base-100 shadow-xl p-8 text-center">
        <SpinnerIcon className="w-12 h-12 text-primary mx-auto mb-4" />
        <p className="text-lg font-medium">{message}</p>
      </div>
    </div>
  );
};

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string;
  height?: string;
}

/**
 * Skeleton component for content placeholders during loading
 */
export const Skeleton = ({ className = "", variant = "text", width = "100%", height }: SkeletonProps) => {
  const variantStyles = {
    text: "h-4 rounded",
    circular: "rounded-full aspect-square",
    rectangular: "rounded-lg",
  };

  const defaultHeight = variant === "text" ? "1rem" : variant === "circular" ? width : "4rem";

  return (
    <div
      className={`skeleton-pulse ${variantStyles[variant]} ${className}`}
      style={{ width, height: height || defaultHeight }}
    />
  );
};
