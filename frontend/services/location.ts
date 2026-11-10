import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "./apiBase";
import { getCachedAppConfig } from "./appConfig";
import type { LngLat } from "./routing";
import { isWithinServiceAreaCoordinates } from "./serviceArea";

export interface SelectedLocation {
  coordinates: LngLat;
  address: string;
}

export interface PlaceResult {
  id: string;
  label: string;
  coordinates?: LngLat;
  placeId?: string;
}

export type PositionSubscription = { remove: () => void };

export const DEFAULT_LOCATION: SelectedLocation = {
  coordinates: [73.1193632, 33.5311665],
  address: "Bahria Ave, Phase 7 Islamabad, Pakistan",
};

const LAST_LOCATION_KEY = "doyo_last_location";
const REQUEST_TIMEOUT_MS = 6_000;
const MAX_CACHE_ENTRIES = 200;
const LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;
const QUICK_FIX_TIMEOUT_MS = 8_000;
const FRESH_FIX_TIMEOUT_MS = 12_000;
// Pin nudges inside this radius reuse the last address instead of another lookup.
const REVERSE_REUSE_RADIUS_M = 40;
const STORED_LOCATION_REUSE_RADIUS_M = 150;
const METERS_PER_DEGREE = 111_320;
const EARTH_RADIUS_M = 6_371_000;

const addresses = new Map<string, string>();
const searches = new Map<string, PlaceResult[]>();
let lastResolved: SelectedLocation | null = null;

function remember<V>(cache: Map<string, V>, key: string, value: V): void {
  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value as string);
  cache.set(key, value);
}

const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;
const coordinateText = ([lng, lat]: LngLat) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
const toLngLat = ({ coords }: Location.LocationObject): LngLat => [coords.longitude, coords.latitude];

async function fetchGeo(path: string, failure: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`${failure} (HTTP ${response.status})`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export function distanceMeters(a: LngLat, b: LngLat): number {
  const latDelta = degreesToRadians(b[1] - a[1]);
  const lngDelta = degreesToRadians(b[0] - a[0]);
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(degreesToRadians(a[1])) * Math.cos(degreesToRadians(b[1])) * Math.sin(lngDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(haversine));
}

// Flat-earth projection, which is accurate enough at city scale.
export function distanceToPolylineMeters(point: LngLat, line: LngLat[]): number {
  const lngScale = Math.cos(degreesToRadians(point[1]));
  const project = ([lng, lat]: LngLat) => [lng * lngScale * METERS_PER_DEGREE, lat * METERS_PER_DEGREE];
  const [px, py] = project(point);
  let nearest = Infinity;

  for (let index = 1; index < line.length; index += 1) {
    const [ax, ay] = project(line[index - 1]);
    const [bx, by] = project(line[index]);
    const segmentX = bx - ax;
    const segmentY = by - ay;
    const lengthSquared = segmentX ** 2 + segmentY ** 2;
    const along = lengthSquared ? ((px - ax) * segmentX + (py - ay) * segmentY) / lengthSquared : 0;
    const clamped = Math.min(1, Math.max(0, along));
    nearest = Math.min(nearest, Math.hypot(px - (ax + clamped * segmentX), py - (ay + clamped * segmentY)));
  }
  return nearest;
}

export async function reverseGeocode(coordinates: LngLat): Promise<string> {
  const cacheKey = coordinates.map(value => value.toFixed(4)).join(",");
  const cached = addresses.get(cacheKey);
  if (cached) return cached;
  if (lastResolved && distanceMeters(coordinates, lastResolved.coordinates) < REVERSE_REUSE_RADIUS_M) {
    return lastResolved.address;
  }

  const [lng, lat] = coordinates;
  const data = await fetchGeo(`/api/geocode/reverse?lat=${lat}&lon=${lng}`, "Reverse geocoding failed");
  const address = typeof data?.address === "string" ? data.address.trim() : "";
  if (!address) return coordinateText(coordinates);

  remember(addresses, cacheKey, address);
  lastResolved = { coordinates, address };
  return address;
}

export function createPlacesSessionToken(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function searchPlaces(text: string, _focus?: LngLat, _sessionToken?: string): Promise<PlaceResult[]> {
  const query = text.trim();
  if (!query) return [];
  const cacheKey = query.toLowerCase();
  const cached = searches.get(cacheKey);
  if (cached) return cached;

  const data = await fetchGeo(`/api/geocode/search?q=${encodeURIComponent(query)}`, "Place search failed");
  const results: PlaceResult[] = (data?.results ?? []).filter(
    (place: PlaceResult) => place?.label && (place.placeId || place.coordinates?.length === 2),
  );
  remember(searches, cacheKey, results);
  return results;
}

export async function resolvePlace(result: PlaceResult, _sessionToken?: string): Promise<PlaceResult> {
  if (result.coordinates) return result;
  const placeId = result.placeId ?? result.id;
  const data = await fetchGeo(`/api/geocode/place?id=${encodeURIComponent(placeId)}`, "Place details failed");
  return { ...result, placeId, label: data?.result?.label || result.label, coordinates: data?.result?.coordinates };
}

export async function saveLastLocation(location: SelectedLocation): Promise<void> {
  await SecureStore.setItemAsync(LAST_LOCATION_KEY, JSON.stringify(location)).catch(() => undefined);
}

async function loadLastLocation(): Promise<SelectedLocation | null> {
  try {
    const stored = await SecureStore.getItemAsync(LAST_LOCATION_KEY);
    return stored ? (JSON.parse(stored) as SelectedLocation) : null;
  } catch {
    return null;
  }
}

async function foregroundAllowed(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}

// In the demo every phone is at the demo address, wherever it really is.
function demoPosition(): LngLat | null {
  return getCachedAppConfig().reviewLocation?.coordinates ?? null;
}

function fixWithin(accuracy: Location.Accuracy, timeoutMs: number): Promise<LngLat | null> {
  const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs));
  return Promise.race([Location.getCurrentPositionAsync({ accuracy }).then(toLngLat), timeout]);
}

