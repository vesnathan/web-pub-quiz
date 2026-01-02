"use client";

import { useMemo } from "react";

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "Contains uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "Contains lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "Contains number", test: (p) => /[0-9]/.test(p) },
  {
    label: "Contains special character",
    test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
  },
];

export function usePasswordValidation(password: string) {
  return useMemo(() => {
    const results = PASSWORD_REQUIREMENTS.map((req) => ({
      ...req,
      met: req.test(password),
    }));

    const metCount = results.filter((r) => r.met).length;
    const isValid = metCount === PASSWORD_REQUIREMENTS.length;

    return {
      requirements: results,
      metCount,
      totalCount: PASSWORD_REQUIREMENTS.length,
      isValid,
    };
  }, [password]);
}

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  const { requirements, metCount, totalCount } =
    usePasswordValidation(password);

  if (!password) return null;

  const getStrengthColor = () => {
    const percentage = metCount / totalCount;
    if (percentage <= 0.4) return "bg-red-500";
    if (percentage <= 0.6) return "bg-orange-500";
    if (percentage <= 0.8) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthText = () => {
    const percentage = metCount / totalCount;
    if (percentage <= 0.4) return "Weak";
    if (percentage <= 0.6) return "Fair";
    if (percentage <= 0.8) return "Good";
    return "Strong";
  };

  return (
    <div className="space-y-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getStrengthColor()}`}
            style={{ width: `${(metCount / totalCount) * 100}%` }}
          />
        </div>
        <span
          className={`text-xs font-medium ${getStrengthColor().replace("bg-", "text-")}`}
        >
          {getStrengthText()}
        </span>
      </div>

      {/* Requirements list */}
      <ul className="space-y-1 text-xs">
        {requirements.map((req, index) => (
          <li
            key={index}
            className={`flex items-center gap-1.5 ${
              req.met ? "text-green-400" : "text-gray-500"
            }`}
          >
            {req.met ? (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
