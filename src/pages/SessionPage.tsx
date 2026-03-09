import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Utensils, Users, MapPin, Vote, Bell, Plus, Trash2, Search, Loader2, PartyPopper, Filter, Link2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { LocationInput } from "@/components/LocationInput";
import { ParticipantCard } from "@/components/ParticipantCard";
import { PlaceCard } from "@/components/PlaceCard";
import { MeetMap } from "@/components/MeetMap";
import { CategoryFilter, PLACE_CATEGORIES, type CategoryId } from "@/components/CategoryFilter";
import { useSession } from "@/hooks/useSession";
import { calculateMidpoint, searchNearby, getDistance, type LatLng } from "@/lib/onemap";
import { generateId, type Place } from "@/lib/session";
import { toast } from "sonner";

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const {
    session, loading, loadSession,
    addParticipantToDb, removeParticipantFromDb, setLocationInDb,
    savePlacesToDb, toggleVoteInDb, confirmPlaceInDb,
  } = useSession(sessionId || null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [step, setStep] = useState<"join" | "setup" | "map">("join");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [activeParticipantId, setActiveParticipantId] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<CategoryId[]>(["restaurant", "cafe", "hawker"]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchRadius, setSearchRadius] = useState(2);

  // Load session on mount
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    }
  }, [sessionId, loadSession]);

  // Check if user already joined (localStorage)
  useEffect(() => {
    if (sessionId && session) {
      const storedId = localStorage.getItem(`m2e_user_${sessionId}`);
      if (storedId && session.participants.some((p) => p.id === storedId)) {
        setCurrentUserId(storedId);
        setStep(session.status === "voting" || session.status === "confirmed" ? "map" : "setup");
      }
    }
  }, [sessionId, session]);

  // Auto-switch to map when session moves to voting
  useEffect(() => {
    if (session && (session.status === "voting" || session.status === "confirmed") && currentUserId) {
      setStep("map");
    }
  }, [session?.status, currentUserId]);

  const joinSession = async () => {
    if (!name.trim() || !email.trim() || !sessionId) {
      toast.error("Please enter your name and email");
      return;
    }
    const p = await addParticipantToDb(sessionId, name.trim(), email.trim());
    setCurrentUserId(p.id);
    localStorage.setItem(`m2e_user_${sessionId}`, p.id);
    setStep("setup");
    toast.success("You've joined the session!");
  };

  const addParticipant = async () => {
    if (!newName.trim() || !newEmail.trim() || !sessionId) return;
    await addParticipantToDb(sessionId, newName.trim(), newEmail.trim());
    setNewName("");
    setNewEmail("");
    setAddingParticipant(false);
  };

  const removeParticipant = async (id: string) => {
    if (id === currentUserId) return;
    await removeParticipantFromDb(id);
    if (activeParticipantId === id) setActiveParticipantId(null);
  };

  const setLocation = async (participantId: string, location: LatLng, label: string) => {
    await setLocationInDb(participantId, location, label);
    setActiveParticipantId(null);
    toast.success(`Location set!`);
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/session/${sessionId}`;
    navigator.clipboard.writeText(url);
    toast.success("Share link copied to clipboard!");
  };

  const findMeetingPoint = async () => {
    if (!session || !sessionId) return;
    const located = session.participants.filter((p) => p.location);
    if (located.length < 2) {
      toast.error("At least 2 participants need locations set");
      return;
    }
    if (selectedCategories.length === 0) {
      toast.error("Please select at least one category");
      return;
    }

    const mid = calculateMidpoint(located.map((p) => p.location!));
    setSearchingPlaces(true);

    try {
      const categoriesToSearch = selectedCategories.map(
        (id) => PLACE_CATEGORIES.find((c) => c.id === id)?.label || id
      );
      const allResults = await Promise.all(
        categoriesToSearch.map((cat) => searchNearby(mid.lat, mid.lng, cat, searchRadius))
      );

      const seen = new Set<string>();
      const places: Place[] = [];
      allResults.flat().forEach((r) => {
        const key = `${r.LATITUDE}-${r.LONGITUDE}`;
        if (!seen.has(key)) {
          seen.add(key);
          const placeLat = parseFloat(r.LATITUDE);
          const placeLng = parseFloat(r.LONGITUDE);
          places.push({
            id: generateId(),
            name: r.SEARCHVAL || r.BUILDING || "Unknown",
            address: r.ADDRESS,
            lat: placeLat,
            lng: placeLng,
            votes: [],
            distanceKm: getDistance(mid.lat, mid.lng, placeLat, placeLng),
          });
        }
      });

      const sliced = places.slice(0, 12);
      await savePlacesToDb(sessionId, sliced, mid);
      setStep("map");
    } catch {
      toast.error("Failed to search nearby places");
    }
    setSearchingPlaces(false);
  };

  const votePlace = async (placeId: string) => {
    if (!sessionId || !currentUserId) return;
    await toggleVoteInDb(sessionId, placeId, currentUserId);
  };

  const confirmPlace = async () => {
    if (!session || !sessionId) return;
    const topPlace = [...session.places].sort((a, b) => b.votes.length - a.votes.length)[0];
    if (!topPlace || topPlace.votes.length === 0) {
      toast.error("No votes yet!");
      return;
    }
    await confirmPlaceInDb(sessionId, topPlace.id);
    toast.success(`${topPlace.name} confirmed! 🎉`, { duration: 5000 });
  };

  if (loading && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <p className="text-lg font-display text-muted-foreground">Session not found</p>
        <Button onClick={() => navigate("/")} className="mt-4 font-display">Go Home</Button>
      </div>
    );
  }

  // JOIN step
  if (step === "join") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md w-full">
          <div className="w-20 h-20 rounded-3xl gradient-primary shadow-warm mx-auto mb-6 flex items-center justify-center">
            <Utensils className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-display font-extrabold text-foreground mb-3">
            meet<span className="text-primary">2</span>eat
          </h1>
          <p className="text-muted-foreground font-body text-lg mb-2">You've been invited to join a session!</p>
          <p className="text-sm text-muted-foreground mb-6">Session #{session.id} · {session.participants.length} participant(s)</p>

          <div className="space-y-3 text-left bg-card rounded-2xl p-6 shadow-card border">
            <h2 className="font-display font-bold text-lg mb-4">Join Session</h2>
            <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="font-body" />
            <Input placeholder="Your email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="font-body" />
            <Button onClick={joinSession} className="w-full gradient-primary text-primary-foreground font-display font-bold text-base h-12 shadow-warm">
              Join Session
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // SETUP step
  if (step === "setup") {
    const locatedCount = session.participants.filter((p) => p.location).length;

    return (
      <div className="min-h-screen px-4 py-8 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Utensils className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-xl">meet<span className="text-primary">2</span>eat</h1>
              <p className="text-xs text-muted-foreground">Session #{session.id}</p>
            </div>
          </div>

          {/* Share link */}
          <div className="flex items-center gap-2 mb-6 p-3 rounded-xl border bg-card shadow-card">
            <Link2 className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground truncate flex-1 font-body">
              {window.location.origin}/session/{sessionId}
            </p>
            <Button size="sm" variant="outline" onClick={copyShareLink} className="shrink-0">
              <Copy className="w-3.5 h-3.5 mr-1" /> Copy
            </Button>
          </div>

          <h2 className="font-display font-bold text-lg mb-4">
            <Users className="w-5 h-5 inline mr-2 text-primary" />
            Participants ({session.participants.length})
          </h2>

          <div className="space-y-2 mb-4">
            {session.participants.map((p) => (
              <div key={p.id} className="relative group">
                <div className="cursor-pointer" onClick={() => !p.location && setActiveParticipantId(p.id)}>
                  <ParticipantCard participant={p} />
                </div>
                {p.id !== currentUserId && (
                  <button
                    onClick={() => removeParticipant(p.id)}
                    className="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <AnimatePresence>
            {activeParticipantId && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4 p-4 rounded-xl border bg-card shadow-card">
                <p className="text-sm font-display font-bold mb-3">
                  📍 Set location for {session.participants.find((p) => p.id === activeParticipantId)?.name}
                </p>
                <LocationInput onLocationSelect={(loc, label) => setLocation(activeParticipantId, loc, label)} />
              </motion.div>
            )}
          </AnimatePresence>

          {addingParticipant ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl border bg-card shadow-card mb-4 space-y-3">
              <Input placeholder="Friend's name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <Input placeholder="Friend's email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={addParticipant} className="flex-1 gradient-primary text-primary-foreground font-display font-bold">Add</Button>
                <Button variant="outline" onClick={() => setAddingParticipant(false)}>Cancel</Button>
              </div>
            </motion.div>
          ) : (
            <Button variant="outline" className="w-full mb-6 font-display" onClick={() => setAddingParticipant(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Participant
            </Button>
          )}

          <div className="space-y-3">
            <Button type="button" variant="outline" onClick={() => setShowFilters(!showFilters)} className="w-full font-display">
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? "Hide Filters" : "Show Filters"} ({selectedCategories.length} selected)
            </Button>

            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="p-4 rounded-xl border bg-card shadow-card">
                  <p className="text-sm font-display font-bold mb-3">🍴 What are you looking for?</p>
                  <CategoryFilter selected={selectedCategories} onChange={setSelectedCategories} />
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-display font-bold">📍 Search Radius</p>
                      <span className="text-sm font-display font-semibold text-primary">{searchRadius} km</span>
                    </div>
                    <Slider value={[searchRadius]} onValueChange={(v) => setSearchRadius(v[0])} min={1} max={5} step={0.5} className="w-full" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>1 km</span>
                      <span>5 km</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              onClick={findMeetingPoint}
              disabled={locatedCount < 2 || searchingPlaces || selectedCategories.length === 0}
              className="w-full gradient-primary text-primary-foreground font-display font-bold text-base h-12 shadow-warm disabled:opacity-50"
            >
              {searchingPlaces ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Finding places...</>
              ) : (
                <><Search className="w-4 h-4 mr-2" /> Find Meeting Point ({locatedCount}/{session.participants.length} located)</>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // MAP & VOTING
  if (step === "map" && session.midpoint) {
    const isConfirmed = session.status === "confirmed";

    return (
      <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Utensils className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="font-display font-extrabold text-xl">meet<span className="text-primary">2</span>eat</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyShareLink} className="font-display">
                <Copy className="w-3.5 h-3.5 mr-1" /> Share
              </Button>
              <Button variant="outline" size="sm" onClick={() => setStep("setup")} className="font-display">← Back</Button>
            </div>
          </div>

          {isConfirmed && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl gradient-accent p-4 mb-4 text-accent-foreground flex items-center gap-3">
              <PartyPopper className="w-6 h-6 shrink-0" />
              <div>
                <p className="font-display font-bold">It's confirmed!</p>
                <p className="text-sm opacity-90">
                  {session.places.find((p) => p.id === session.confirmedPlaceId)?.name} — Everyone has been notified!
                </p>
              </div>
            </motion.div>
          )}

          <MeetMap center={session.midpoint} participants={session.participants} places={session.places} midpoint={session.midpoint} />

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-lg">
                {isConfirmed ? "🎉 Confirmed Spot" : "📍 Nearby Places — Vote!"}
              </h2>
              {!isConfirmed && (
                <Button onClick={confirmPlace} size="sm" className="gradient-accent text-accent-foreground font-display font-bold">
                  <Bell className="w-3.5 h-3.5 mr-1.5" /> Confirm Top
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {[...session.places]
                .sort((a, b) => b.votes.length - a.votes.length)
                .map((place) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    currentUserId={currentUserId || ""}
                    onVote={votePlace}
                    isConfirmed={session.confirmedPlaceId === place.id}
                  />
                ))}
            </div>

            {session.places.length === 0 && (
              <p className="text-center text-muted-foreground py-8 font-body">
                No places found nearby. Try adjusting participant locations.
              </p>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
