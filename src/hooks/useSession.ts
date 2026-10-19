import { useState, useEffect, useCallback, useRef } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { generateCreatorKey, generateSessionId, type Session, type Participant, type Place } from "@/lib/session";
import { type LatLng } from "@/lib/onemap";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// A delete/update of a participant must carry the browser's secret creator
// key, checked by the database rules. supabase-js has no per-request header
// API, so build a throwaway client with the header attached.
function clientWithCreatorKey(key: string | null): SupabaseClient {
  if (!key) return supabase;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { "x-creator-key": key } },
  });
}

export function useSession(sessionId: string | null) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);

  // Throttle realtime-triggered reloads: several events in one tick reload once
  const reloadThrottleRef = useRef(0);
  const reloadPendingRef = useRef(false);

  const loadSession = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const [sessRes, partRes, placeRes, voteRes] = await Promise.all([
        supabase.from("sessions").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("participants")
          .select("id, session_id, name, location_lat, location_lng, location_label, created_at")
          .eq("session_id", id),
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
        location:
          p.location_lat != null && p.location_lng != null
            ? { lat: p.location_lat, lng: p.location_lng }
            : null,
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
        midpoint:
          s.midpoint_lat != null && s.midpoint_lng != null
            ? { lat: s.midpoint_lat, lng: s.midpoint_lng }
            : null,
        places,
        confirmedPlaceId: s.confirmed_place_id,
        status: s.status as Session["status"],
        creatorKey: localStorage.getItem(`m2e_creator_${s.id}`),
      };

      setSession(sess);
      setLoading(false);
      return sess;
    } catch {
      setLoading(false);
      return null;
    }
  }, []);

  // Realtime-triggered reload, throttled to one per second
  const reload = useCallback(
    (id: string) => {
      const now = Date.now();
      if (now - reloadThrottleRef.current < 1000) {
        if (!reloadPendingRef.current) {
          reloadPendingRef.current = true;
          window.setTimeout(() => {
            reloadPendingRef.current = false;
            loadSession(id);
          }, 1000 - (now - reloadThrottleRef.current));
        }
        return;
      }
      reloadThrottleRef.current = now;
      loadSession(id);
    },
    [loadSession]
  );

  // Create session in DB
  const createSessionInDb = useCallback(async (): Promise<string> => {
    const id = generateSessionId();
    await supabase.from("sessions").insert({ id, status: "gathering" });
    return id;
  }, []);

  // Add participant to DB. Caller persists the returned creatorKey.
  const addParticipantToDb = useCallback(
    async (sessId: string, name: string, email: string): Promise<Participant & { creatorKey: string }> => {
      const id = generateSessionId();
      const creatorKey = generateCreatorKey();
      const newParticipant: Participant = { id, name, location: null };

      setSession((prev) => (prev ? { ...prev, participants: [...prev.participants, newParticipant] } : prev));

      await supabase.from("participants").insert({
        id,
        session_id: sessId,
        name,
        email,
        creator_key: creatorKey,
      });

      return { ...newParticipant, creatorKey };
    },
    []
  );

  // Remove participant from DB (checked against the browser's secret key)
  const removeParticipantFromDb = useCallback(async (sessId: string, participantId: string) => {
    const key = localStorage.getItem(`m2e_creator_${sessId}`);
    const client = clientWithCreatorKey(key);
    const { error } = await client.from("participants").delete().eq("id", participantId);
    if (error) throw error;
  }, []);

  // Set location in DB
  const setLocationInDb = useCallback(
    async (sessId: string, participantId: string, location: LatLng, label: string) => {
      const key = localStorage.getItem(`m2e_creator_${sessId}`);
      const client = clientWithCreatorKey(key);
      const { error } = await client
        .from("participants")
        .update({
          location_lat: location.lat,
          location_lng: location.lng,
          location_label: label,
        })
        .eq("id", participantId);
      if (error) throw error;
    },
    []
  );

  // Save places to DB
  const savePlacesToDb = useCallback(async (sessId: string, places: Place[], midpoint: LatLng) => {
    const { error: sessErr } = await supabase
      .from("sessions")
      .update({
        midpoint_lat: midpoint.lat,
        midpoint_lng: midpoint.lng,
        status: "voting",
      })
      .eq("id", sessId);
    if (sessErr) throw sessErr;

    // Replace previous results so re-searching doesn't accumulate duplicates
    const { error: delErr } = await supabase.from("places").delete().eq("session_id", sessId);
    if (delErr) throw delErr;

    const placeRows = places.map((p) => ({
      id: p.id,
      session_id: sessId,
      name: p.name,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      distance_km: p.distanceKm || null,
    }));
    const { error: insErr } = await supabase.from("places").insert(placeRows);
    if (insErr) throw insErr;
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
      const { error } = await supabase.from("votes").delete().eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("votes").insert({
        place_id: placeId,
        participant_id: participantId,
        session_id: sessId,
      });
      if (error) throw error;
    }
  }, []);

  // Confirm place in DB
  const confirmPlaceInDb = useCallback(async (sessId: string, placeId: string) => {
    const { error } = await supabase
      .from("sessions")
      .update({
        confirmed_place_id: placeId,
        status: "confirmed",
      })
      .eq("id", sessId);
    if (error) throw error;
  }, []);

  // Realtime subscriptions
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` }, () =>
        reload(sessionId)
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "participants", filter: `session_id=eq.${sessionId}` }, () =>
        reload(sessionId)
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "places", filter: `session_id=eq.${sessionId}` }, () =>
        reload(sessionId)
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "votes", filter: `session_id=eq.${sessionId}` }, () =>
        reload(sessionId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, reload]);

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
