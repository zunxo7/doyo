import { HttpError } from "./auth.ts";

export type LngLat = [number, number];

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const PLACES_URL = "https://places.googleapis.com/v1";
const GEO_ORIGIN = process.env.GEO_ORIGIN ?? "";
const GEO_STYLE = process.env.GEO_STYLE ?? "";
const MAP_PATHS = /^\/(styles|data|fonts)\//;
const SEARCH_BIAS = { rectangle: { low: { latitude: 23.5, longitude: 60.8 }, high: { latitude: 37.2, longitude: 77.9 } } };
// Keeps a public demo from running up the shared Google key.
const GOOGLE_DAILY_CAP = 2000;
const POLYLINE_PRECISION = 1e6;
const PLUS_CODE = /\b[2-9CFGHJMPQRVWX]{4,8}\+[2-9CFGHJMPQRVWX]{2,3}\b/;

const cache = new Map<string, unknown>();
let usage = { day: "", calls: 0 };

function spendGoogleCall(): void {
  const day = new Date().toISOString().slice(0, 10);
  if (usage.day !== day) usage = { day, calls: 0 };
  if (++usage.calls > GOOGLE_DAILY_CAP) throw new HttpError(429, "Address search is busy. Try again tomorrow.");
}

async function google<T>(cacheKey: string, url: string, init: RequestInit = {}): Promise<T> {
  if (cache.has(cacheKey)) return cache.get(cacheKey) as T;
  spendGoogleCall();
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new HttpError(503, "Address lookup is unavailable.");
  const data = (await response.json()) as T;
  cache.set(cacheKey, data);
  return data;
}

const googleKey = () => process.env.GOOGLE_GEOCODING_KEY ?? "";

export function distanceKm(a: LngLat, b: LngLat): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const h = Math.sin(rad(b[1] - a[1]) / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(rad(b[0] - a[0]) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const key = `rev:${lat.toFixed(5)}:${lon.toFixed(5)}`;
  const data = await google<{ results?: { formatted_address?: string }[] }>(key, `${GEOCODE_URL}?latlng=${lat},${lon}&key=${googleKey()}`);
  const addresses = (data.results ?? []).flatMap(result => result.formatted_address ?? []);
  return addresses.find(address => !PLUS_CODE.test(address)) ?? addresses[0] ?? "";
}

export async function searchPlaces(q: string) {
  const data = await google<{ suggestions?: { placePrediction?: { placeId?: string; text?: { text?: string } } }[] }>(
    `search:${q.toLowerCase()}`,
    `${PLACES_URL}/places:autocomplete`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Goog-Api-Key": googleKey(),
        "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
      },
      body: JSON.stringify({ input: q, regionCode: "PK", includedRegionCodes: ["pk"], locationBias: SEARCH_BIAS }),
    },
  );
  return (data.suggestions ?? []).flatMap(({ placePrediction: place }) =>
    place?.placeId && place.text?.text ? [{ id: place.placeId, placeId: place.placeId, label: place.text.text }] : [],
  );
}

export async function placeDetails(id: string) {
  const data = await google<{ location?: { latitude: number; longitude: number }; formattedAddress?: string }>(
    `place:${id}`,
    `${PLACES_URL}/places/${encodeURIComponent(id)}`,
    { headers: { "X-Goog-Api-Key": googleKey(), "X-Goog-FieldMask": "location,formattedAddress" } },
  );
  if (!data.location) throw new HttpError(404, "That place could not be found.");
  return { id, label: data.formattedAddress ?? "", coordinates: [data.location.longitude, data.location.latitude] as LngLat };
}

function decodePolyline(encoded: string): LngLat[] {
  const points: LngLat[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const next = () => {
    let shift = 0;
    let value = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      value |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return value & 1 ? ~(value >> 1) : value >> 1;
  };
  while (index < encoded.length) {
    lat += next();
    lng += next();
    points.push([lng / POLYLINE_PRECISION, lat / POLYLINE_PRECISION]);
  }
  return points;
}

export async function route(from: LngLat, to: LngLat) {
  try {
    const response = await fetch(`${GEO_ORIGIN}/route`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        locations: [{ lon: from[0], lat: from[1] }, { lon: to[0], lat: to[1] }],
        costing: "auto",
        directions_options: { units: "kilometers" },
      }),
    });
    if (response.ok) {
      const { trip } = (await response.json()) as { trip: { legs: { shape: string }[]; summary: { time: number; length: number } } };
      return {
        coordinates: trip.legs.flatMap(leg => decodePolyline(leg.shape)),
        durationSeconds: Math.round(trip.summary.time),
        distanceMeters: Math.round(trip.summary.length * 1000),
      };
    }
  } catch {
    // The straight line below keeps tracking alive when routing is down.
  }
  const meters = distanceKm(from, to) * 1000;
  return { coordinates: [from, to], durationSeconds: Math.round(meters / 8), distanceMeters: Math.round(meters) };
}

/** Serves the map through this backend, rewriting links so clients only see `publicBase`. */
export async function mapAsset(assetPath: string, publicBase: string) {
  const upstreamPath = assetPath === "/style.json" ? `/styles/${GEO_STYLE}/style.json` : assetPath;
  if (!MAP_PATHS.test(upstreamPath)) throw new HttpError(404, "Not found.");
  const response = await fetch(`${GEO_ORIGIN}${upstreamPath}`, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new HttpError(response.status, "Map data is unavailable.");
  const type = response.headers.get("content-type") ?? "application/octet-stream";
  if (type.includes("json")) return { type, body: (await response.text()).replaceAll(GEO_ORIGIN, publicBase) };
  return { type, body: Buffer.from(await response.arrayBuffer()) };
}
