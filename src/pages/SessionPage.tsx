import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Utensils, Users, Plus, Trash2, Search, Loader2, PartyPopper, Filter, MapPinned, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LocationInput } from "@/components/LocationInput";
import { ParticipantCard } from "@/components/ParticipantCard";
import { PlaceCard } from "@/components/PlaceCard";
import { MeetMap } from "@/components/MeetMap";
import { CategoryFilter, PLACE_CATEGORIES, type CategoryId } from "@/components/CategoryFilter";
import { ActivityFeed } from "@/components/ActivityFeed";
import { CountdownTimer } from "@/components/CountdownTimer";
import { ShareButtons } from "@/components/ShareButtons";
import { QrCode } from "@/components/QrCode";
import { AddPlaceDialog } from "@/components/AddPlaceDialog";
import { useSession } from "@/hooks/useSession";
import { calculateMidpoint, searchNearby, getDistance, type LatLng } from "@/lib/onemap";
import { generateSessionId, type Place } from "@/lib/session";
import { toast } from "sonner";

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const {
    session, loading, voteRecords, loadSession,
    addParticipantToDb, removeParticipantFromDb, setLocationInDb,
    savePlacesToDb, toggleVoteInDb, confirmPlaceInDb,
    addCustomPlaceToDb, setVoteDeadlineInDb, startRevoteInDb,
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
  const [participantToDelete, setParticipantToDelete] = useState<string | null>(null);

  const sessionUrl = sessionId ? `${window.location.origin}/session/${sessionId}` : "";

  const myLocation = useMemo(() => {
    const me = session?.participants.find((p) => p.id === currentUserId);
    return me?.location || null;
  }, [session, currentUserId]);

  const votedParticipantIds = useMemo(
    () => new Set(session?.places.flatMap((pl) => pl.votes) || []),
    [session]
  );

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
  }, [session, currentUserId]);

  const joinSession = async () => {
    if (!name.trim() || !sessionId) {
      toast.error("Please enter your name to join");
      return;
    }
    const p = await addParticipantToDb(sessionId, name.trim(), email.trim());
    setCurrentUserId(p.id);
    localStorage.setItem(`m2e_user_${sessionId}`, p.id);
    localStorage.setItem(`m2e_creator_${sessionId}`, p.creatorKey);
    setStep("setup");
    toast.success("You've joined the session!");
  };

  const addParticipant = async () => {
    if (!newName.trim() || !sessionId) return;
    await addParticipantToDb(sessionId, newName.trim(), newEmail.trim());
    setNewName("");
    setNewEmail("");
    setAddingParticipant(false);
  };

  const confirmDeleteParticipant = async () => {
    if (!participantToDelete || !sessionId) return;
    await removeParticipantFromDb(sessionId, participantToDelete);
    if (activeParticipantId === participantToDelete) setActiveParticipantId(null);
    setParticipantToDelete(null);
  };

  const setLocation = async (participantId: string, location: LatLng, label: string) => {
    if (!sessionId) return;
    await setLocationInDb(sessionId, participantId, location, label);
    setActiveParticipantId(null);
    toast.success("Location set!");
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
        categoriesToSearch.map((cat) => searchNearby(mid, cat, searchRadius))
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
            id: generateSessionId(),
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

  const startDeadline = async (minutes: number) => {
    if (!sessionId) return;
    try {
      await setVoteDeadlineInDb(sessionId, minutes);
      toast.success(`Voting ends in ${minutes} minutes`);
    } catch {
      toast.error("Could not start the timer");
    }
  };

  const addCustomPlace = async (place: Place) => {
    if (!sessionId) return;
    try {
      await addCustomPlaceToDb(sessionId, place);
      toast.success(`"${place.name}" added to the vote!`);
    } catch {
      toast.error("Could not add the place. The session may have moved on.");
    }
  };

  const handleRevote = async () => {
    if (!sessionId) return;
    try {
      await startRevoteInDb(sessionId);
      toast.success("New round started — vote again!");
    } catch {
      toast.error("Could not start a new round");
    }
  };

  const confirmPlaceById = async (placeId: string) => {
    if (!sessionId || !session) return;
    const place = session.places.find((p) => p.id === placeId);
    if (!place) return;
    try {
      await confirmPlaceInDb(sessionId, placeId);
      toast.success(`${place.name} confirmed!`, { duration: 5000 });
    } catch {
      toast.error("Could not confirm the place");
    }
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

          <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border mb-6 text-left">
            <MapPinned className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground font-body leading-relaxed">
              meet2eat finds the halfway point between everyone in the group, then you all vote on
              where to eat or hang out. Just enter your name, drop your location, and you're in.
            </p>
          </div>

          <div className="space-y-3 text-left bg-card rounded-2xl p-6 shadow-card border">
            <h2 className="font-display font-bold text-lg mb-4">Join Session</h2>
            <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="font-body" />
            <Input placeholder="Your email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="font-body" />
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

          {/* Share + QR */}
          <div className="rounded-xl border bg-card shadow-card p-4 mb-6 space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground truncate flex-1 font-body">
                {sessionUrl}
              </p>
            </div>
            <ShareButtons sessionUrl={sessionUrl} onCopied={() => toast.success("Share link copied to clipboard!")} />
            <div className="flex justify-center pt-1">
              <QrCode value={sessionUrl} size={140} />
            </div>
          </div>

          <h2 className="font-display font-bold text-lg mb-4">
            <Users className="w-5 h-5 inline mr-2 text-primary" />
            Participants ({session.participants.length})
          </h2>

          <div className="space-y-2 mb-4">
            {session.participants.map((p) => (
              <div key={p.id} className="relative group">
                <div className="cursor-pointer" onClick={() => !p.location && setActiveParticipantId(p.id)}>
                  <ParticipantCard
                    participant={p}
                    hasVoted={votedParticipantIds.has(p.id)}
                    showVotedBadge={session.status !== "gathering"}
                  />
                </div>
                {p.id !== currentUserId && (
                  <button
                    onClick={() => setParticipantToDelete(p.id)}
                    aria-label={`Remove ${p.name}`}
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
                  Set location for {session.participants.find((p) => p.id === activeParticipantId)?.name}
                </p>
                <LocationInput onLocationSelect={(loc, label) => setLocation(activeParticipantId, loc, label)} />
              </motion.div>
            )}
          </AnimatePresence>

          {addingParticipant ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl border bg-card shadow-card mb-4 space-y-3">
              <Input placeholder="Friend's name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <Input placeholder="Friend's email (optional)" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
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
                  <p className="text-sm font-display font-bold mb-3">What are you looking for?</p>
                  <CategoryFilter selected={selectedCategories} onChange={setSelectedCategories} />
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-display font-bold">Search Radius</p>
                      <span className="text-sm font-display font-semibold text-primary">{searchRadius} km</span>
                    </div>
                    <Slider value={[searchRadius]} onValueChange={(v) => setSearchRadius(v[0])} min={1} max={10} step={0.5} className="w-full" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>1 km</span>
                      <span>10 km</span>
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

        <AlertDialog open={!!participantToDelete} onOpenChange={(o) => !o && setParticipantToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove participant?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove{" "}
                <span className="font-semibold">
                  {session.participants.find((p) => p.id === participantToDelete)?.name}
                </span>{" "}
                and their location from the session. Their votes are removed too. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteParticipant}>Remove</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // MAP & VOTING
  if (step === "map" && session.midpoint) {
    const isConfirmed = session.status === "confirmed";
    const totalParticipants = session.participants.length;
    const participantsWhoVoted = votedParticipantIds.size;
    const sortedPlaces = [...session.places].sort((a, b) => b.votes.length - a.votes.length);
    const winner = sortedPlaces[0];
    const hasWinner = winner && winner.votes.length > 0;

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
            <ShareButtons sessionUrl={sessionUrl} placeName={isConfirmed ? winner?.name : undefined} compact />
          </div>

          {isConfirmed && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl gradient-accent p-4 mb-4 text-accent-foreground flex items-center gap-3">
              <PartyPopper className="w-6 h-6 shrink-0" />
              <div className="flex-1">
                <p className="font-display font-bold">It's confirmed!</p>
                <p className="text-sm opacity-90">
                  {winner?.name} — Share the link so the whole group sees the result.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevote}
                className="shrink-0 bg-white/20 border-white/30 text-white hover:bg-white/30 font-display"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Re-vote
              </Button>
            </motion.div>
          )}

          {!isConfirmed && (
            <CountdownTimer session={session} onStart={startDeadline} canStart={true} />
          )}

          <MeetMap center={session.midpoint} participants={session.participants} places={session.places} midpoint={session.midpoint} />

          <div className="mt-6">
            {!isConfirmed && (
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-bold text-lg">Nearby Places — Vote!</h2>
                <span className="text-sm font-display font-semibold text-primary">
                  {participantsWhoVoted} of {totalParticipants} voted
                </span>
              </div>
            )}

            {!isConfirmed && <ActivityFeed voteRecords={voteRecords} participants={session.participants} places={session.places} />}

            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">
                {isConfirmed ? "Confirmed Spot" : "Sorted by votes"}
              </p>
              <AddPlaceDialog onAdd={addCustomPlace} />
            </div>

            <div className="space-y-2">
              {sortedPlaces.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  currentUserId={currentUserId || ""}
                  participants={session.participants}
                  myLocation={myLocation}
                  onVote={votePlace}
                  onConfirm={confirmPlaceById}
                  isConfirmed={session.confirmedPlaceId === place.id}
                  isWinner={!isConfirmed && hasWinner && place.id === winner.id}
                />
              ))}
            </div>

            {session.places.length === 0 && (
              <p className="text-center text-muted-foreground py-8 font-body">
                No places found nearby. Try adjusting participant locations.
              </p>
            )}

            {isConfirmed && (
              <Button onClick={handleRevote} variant="outline" className="w-full mt-4 font-display">
                <RefreshCw className="w-4 h-4 mr-2" /> Start another round
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
