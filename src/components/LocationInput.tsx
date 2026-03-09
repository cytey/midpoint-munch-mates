import { useState } from "react";
import { MapPin, Search, Loader2, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchAddress, type LatLng, type OneMapSearchResult } from "@/lib/onemap";

interface LocationInputProps {
  onLocationSelect: (location: LatLng, label: string) => void;
}

export function LocationInput({ onLocationSelect }: LocationInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OneMapSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await searchAddress(query);
      setResults(res.slice(0, 5));
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationSelect(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          "My Current Location"
        );
        setGeoLoading(false);
      },
      () => setGeoLoading(false)
    );
  };

  const selectResult = (r: OneMapSearchResult) => {
    onLocationSelect(
      { lat: parseFloat(r.LATITUDE), lng: parseFloat(r.LONGITUDE) },
      r.SEARCHVAL || r.ADDRESS
    );
    setResults([]);
    setQuery("");
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        onClick={handleGeolocate}
        disabled={geoLoading}
        className="w-full gradient-accent text-accent-foreground font-display font-bold"
      >
        {geoLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Navigation className="w-4 h-4 mr-2" />
        )}
        Share My Location
      </Button>

      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <div className="flex-1 h-px bg-border" />
        <span>or search</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Search address or postal code..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="font-body"
        />
        <Button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          variant="outline"
          size="icon"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="rounded-lg border bg-card shadow-card overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => selectResult(r)}
              className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-start gap-3 border-b last:border-b-0"
            >
              <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="font-display font-semibold text-sm">{r.SEARCHVAL || r.BUILDING}</p>
                <p className="text-xs text-muted-foreground">{r.ADDRESS}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
