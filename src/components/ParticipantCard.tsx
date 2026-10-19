import { MapPin, Check, CheckCheck } from "lucide-react";
import { Participant } from "@/lib/session";

interface ParticipantCardProps {
  participant: Participant;
  hasVoted?: boolean;
  showVotedBadge?: boolean;
}

export function ParticipantCard({ participant, hasVoted, showVotedBadge }: ParticipantCardProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card shadow-card border">
      <div className="relative">
        <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-display font-bold text-sm">
          {participant.name.charAt(0).toUpperCase()}
        </div>
        {showVotedBadge && hasVoted && (
          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-teal border-2 border-background flex items-center justify-center">
            <CheckCheck className="w-2.5 h-2.5 text-white" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-sm truncate">{participant.name}</p>
      </div>
      {participant.location ? (
        <div className="flex items-center gap-1 text-teal text-xs font-semibold">
          <Check className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{participant.locationLabel || "Located"}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-muted-foreground text-xs">
          <MapPin className="w-3.5 h-3.5" />
          <span>Pending</span>
        </div>
      )}
    </div>
  );
}
