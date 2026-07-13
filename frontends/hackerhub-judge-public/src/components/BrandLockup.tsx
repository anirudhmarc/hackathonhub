import React from "react";

interface BrandLockupProps {
  /** Visual size of the lockup. */
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Optional per-hackathon logo URL; when set, replaces the default AWS logo. */
  logoUrl?: string | null;
}

const LOGO_HEIGHT: Record<NonNullable<BrandLockupProps["size"]>, string> = {
  sm: "h-8",
  md: "h-10",
  lg: "h-14",
};

/**
 * Brand lockup: shows a per-hackathon logo when provided, otherwise the generic
 * AWS logo.
 */
const BrandLockup: React.FC<BrandLockupProps> = ({ size = "md", className = "", logoUrl = null }) => {
  const h = LOGO_HEIGHT[size];
  return (
    <div className={`flex items-center gap-3 ${className}`} role="img" aria-label={logoUrl ? "Hackathon logo" : "AWS Hackathon"}>
      <img
        src={logoUrl || "/aws-logo.svg"}
        alt={logoUrl ? "Hackathon" : "AWS"}
        className={`${h} w-auto object-contain`}
      />
    </div>
  );
};

export default BrandLockup;
