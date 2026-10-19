const ONEMAP_BASE = "https://www.onemap.gov.sg";

export interface OneMapSearchResult {
  SEARCHVAL: string;
  BLK_NO: string;
  ROAD_NAME: string;
  BUILDING: string;
  ADDRESS: string;
  POSTAL: string;
  X: string;
  Y: string;
  LATITUDE: string;
  LONGITUDE: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

interface DistResult extends OneMapSearchResult {
  _dist: number;
}

export async function searchAddress(query: string): Promise<OneMapSearchResult[]> {
  const res = await fetch(
    `${ONEMAP_BASE}/api/common/elastic/search?searchVal=${encodeURIComponent(query)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}

export async function searchNearby(
  mid: LatLng,
  category: string,
  radiusKm: number = 2
): Promise<OneMapSearchResult[]> {
  const res = await fetch(
    `${ONEMAP_BASE}/api/common/elastic/search?searchVal=${encodeURIComponent(category)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`
  );
  if (!res.ok) return [];
  const data = await res.json();
  const results: OneMapSearchResult[] = data.results || [];

  // Filter by distance from the group's midpoint, then sort nearest-first
  const seen = new Set<string>();
  const out: OneMapSearchResult[] = [];
  for (const r of results) {
    if (!r.LATITUDE || !r.LONGITUDE) continue;
    const key = `${r.LATITUDE}-${r.LONGITUDE}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const dist = getDistance(mid.lat, mid.lng, parseFloat(r.LATITUDE), parseFloat(r.LONGITUDE));
    if (dist <= radiusKm) {
      out.push({ ...r, _dist: dist });
    }
  }

  return (out as DistResult[])
    .sort((a, b) => a._dist - b._dist)
    .slice(0, 15)
    .map(({ _dist, ...rest }) => rest as OneMapSearchResult);
}

export function calculateMidpoint(locations: LatLng[]): LatLng {
  if (locations.length === 0) return { lat: 1.3521, lng: 103.8198 }; // Singapore center
  if (locations.length === 1) return locations[0];

  // Spherical averaging: correct near the equator and handles
  // antipodal-free location sets better than plain lat/lng averaging
  let x = 0, y = 0, z = 0;
  for (const l of locations) {
    const lat = (l.lat * Math.PI) / 180;
    const lng = (l.lng * Math.PI) / 180;
    x += Math.cos(lat) * Math.cos(lng);
    y += Math.cos(lat) * Math.sin(lng);
    z += Math.sin(lat);
  }
  const n = locations.length;
  x /= n; y /= n; z /= n;
  const hyp = Math.sqrt(x * x + y * y);
  return {
    lat: (Math.atan2(z, hyp) * 180) / Math.PI,
    lng: (Math.atan2(y, x) * 180) / Math.PI,
  };
}

export function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const ONEMAP_TILE_URL = "https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png";
