import { useEffect, useMemo, useState } from "react";
import { GeoJSONSource, Layer } from "@maplibre/maplibre-react-native";
import type { LngLat } from "../services/routing";

/** The map image name the worker marker is registered under (see `Images` on the tracking map). */
export const WORKER_MARKER_IMAGE = "worker-marker";

const MARKER_LAYOUT = {
  "icon-image": WORKER_MARKER_IMAGE,
  "icon-size": 0.36,
  "icon-allow-overlap": true,
  "icon-ignore-placement": true,
} as const;

const point = (coordinates: LngLat) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates }, properties: {} });

/** The worker marker as a map symbol: drawn by the map, so it never blinks as it moves. */
export function WorkerSymbol({ id, at }: { id: string; at: LngLat }) {
  const data = useMemo(() => point(at), [at[0], at[1]]);
  return (
    <GeoJSONSource id={id} data={data}>
      <Layer id={`${id}-icon`} type="symbol" layout={MARKER_LAYOUT} />
    </GeoJSONSource>
  );
}

/** Distance in metres between two points, flat-earth; fine across a city. */
function metres([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const x = (lng2 - lng1) * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180)) * 111_320;
  const y = (lat2 - lat1) * 110_540;
  return Math.hypot(x, y);
}

/** Where along the path a share (0 to 1) of its length falls, and the path still ahead of it. */
function alongPath(path: LngLat[], lengths: number[], total: number, share: number): { at: LngLat; ahead: LngLat[] } {
  let remaining = total * share;
  for (let index = 0; index < lengths.length; index++) {
    if (remaining <= lengths[index] || index === lengths.length - 1) {
      const t = lengths[index] ? Math.min(1, remaining / lengths[index]) : 1;
      const [a, b] = [path[index], path[index + 1]];
      const at: LngLat = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      return { at, ahead: [at, ...path.slice(index + 1)] };
    }
    remaining -= lengths[index];
  }
  return { at: path[path.length - 1], ahead: [path[path.length - 1]] };
}

type Props = {
  /** The route exactly as the map draws it, so the worker can only ever be on that line. */
  path: LngLat[];
  durationMs: number;
  lineColor: string;
};

/**
 * The demo worker driving to the customer: the marker walks the drawn route at a steady pace and the
 * line shortens behind it. It runs here, frame by frame, so it cannot drift off the line it follows.
 */
export default function RouteDrive({ path, durationMs, lineColor }: Props) {
  const lengths = useMemo(() => path.slice(1).map((next, index) => metres(path[index], next)), [path]);
  const total = useMemo(() => lengths.reduce((sum, length) => sum + length, 0) || 1, [lengths]);
  const [share, setShare] = useState(0);

  useEffect(() => {
    const start = Date.now();
    let frame = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      setShare(t);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [durationMs]);

  if (path.length < 2) return null;
  const { at, ahead } = alongPath(path, lengths, total, share);
  const line = { type: "Feature" as const, geometry: { type: "LineString" as const, coordinates: ahead }, properties: {} };

  return (
    <>
      <GeoJSONSource id="demo-drive-route" data={line}>
        <Layer
          id="demo-drive-route-line"
          type="line"
          beforeId="place-suburb"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{ "line-color": lineColor, "line-width": 4.5 }}
        />
      </GeoJSONSource>
      <WorkerSymbol id="demo-drive-worker" at={at} />
    </>
  );
}
