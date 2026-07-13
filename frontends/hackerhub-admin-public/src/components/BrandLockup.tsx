import React from "react";
import { useCurrentHackathon } from "@/contexts/CurrentHackathonContext";

interface BrandLockupProps {
  /** Visual size of the lockup. */
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Logo height per size tier (applies to both the per-hackathon logo and the
// default AWS mark). object-contain preserves each image's aspect ratio.
const LOGO_HEIGHT: Record<NonNullable<BrandLockupProps["size"]>, string> = {
  sm: "h-8",
  md: "h-10",
  lg: "h-14",
};

/**
 * Brand lockup: shows the selected hackathon's own logo when set, otherwise
 * falls back to the generic AWS logo.
 */
const BrandLockup: React.FC<BrandLockupProps> = ({ size = "md", className = "" }) => {
  const { currentHackathon } = useCurrentHackathon();
  const logoUrl = currentHackathon?.logo_url;
  const h = LOGO_HEIGHT[size];

  return (
    <div
      className={`flex items-center gap-3 ${className}`}
      role="img"
      aria-label={logoUrl ? (currentHackathon?.name || "Hackathon logo") : "AWS Hackathon"}
    >
      <img
        src={logoUrl || "/aws-logo.svg"}
        alt={logoUrl ? (currentHackathon?.name || "Hackathon") : "AWS"}
        className={`${h} w-auto object-contain`}
      />
    </div>
  );
};

export default BrandLockup;
