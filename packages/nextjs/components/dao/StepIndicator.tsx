"use client";

import { CheckCircleIcon } from "./Icons";

interface Step {
  id: number;
  title: string;
  description?: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

/**
 * StepIndicator component for multi-step onboarding flows
 * Displays progress through a series of steps with visual feedback
 */
export const StepIndicator = ({ steps, currentStep, className = "" }: StepIndicatorProps) => {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          const isPending = currentStep < step.id;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                {/* Step circle */}
                <div
                  className={`
                    step-indicator
                    ${isCompleted ? "completed" : ""}
                    ${isActive ? "active" : ""}
                    ${isPending ? "pending" : ""}
                  `}
                >
                  {isCompleted ? (
                    <CheckCircleIcon className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-bold">{step.id}</span>
                  )}
                </div>

                {/* Step label */}
                <div className="mt-2 text-center">
                  <p
                    className={`text-sm font-medium ${
                      isActive ? "text-primary" : isCompleted ? "text-success" : "text-base-content/60"
                    }`}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-base-content/50 mt-0.5 max-w-[100px]">{step.description}</p>
                  )}
                </div>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-4 mt-[-24px]">
                  <div
                    className={`h-full transition-all duration-500 ${
                      currentStep > step.id ? "bg-success" : "bg-base-300"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
