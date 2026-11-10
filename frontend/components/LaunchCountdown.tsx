import { useEffect, useState } from "react";
import { formatLaunchCountdown } from "../services/appConfig";

type Props = {
  /** Epoch ms the launch campaign ends — `getLaunchWindow(...).endsAt`. */
  endsAt: number;
  t: (key: string, params?: Record<string, string | number>) => string;
};

/**
 * The launch countdown's own clock.
 *
 * The text shows seconds, so it genuinely needs a 1Hz tick. It used to get one
 * from a `nowTick` in each host screen's state, which meant CustomerHomeScreen
 * re-rendered all ~2,900 lines of itself every second — whether or not this
 * pill was even on screen, and whether or not a campaign was running.
 *
 * Owning the interval here means only this text re-renders, and only while it
 * is mounted. The hosts keep a much slower tick for the things that actually
 * change on a minute boundary.
 */
export default function LaunchCountdown({ endsAt, t }: Props) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, endsAt - Date.now()));

  useEffect(() => {
    const tick = () => setRemainingMs(Math.max(0, endsAt - Date.now()));
    // Immediately, so a remount does not show a stale value for up to a second.
    tick();
    const timer = setInterval(tick, 1_000);
    return () => clearInterval(timer);
  }, [endsAt]);

  return <>{formatLaunchCountdown(remainingMs, true, t)}</>;
}
