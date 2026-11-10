import { AgCharts } from "ag-charts-enterprise";

/**
 * Every chart Studio draws, including the ones Doyo adds, animates its own parts: bars grow, lines
 * draw, slices sweep, and values glide to new numbers when a booking changes them. Studio creates
 * its charts through AgCharts, so animation is switched on there.
 */
const ANIMATION = { enabled: true, duration: 900 };
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

type Options = Record<string, unknown>;
const charts = AgCharts as unknown as Record<"create" | "createGauge", (options: Options, extra?: unknown) => unknown>;
for (const name of ["create", "createGauge"] as const) {
  const original = charts[name].bind(AgCharts);
  charts[name] = (options, extra) => original(reduced() ? options : { ...options, animation: ANIMATION }, extra);
}
