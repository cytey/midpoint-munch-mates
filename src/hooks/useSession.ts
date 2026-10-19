import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateId, type Session, type Participant, type Place } from "@/lib/session";
import { type LatLng } from "@/lib/onemap";
import { toast } from "sonner";

export function useSession(sessionId: string | null) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);

  // Load session from DB
  const loadSession = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const [sessRes, partRes, placeRes, voteRes] = await Promise.all([
        supabase.from("sessions").select("*").eq("id", id).single(),
        supabase.from("participants").select("*").eq("session_id", id),
        supabase.from("places").select("*").eq("session_id", id),
        supabase.from("votes").select("*").eq("session_id", id),
      ]);

      if (sessRes.error || !sessRes.data) {
        setLoading(false);
        return null;
      }

      const s = sessRes.data;
      const participants: Participant[] = (partRes.data || []).map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        location: p.location_lat && p.location_lng ? { lat: p.location_lat, lng: p.location_lng } : null,
        locationLabel: p.location_label || undefined,
      }));

      const votes = voteRes.data || [];
      const places: Place[] = (placeRes.data || []).map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
        distanceKm: p.distance_km || undefined,
        votes: votes.filter((v) => v.place_id === p.id).map((v) => v.participant_id),
      }));

      const sess: Session = {
        id: s.id,
        participants,
        midpoint: s.midpoint_lat && s.midpoint_lng ? { lat: s.midpoint_lat, lng: s.midpoint_lng } : null,
        places,
        confirmedPlaceId: s.confirmed_place_id,
        status: s.status as Session["status"],
      };

      setSession(sess);
      setLoading(false);
      return sess;
    } catch {
      setLoading(false);
      return null;
    }
  }, []);

  // Create session in DB
  const createSessionInDb = useCallback(async (): Promise<string> => {
    const id = generateId();
    await supabase.from("sessions").insert({ id, status: "gathering" });
    return id;
  }, []);

  // Add participant to DB
  const addParticipantToDb = useCallback(async (sessId: string, name: string, email: string): Promise<Participant> => {
    const id = generateId();
    const newParticipant: Participant = { id, name, email, location: null };
    
    // Optimistically update local state
    setSession((prev) => prev ? { ...prev, participants: [...prev.participants, newParticipant] } : prev);
    
    await supabase.from("participants").insert({
      id,
      session_id: sessId,
      name,
      email,
    });
    
    return newParticipant;
  }, []);

  // Remove participant from DB
  const removeParticipantFromDb = useCallback(async (participantId: string) => {
    await supabase.from("participants").delete().eq("id", participantId);
  }, []);

  // Set location in DB
  const setLocationInDb = useCallback(async (participantId: string, location: LatLng, label: string) => {
    await supabase.from("participants").update({
      location_lat: location.lat,
      location_lng: location.lng,
      location_label: label,
    }).eq("id", participantId);
  }, []);

  // Save places to DB
  const savePlacesToDb = useCallback(async (sessId: string, places: Place[], midpoint: LatLng) => {
    // Update session with midpoint and status
    await supabase.from("sessions").update({
      midpoint_lat: midpoint.lat,
      midpoint_lng: midpoint.lng,
      status: "voting",
    }).eq("id", sessId);

    // Replace any previous search results so re-searching doesn't accumulate duplicates
    await supabase.from("places").delete().eq("session_id", sessId);

    // Insert places
    const placeRows = places.map((p) => ({
      id: p.id,
      session_id: sessId,
      name: p.name,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      distance_km: p.distanceKm || null,
    }));
    await supabase.from("places").insert(placeRows);
  }, []);

  // Vote/unvote in DB
  const toggleVoteInDb = useCallback(async (sessId: string, placeId: string, participantId: string) => {
    const { data: existing } = await supabase
      .from("votes")
      .select("id")
      .eq("place_id", placeId)
      .eq("participant_id", participantId)
      .maybeSingle();

    if (existing) {
      await supabase.from("votes").delete().eq("id", existing.id);
    } else {
      await supabase.from("votes").insert({
        place_id: placeId,
        participant_id: participantId,
        session_id: sessId,
      });
    }
  }, []);

  // Confirm place in DB
  const confirmPlaceInDb = useCallback(async (sessId: string, placeId: string) => {
    await supabase.from("sessions").update({
      confirmed_place_id: placeId,
      status: "confirmed",
    }).eq("id", sessId);
  }, []);

  // Realtime subscriptions
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` }, () => {
        loadSession(sessionId);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "participants", filter: `session_id=eq.${sessionId}` }, () => {
        loadSession(sessionId);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "places", filter: `session_id=eq.${sessionId}` }, () => {
        loadSession(sessionId);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "votes", filter: `session_id=eq.${sessionId}` }, () => {
        loadSession(sessionId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, loadSession]);

  return {
    session,
    loading,
    loadSession,
    createSessionInDb,
    addParticipantToDb,
    removeParticipantFromDb,
    setLocationInDb,
    savePlacesToDb,
    toggleVoteInDb,
    confirmPlaceInDb,
  };
}
