import { useState } from "react";
import { Loader2, Plus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { searchAddress } from "@/lib/onemap";
import { generateSessionId, type Place } from "@/lib/session";
import { toast } from "sonner";

interface AddPlaceDialogProps {
  onAdd: (place: Place) => void;
}

export function AddPlaceDialog({ onAdd }: AddPlaceDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ name: string; address: string; lat: number; lng: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await searchAddress(query);
      setResults(
        res.slice(0, 5).map((r) => ({
          name: r.SEARCHVAL || r.BUILDING || "Unknown",
          address: r.ADDRESS,
          lat: parseFloat(r.LATITUDE),
          lng: parseFloat(r.LONGITUDE),
        }))
      );
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  const addPlace = (r: { name: string; address: string; lat: number; lng: number }) => {
    const place: Place = {
      id: `custom-${generateSessionId()}`,
      name: r.name,
      address: r.address,
      lat: r.lat,
      lng: r.lng,
      votes: [],
      isCustom: true,
    };
    onAdd(place);
    setOpen(false);
    setQuery("");
    setResults([]);
    toast.success(`"${r.name}" added to the vote!`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="font-display">
          <Plus className="w-4 h-4 mr-2" /> Add a place
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a place the search missed</DialogTitle>
          <DialogDescription>
            Know a great spot nearby? Search for it and add it to the group vote.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            placeholder="Search place name or address..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button type="button" variant="outline" size="icon" onClick={handleSearch} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
          </Button>
        </div>
        {results.length > 0 && (
          <div className="rounded-lg border overflow-hidden max-h-64 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => addPlace(r)}
                className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b last:border-b-0"
              >
                <p className="font-display font-semibold text-sm">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.address}</p>
              </button>
            ))}
          </div>
        )}
        {query && !loading && results.length === 0 && (
          <p className="text-sm text-muted-foreground">No matches. Try a different name.</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
