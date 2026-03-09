import { ThumbsUp, MapPin, Navigation } from "lucide-react";
import { Place } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface PlaceCardProps {
  place: Place;
  currentUserId: string;
  onVote: (placeId: string) => void;
  isConfirmed?: boolean;
}

export function PlaceCard({ place, currentUserId, onVote, isConfirmed }: PlaceCardProps) {
  const hasVoted = place.votes.includes(currentUserId);

  const formatDistance = (km?: number) => {
    if (km === undefined) return null;
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 transition-all ${
        isConfirmed
          ? "ring-2 ring-teal bg-teal/5 border-teal/30"
          : hasVoted
          ? "ring-2 ring-primary/30 bg-primary/5 border-primary/20"
          : "bg-card shadow-card"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-display font-bold text-sm">{place.name}</h4>
          <div className="flex items-center gap-1 mt-1 text-muted-foreground">
            <MapPin className="w-3 h-3 shrink-0" />
            <p className="text-xs truncate">{place.address}</p>
          </div>
          {place.distanceKm !== undefined && (
            <div className="flex items-center gap-1 mt-1.5">
              <Navigation className="w-3 h-3 text-primary shrink-0" />
              <span className="text-xs font-display font-semibold text-primary">
                {formatDistance(place.distanceKm)} from midpoint
              </span>
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant={hasVoted ? "default" : "outline"}
          onClick={() => onVote(place.id)}
          className={`shrink-0 gap-1.5 ${hasVoted ? "gradient-primary text-primary-foreground" : ""}`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          <span>{place.votes.length}</span>
        </Button>
      </div>
    </motion.div>
  );
}
