export interface ShareTarget {
  id: "whatsapp" | "telegram" | "copy";
  label: string;
}

export function buildShareMessage(sessionUrl: string, placeName?: string): string {
  if (placeName) {
    return `We're eating at ${placeName}! See the details on meet2eat: ${sessionUrl}`;
  }
  return `Help us pick where to eat! Add your location and vote here: ${sessionUrl}`;
}

export function whatsappUrl(sessionUrl: string, placeName?: string): string {
  return `https://wa.me/?text=${encodeURIComponent(buildShareMessage(sessionUrl, placeName))}`;
}

export function telegramUrl(sessionUrl: string, placeName?: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(sessionUrl)}&text=${encodeURIComponent(
    placeName ? `We're eating at ${placeName}!` : "Help us pick where to eat!"
  )}`;
}

export function googleMapsDirectionsUrl(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  mode: "walking" | "transit" = "walking"
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=${mode}`;
}
