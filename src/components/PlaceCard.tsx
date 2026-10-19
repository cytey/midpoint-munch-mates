import { ThumbsUp, MapPin, Navigation, Crown, SquareArrowOutUpRight } from "lucide-react";
import { Place, Participant } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { googleMapsDirectionsUrl } from "@/lib/share";

interface PlaceCardProps {
  place: Place;
  currentUserId: string;
  participants: Participant[];
  myLocation: { lat: number; lng: number } | null;
  onVote: (placeId: string) => void;
  onConfirm?: (placeId: string) => void;
  isConfirmed?: boolean;
  isWinner?: boolean;
}

export function PlaceCard({
  place,
  currentUserId,
  participants,
  myLocation,
  onVote,
  onConfirm,
  isConfirmed,
  isWinner,
}: PlaceCardProps) {
  const hasVoted = place.votes.includes(currentUserId);

  const formatDistance = (km?: number) => {
    if (km === undefined) return null;
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  const voterNames = place.votes
    .map((id) => participants.find((p) => p.id === id)?.name)
    .filter((n): n is string => Boolean(n));
  const voterSummary =
    voterNames.length === 0
      ? null
      : voterNames.length <= 3
      ? voterNames.join(", ")
      : `${voterNames.slice(0, 3).join(", ")} +${voterNames.length - 3} more`;

  const handleDirections = () => {
    // With the viewer's location: a real route. Without: just show the place.
    const url = myLocation
      ? googleMapsDirectionsUrl(myLocation, { lat: place.lat, lng: place.lng })
      : `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
    window.open(url, "_blank", "noopener");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 transition-all ${
        isConfirmed || isWinner
          ? "ring-2 ring-teal bg-teal/5 border-teal/30"
          : hasVoted
          ? "ring-2 ring-primary/30 bg-primary/5 border-primary/20"
          : "bg-card shadow-card"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {(isConfirmed || isWinner) && (
              <span className="inline-flex items-center gap-1 text-xs font-display font-bold text-teal">
                <Crown className="w-3.5 h-3.5" />
                {isConfirmed ? "Confirmed" : "Winner"}
              </span>
            )}
            <h4 className="font-display font-bold text-sm truncate">{place.name}</h4>
          </div>
          <div className="flex items-center gap-1 mt-1 text-muted-foreground">
            <MapPin className="w-3 h-3 shrink-0" />
            <p className="text-xs truncate">{place.address}</p>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            {place.distanceKm !== undefined && (
              <span className="text-xs font-display font-semibold text-primary">
                {formatDistance(place.distanceKm)} from midpoint
              </span>
            )}
            <button
              onClick={handleDirections}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <SquareArrowOutUpRight className="w-3.5 h-3.5" />
              Directions
            </button>
          </div>
          {voterSummary && (
            <p className="text-xs text-muted-foreground mt-1.5 truncate">
              Voted by {voterSummary}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <Button
            size="sm"
            variant={hasVoted ? "default" : "outline"}
            onClick={() => onVote(place.id)}
            className={`gap-1.5 ${hasVoted ? "gradient-primary text-primary-foreground" : ""}`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>{place.votes.length}</span>
          </Button>
          {isWinner && onConfirm && !isConfirmed && (
            <Button
              size="sm"
              onClick={() => onConfirm(place.id)}
              className="gradient-accent text-accent-foreground font-display font-bold"
            >
              Confirm this
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
