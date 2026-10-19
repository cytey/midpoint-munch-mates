import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ONEMAP_TILE_URL, type LatLng } from "@/lib/onemap";
import type { Participant, Place } from "@/lib/session";

interface MeetMapProps {
  center: LatLng;
  participants: Participant[];
  places: Place[];
  midpoint: LatLng | null;
}

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const participantIcon = new L.DivIcon({
  html: `<div style="background: linear-gradient(135deg, hsl(16,85%,58%), hsl(35,90%,60%)); width:28px; height:28px; border-radius:50%; border:3px solid white; box-shadow:0 2px 8px rgba(0,0,0,0.2);"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  className: "",
});

const midpointIcon = new L.DivIcon({
  html: `<div style="background: hsl(160,50%,45%); width:36px; height:36px; border-radius:50%; border:4px solid white; box-shadow:0 2px 12px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"/></svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  className: "",
});

const placeIcon = new L.DivIcon({
  html: `<div style="background: hsl(35,90%,60%); width:24px; height:24px; border-radius:6px; border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.15); display:flex; align-items:center; justify-content:center;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  className: "",
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function MeetMap({ center, participants, places, midpoint }: MeetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const map = L.map(mapRef.current).setView([center.lat, center.lng], 13);
    mapInstanceRef.current = map;

    L.tileLayer(ONEMAP_TILE_URL, {
      detectRetina: true,
      maxZoom: 19,
      minZoom: 11,
      attribution: '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:20px;width:20px;"/> OneMap | Map data &copy; contributors, <a href="https://www.sla.gov.sg">SLA</a>',
    }).addTo(map);

    // Add participant markers
    participants.forEach((p) => {
      if (p.location) {
        L.marker([p.location.lat, p.location.lng], { icon: participantIcon })
          .addTo(map)
          .bindPopup(`<b>${escapeHtml(p.name)}</b><br/>${escapeHtml(p.locationLabel || "Location set")}`);
      }
    });

    // Add midpoint
    if (midpoint) {
      L.marker([midpoint.lat, midpoint.lng], { icon: midpointIcon })
        .addTo(map)
        .bindPopup("<b>Meeting Point</b><br/>Midpoint of all participants");
    }

    // Add place markers
    places.forEach((pl) => {
      L.marker([pl.lat, pl.lng], { icon: placeIcon })
        .addTo(map)
        .bindPopup(`<b>${escapeHtml(pl.name)}</b><br/>${escapeHtml(pl.address)}<br/>Votes: ${pl.votes.length}`);
    });

    // Fit bounds if there are markers
    const allPoints: L.LatLngExpression[] = [
      ...participants.filter((p) => p.location).map((p) => [p.location!.lat, p.location!.lng] as L.LatLngExpression),
      ...(midpoint ? [[midpoint.lat, midpoint.lng] as L.LatLngExpression] : []),
      ...places.map((pl) => [pl.lat, pl.lng] as L.LatLngExpression),
    ];

    if (allPoints.length > 1) {
      map.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40] });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [center, participants, places, midpoint]);

  return (
    <div
      ref={mapRef}
      className="w-full h-[350px] sm:h-[450px] rounded-2xl overflow-hidden shadow-card border"
    />
  );
}
