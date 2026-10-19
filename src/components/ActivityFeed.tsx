import { useMemo } from "react";
import { Activity } from "lucide-react";
import { VoteRecord } from "@/hooks/useSession";
import { Participant, Place } from "@/lib/session";

interface ActivityFeedProps {
  voteRecords: VoteRecord[];
  participants: Participant[];
  places: Place[];
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function ActivityFeed({ voteRecords, participants, places }: ActivityFeedProps) {
  const recent = useMemo(() => {
    return [...voteRecords]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3)
      .map((v) => ({
        id: `${v.placeId}-${v.participantId}`,
        name: participants.find((p) => p.id === v.participantId)?.name || "Someone",
        place: places.find((pl) => pl.id === v.placeId)?.name || "a place",
        createdAt: v.createdAt,
      }))
      .filter((a) => Date.now() - new Date(a.createdAt).getTime() < 60 * 60 * 1000);
  }, [voteRecords, participants, places]);

  if (recent.length === 0) return null;

  return (
    <div className="rounded-xl border bg-muted/40 px-4 py-3 mb-4">
      <p className="text-xs font-display font-bold text-muted-foreground mb-1.5 flex items-center gap-1.5">
        <Activity className="w-3.5 h-3.5" /> Latest activity
      </p>
      <ul className="space-y-1">
        {recent.map((a) => (
          <li key={a.id} className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{a.name}</span> voted for{" "}
            <span className="font-semibold text-foreground">{a.place}</span>{" "}
            <span className="opacity-70">· {timeAgo(a.createdAt)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
