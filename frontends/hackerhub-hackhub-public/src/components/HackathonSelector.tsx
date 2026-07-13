import React from "react";
import { useCurrentHackathon } from "@/contexts/CurrentHackathonContext";
import { getHackathonLabel } from "@/types/hackathon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HackathonSelectorProps {
  className?: string;
}

/**
 * Tenant selector. Renders only when the participant belongs to more than one
 * hackathon; with a single hackathon it is auto-selected silently and nothing
 * is shown.
 */
const HackathonSelector: React.FC<HackathonSelectorProps> = ({ className }) => {
  const { hackathons, currentHackathonId, setCurrentHackathonId } =
    useCurrentHackathon();

  if (!hackathons || hackathons.length <= 1) {
    return null;
  }

  return (
    <Select
      value={currentHackathonId ?? undefined}
      onValueChange={(value) => setCurrentHackathonId(value)}
    >
      <SelectTrigger className={className ?? "w-[220px]"}>
        <SelectValue placeholder="Select a hackathon" />
      </SelectTrigger>
      <SelectContent>
        {hackathons.map((h) => (
          <SelectItem key={h.hackathon_id} value={h.hackathon_id}>
            {getHackathonLabel(h)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default HackathonSelector;