// Prefers the OS's recent fix because a new one can take a minute indoors.
export async function getCurrentPosition(): Promise<LngLat | null> {
  const demo = demoPosition();
  if (demo) return demo;
  try {
    if (!(await foregroundAllowed())) return null;
    const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS });
    return lastKnown ? toLngLat(lastKnown) : await fixWithin(Location.Accuracy.Low, QUICK_FIX_TIMEOUT_MS);
  } catch {
    return null;
  }
}

export async function getFreshCurrentPosition(): Promise<LngLat | null> {
  const demo = demoPosition();
  if (demo) return demo;
  try {
    if (!(await foregroundAllowed())) return null;
    return await fixWithin(Location.Accuracy.Balanced, FRESH_FIX_TIMEOUT_MS);
  } catch {
    return null;
  }
}

async function watch(
  onPosition: (coordinates: LngLat) => void,
  options: Location.LocationOptions,
): Promise<PositionSubscription | null> {
  const demo = demoPosition();
  if (demo) {
    onPosition(demo);
    return { remove: () => undefined };
  }
  try {
    if (!(await foregroundAllowed())) return null;
    return await Location.watchPositionAsync(options, position => onPosition(toLngLat(position)));
  } catch {
    return null;
  }
}

export function watchPosition(onPosition: (coordinates: LngLat) => void): Promise<PositionSubscription | null> {
  return watch(onPosition, { accuracy: Location.Accuracy.High, timeInterval: 4_000, distanceInterval: 15 });
}

export function watchPositionNavigation(onPosition: (coordinates: LngLat) => void): Promise<PositionSubscription | null> {
  return watch(onPosition, { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 3_000, distanceInterval: 5 });
}

export async function detectCurrentLocation(): Promise<SelectedLocation | null> {
  const coordinates = await getCurrentPosition();
  if (!coordinates) return null;
  if (!isWithinServiceAreaCoordinates(coordinates, getCachedAppConfig())) {
    return { coordinates, address: "Area not available yet" };
  }

  const stored = await loadLastLocation();
  if (stored && distanceMeters(stored.coordinates, coordinates) < STORED_LOCATION_REUSE_RADIUS_M) return stored;

  const address = await reverseGeocode(coordinates).catch(() => coordinateText(coordinates));
  const location = { coordinates, address };
  await saveLastLocation(location);
  return location;
}
