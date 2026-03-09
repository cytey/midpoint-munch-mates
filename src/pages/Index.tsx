import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Utensils, Users, MapPin, Vote, Bell, ArrowRight, Plus, Trash2, Search, Loader2, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationInput } from "@/components/LocationInput";
import { ParticipantCard } from "@/components/ParticipantCard";
import { PlaceCard } from "@/components/PlaceCard";
import { MeetMap } from "@/components/MeetMap";
import { createSession, generateId, type Session, type Participant, type Place } from "@/lib/session";
import { calculateMidpoint, searchNearby, type LatLng } from "@/lib/onemap";
import { toast } from "sonner";

const FOOD_CATEGORIES = ["restaurant", "cafe", "hawker", "bar", "food court", "bistro"];

export default function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [step, setStep] = useState<"landing" | "setup" | "map">("landing");
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [activeParticipantId, setActiveParticipantId] = useState<string | null>(null);

  const startSession = () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Please enter your name and email");
      return;
    }
    const s = createSession();
    const user: Participant = { id: generateId(), name: name.trim(), email: email.trim(), location: null };
    s.participants.push(user);
    setSession(s);
    setCurrentUser(user);
    setActiveParticipantId(user.id);
    setStep("setup");
  };

  const addParticipant = () => {
    if (!newName.trim() || !newEmail.trim() || !session) return;
    const p: Participant = { id: generateId(), name: newName.trim(), email: newEmail.trim(), location: null };
    setSession({ ...session, participants: [...session.participants, p] });
    setNewName("");
    setNewEmail("");
    setAddingParticipant(false);
  };

  const removeParticipant = (id: string) => {
    if (!session || id === currentUser?.id) return;
    setSession({ ...session, participants: session.participants.filter((p) => p.id !== id) });
    if (activeParticipantId === id) setActiveParticipantId(null);
  };

  const setLocation = (participantId: string, location: LatLng, label: string) => {
    if (!session) return;
    setSession({
      ...session,
      participants: session.participants.map((p) =>
        p.id === participantId ? { ...p, location, locationLabel: label } : p
      ),
    });
    setActiveParticipantId(null);
    toast.success(`Location set for ${session.participants.find((p) => p.id === participantId)?.name}`);
  };

  const findMeetingPoint = async () => {
    if (!session) return;
    const located = session.participants.filter((p) => p.location);
    if (located.length < 2) {
      toast.error("At least 2 participants need locations set");
      return;
    }

    const mid = calculateMidpoint(located.map((p) => p.location!));
    setSearchingPlaces(true);

    try {
      const allResults = await Promise.all(
        FOOD_CATEGORIES.map((cat) => searchNearby(mid.lat, mid.lng, cat))
      );

      const seen = new Set<string>();
      const places: Place[] = [];
      allResults.flat().forEach((r) => {
        const key = `${r.LATITUDE}-${r.LONGITUDE}`;
        if (!seen.has(key)) {
          seen.add(key);
          places.push({
            id: generateId(),
            name: r.SEARCHVAL || r.BUILDING || "Unknown",
            address: r.ADDRESS,
            lat: parseFloat(r.LATITUDE),
            lng: parseFloat(r.LONGITUDE),
            votes: [],
          });
        }
      });

      setSession({ ...session, midpoint: mid, places: places.slice(0, 12), status: "voting" });
      setStep("map");
    } catch {
      toast.error("Failed to search nearby places");
    }
    setSearchingPlaces(false);
  };

  const votePlace = (placeId: string) => {
    if (!session || !currentUser) return;
    setSession({
      ...session,
      places: session.places.map((p) =>
        p.id === placeId
          ? {
              ...p,
              votes: p.votes.includes(currentUser.id)
                ? p.votes.filter((v) => v !== currentUser.id)
                : [...p.votes, currentUser.id],
            }
          : p
      ),
    });
  };

  const confirmPlace = () => {
    if (!session) return;
    const topPlace = [...session.places].sort((a, b) => b.votes.length - a.votes.length)[0];
    if (!topPlace || topPlace.votes.length === 0) {
      toast.error("No votes yet!");
      return;
    }
    setSession({ ...session, confirmedPlaceId: topPlace.id, status: "confirmed" });
    toast.success(`${topPlace.name} confirmed! Everyone will be notified 🎉`, {
      duration: 5000,
    });
  };

  // LANDING
  if (step === "landing") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-md w-full"
        >
          <div className="w-20 h-20 rounded-3xl gradient-primary shadow-warm mx-auto mb-6 flex items-center justify-center">
            <Utensils className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-foreground mb-3">
            meet<span className="text-primary">2</span>eat
          </h1>
          <p className="text-muted-foreground font-body text-lg mb-8">
            Find the perfect meeting spot for your group. Everyone shares their location, we find the middle ground.
          </p>

          <div className="space-y-3 text-left bg-card rounded-2xl p-6 shadow-card border mb-8">
            <h2 className="font-display font-bold text-lg mb-4">Get Started</h2>
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="font-body"
            />
            <Input
              placeholder="Your email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="font-body"
            />
            <Button
              onClick={startSession}
              className="w-full gradient-primary text-primary-foreground font-display font-bold text-base h-12 shadow-warm"
            >
              Create Session
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { icon: Users, label: "Add Friends" },
              { icon: MapPin, label: "Find Middle" },
              { icon: Vote, label: "Vote & Go" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-xs font-display font-semibold text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // SETUP
  if (step === "setup" && session) {
    const allLocated = session.participants.every((p) => p.location);
    const locatedCount = session.participants.filter((p) => p.location).length;

    return (
      <div className="min-h-screen px-4 py-8 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Utensils className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-xl">
                meet<span className="text-primary">2</span>eat
              </h1>
              <p className="text-xs text-muted-foreground">Session #{session.id}</p>
            </div>
          </div>

          <h2 className="font-display font-bold text-lg mb-4">
            <Users className="w-5 h-5 inline mr-2 text-primary" />
            Participants ({session.participants.length})
          </h2>

          <div className="space-y-2 mb-4">
            {session.participants.map((p) => (
              <div key={p.id} className="relative group">
                <div
                  className="cursor-pointer"
                  onClick={() => !p.location && setActiveParticipantId(p.id)}
                >
                  <ParticipantCard participant={p} />
                </div>
                {p.id !== currentUser?.id && (
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
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-4 rounded-xl border bg-card shadow-card"
              >
                <p className="text-sm font-display font-bold mb-3">
                  📍 Set location for{" "}
                  {session.participants.find((p) => p.id === activeParticipantId)?.name}
                </p>
                <LocationInput
                  onLocationSelect={(loc, label) => setLocation(activeParticipantId, loc, label)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {addingParticipant ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border bg-card shadow-card mb-4 space-y-3"
            >
              <Input
                placeholder="Friend's name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input
                placeholder="Friend's email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={addParticipant} className="flex-1 gradient-primary text-primary-foreground font-display font-bold">
                  Add
                </Button>
                <Button variant="outline" onClick={() => setAddingParticipant(false)}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          ) : (
            <Button
              variant="outline"
              className="w-full mb-6 font-display"
              onClick={() => setAddingParticipant(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Participant
            </Button>
          )}

          <Button
            onClick={findMeetingPoint}
            disabled={locatedCount < 2 || searchingPlaces}
            className="w-full gradient-primary text-primary-foreground font-display font-bold text-base h-12 shadow-warm disabled:opacity-50"
          >
            {searchingPlaces ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Finding places...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Find Meeting Point ({locatedCount}/{session.participants.length} located)
              </>
            )}
          </Button>
        </motion.div>
      </div>
    );
  }

  // MAP & VOTING
  if (step === "map" && session && session.midpoint) {
    const isConfirmed = session.status === "confirmed";

    return (
      <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Utensils className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="font-display font-extrabold text-xl">
                meet<span className="text-primary">2</span>eat
              </h1>
            </div>
            <Button variant="outline" size="sm" onClick={() => setStep("setup")} className="font-display">
              ← Back
            </Button>
          </div>

          {isConfirmed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl gradient-accent p-4 mb-4 text-accent-foreground flex items-center gap-3"
            >
              <PartyPopper className="w-6 h-6 shrink-0" />
              <div>
                <p className="font-display font-bold">It's confirmed!</p>
                <p className="text-sm opacity-90">
                  {session.places.find((p) => p.id === session.confirmedPlaceId)?.name} — Everyone has been notified!
                </p>
              </div>
            </motion.div>
          )}

          <MeetMap
            center={session.midpoint}
            participants={session.participants}
            places={session.places}
            midpoint={session.midpoint}
          />

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-lg">
                {isConfirmed ? "🎉 Confirmed Spot" : "📍 Nearby Places — Vote!"}
              </h2>
              {!isConfirmed && (
                <Button
                  onClick={confirmPlace}
                  size="sm"
                  className="gradient-accent text-accent-foreground font-display font-bold"
                >
                  <Bell className="w-3.5 h-3.5 mr-1.5" />
                  Confirm Top
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
                    currentUserId={currentUser?.id || ""}
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
