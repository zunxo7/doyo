import { API_BASE_URL } from "./apiBase";

export const MAP_STYLE_URL = `${API_BASE_URL}/map/style.json`;

export type LngLat = [number, number];

export interface Route {
  coordinates: LngLat[];
  durationSeconds: number;
  distanceMeters: number;
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

const fillTemplate: Translate = (key, params = {}) => key.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ""));

export async function getRoute(from: LngLat, to: LngLat): Promise<Route> {
  const response = await fetch(`${API_BASE_URL}/api/route`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ from, to }),
  });
  if (!response.ok) throw new Error(`Routing failed (HTTP ${response.status})`);
  return (await response.json()) as Route;
}

export function formatEta(seconds: number, t: Translate = fillTemplate): string {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  if (totalMinutes < 60) return t("{min} min", { min: totalMinutes });
  return t("{h}h {m}m", { h: Math.floor(totalMinutes / 60), m: totalMinutes % 60 });
}
