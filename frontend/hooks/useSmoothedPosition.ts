import { useEffect, useRef, useState } from "react";
import type { LngLat } from "../services/routing";

/**
 * inDrive-style marker glide: position fixes are sparse, but the marker should
 * move continuously. Each new target is interpolated from wherever the marker
 * currently is over `durationMs`, so sparse updates render as smooth motion
 * instead of teleports.
 *
 * First fix snaps instantly (no glide in from null). ~20fps, and it stops
 * ticking as soon as the target is reached.
 *
 * Cadence: the worker's device posts on services/backgroundLocation.ts
 * INTERVAL_MS = 60s / DISTANCE_M = 150 and the customer receives them over the
 * job channel, so this runs for ~2.8s at most once a minute.
 *
 * Always call this from <SmoothedMarker/>, not from a screen: 20Hz state in a
 * screen re-renders the entire screen ~56 times per fix.
 */
export function useSmoothedPosition(target: LngLat | null, durationMs = 2800): LngLat | null {
  const [smoothed, setSmoothed] = useState<LngLat | null>(target);
  const currentRef = useRef<LngLat | null>(target);
  const frameRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (frameRef.current) clearTimeout(frameRef.current);
    if (!target) {
      currentRef.current = null;
      setSmoothed(null);
      return;
    }

    const from = currentRef.current;
    if (!from) {
      currentRef.current = target;
      setSmoothed(target);
      return;
    }

    const [fromLng, fromLat] = from;
    const [toLng, toLat] = target;
    if (fromLng === toLng && fromLat === toLat) return;

    const startedAt = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - startedAt) / durationMs, 1);
      // ease-out: fast start, gentle settle — reads as natural vehicle motion
      const e = 1 - (1 - t) * (1 - t);
      const next: LngLat = [fromLng + (toLng - fromLng) * e, fromLat + (toLat - fromLat) * e];
      currentRef.current = next;
      setSmoothed(next);
      if (t < 1) frameRef.current = setTimeout(tick, 50);
    };
    tick();

    return () => {
      if (frameRef.current) clearTimeout(frameRef.current);
    };
  }, [target?.[0], target?.[1], durationMs]);

  return smoothed;
}
