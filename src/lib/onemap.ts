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

export async function searchAddress(query: string): Promise<OneMapSearchResult[]> {
  const res = await fetch(
    `${ONEMAP_BASE}/api/common/elastic/search?searchVal=${encodeURIComponent(query)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`
  );
  const data = await res.json();
  return data.results || [];
}

export async function searchNearby(lat: number, lng: number, category: string, radiusKm: number = 2): Promise<OneMapSearchResult[]> {
  // Use OneMap's search with location context
  const res = await fetch(
    `${ONEMAP_BASE}/api/common/elastic/search?searchVal=${encodeURIComponent(category)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`
  );
  const data = await res.json();
  const results: OneMapSearchResult[] = data.results || [];
  
  // Filter by radius from midpoint, then sort by distance
  return results
    .filter((r) => r.LATITUDE && r.LONGITUDE)
    .map((r) => ({
      ...r,
      _dist: getDistance(lat, lng, parseFloat(r.LATITUDE), parseFloat(r.LONGITUDE)),
    }))
    .filter((r) => r._dist <= radiusKm)
    .sort((a, b) => a._dist - b._dist)
    .slice(0, 15)
    .map(({ _dist, ...rest }) => rest as OneMapSearchResult);
}

export function calculateMidpoint(locations: LatLng[]): LatLng {
  if (locations.length === 0) return { lat: 1.3521, lng: 103.8198 }; // Singapore center
  if (locations.length === 1) return locations[0];
  
  const sumLat = locations.reduce((s, l) => s + l.lat, 0);
  const sumLng = locations.reduce((s, l) => s + l.lng, 0);
  return {
    lat: sumLat / locations.length,
    lng: sumLng / locations.length,
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
