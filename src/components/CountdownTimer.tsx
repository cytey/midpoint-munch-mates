import { useEffect, useState } from "react";
import { Timer, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Session } from "@/lib/session";

interface CountdownTimerProps {
  session: Session;
  onStart: (minutes: number) => void;
  canStart: boolean;
}

const OPTIONS = [5, 10, 15];

export function CountdownTimer({ session, onStart, canStart }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!session.voteDeadlineAt) {
      setRemaining(null);
      return;
    }
    const tick = () => {
      const ms = new Date(session.voteDeadlineAt).getTime() - Date.now();
      setRemaining(Math.max(0, ms));
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [session.voteDeadlineAt]);

  if (session.status !== "voting") return null;

  if (!session.voteDeadlineAt) {
    if (!canStart) return null;
    return (
      <div className="flex items-center gap-2 mb-4">
        <Timer className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Set a deadline:</span>
        {OPTIONS.map((m) => (
          <Button
            key={m}
            size="sm"
            variant="outline"
            onClick={() => onStart(m)}
            className="font-display"
          >
            {m} min
          </Button>
        ))}
      </div>
    );
  }

  const totalSeconds = Math.floor((remaining ?? 0) / 1000);
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  const urgent = totalSeconds < 60;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 mb-4 border font-display font-bold ${
        urgent ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-card text-foreground"
      }`}
    >
      <Timer className={`w-4 h-4 ${urgent ? "animate-pulse" : ""}`} />
      Voting ends in {mm}:{ss}
    </div>
  );
}
