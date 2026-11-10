import type { ReactElement } from "react";
import { ViewAnnotation } from "@maplibre/maplibre-react-native";
import { useSmoothedPosition } from "../hooks/useSmoothedPosition";
import type { LngLat } from "../services/routing";

type Props = {
  /** Stable annotation id, as ViewAnnotation requires. */
  id: string;
  /** The raw position to glide towards, or null to hide the marker. */
  target: LngLat | null;
  children: ReactElement;
};

/**
 * A map marker that glides to its target, without dragging its host screen
 * along for the ride.
 *
 * `useSmoothedPosition` steps ~20 times a second for the length of a glide.
 * When the hook was called by the screen, every one of those steps re-rendered
 * the whole screen — ~2,900 lines of CustomerHomeScreen, or ~900 of
 * ActiveJobView — to move one marker a few metres.
 *
 * Holding the hook here means the 20Hz state lives in a leaf: the marker
 * re-renders, the screen does not. Deliberately not wrapped in React.memo —
 * `children` is a fresh element on each parent render, so memo could never
 * bail, and the isolation alone is the whole win.
 */
export default function SmoothedMarker({ id, target, children }: Props) {
  const position = useSmoothedPosition(target);
  if (!position) return null;

  return (
    <ViewAnnotation id={id} lngLat={position}>
      {children}
    </ViewAnnotation>
  );
}
