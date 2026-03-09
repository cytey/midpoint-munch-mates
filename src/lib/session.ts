import { LatLng } from "./onemap";

export interface Participant {
  id: string;
  name: string;
  email: string;
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
}

export interface Session {
  id: string;
  participants: Participant[];
  midpoint: LatLng | null;
  places: Place[];
  confirmedPlaceId: string | null;
  status: "gathering" | "voting" | "confirmed";
}

export function createSession(): Session {
  return {
    id: crypto.randomUUID().slice(0, 8),
    participants: [],
    midpoint: null,
    places: [],
    confirmedPlaceId: null,
    status: "gathering",
  };
}

export function generateId(): string {
  return crypto.randomUUID().slice(0, 8);
}
