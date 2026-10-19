import { generateCreatorKey, generateSessionId, isValidSessionId } from "./ids";
import { type LatLng } from "./onemap";

export interface Participant {
  id: string;
  name: string;
  location: LatLng | null;
  locationLabel?: string;
}

export interface Place {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  votes: string[]; // participant ids
  distanceKm?: number; // distance from midpoint
  isCustom?: boolean; // added by a participant rather than search
}

export interface Session {
  id: string;
  participants: Participant[];
  midpoint: LatLng | null;
  places: Place[];
  confirmedPlaceId: string | null;
  status: "gathering" | "voting" | "confirmed";
  creatorKey: string | null;
  voteDeadlineAt: string | null;
}

export function createEmptySession(): Session {
  return {
    id: generateSessionId(),
    participants: [],
    midpoint: null,
    places: [],
    confirmedPlaceId: null,
    status: "gathering",
    creatorKey: generateCreatorKey(),
    voteDeadlineAt: null,
  };
}

export { generateCreatorKey, generateSessionId, isValidSessionId };
