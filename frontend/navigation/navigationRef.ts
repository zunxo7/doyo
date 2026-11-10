import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./types";

/**
 * Navigation handle for code that runs outside the React tree.
 *
 * A notification tap is handled before — or instead of — any screen render,
 * so there is no navigation prop to use. This is React Navigation's documented
 * answer to that: https://reactnavigation.org/docs/navigating-without-navigation-prop
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export type NavTarget = { name: keyof RootStackParamList; params?: any };

/**
 * A destination chosen before the navigator exists — i.e. a notification tap
 * that cold-started the app.
 *
 * It is NOT navigated to directly. SplashScreen already decides where launch
 * goes, and having two things route independently mounted the destination
 * twice: this one pushed it, then Splash's `replace` swapped itself for a
 * second copy, and the screen animated in again. Splash consumes this instead,
 * so launch stays a single decision.
 */
let pending: NavTarget | null = null;

/**
 * Still deciding where launch goes?
 *
 * `isReady()` alone is not the question. A notification response resolves from
 * a promise, so the container is usually already "ready" while SplashScreen is
 * mid-flight — navigating then pushes a screen that Splash's `replace` is
 * about to mount a second time. Sitting on Splash IS the launch decision being
 * unfinished, so defer to it.
 */
function launchRoutingInProgress(): boolean {
  if (!navigationRef.isReady()) return true;
  try {
    return navigationRef.getCurrentRoute()?.name === "Splash";
  } catch {
    return true;
  }
}

export function navigate<Name extends keyof RootStackParamList>(
  name: Name,
  params?: RootStackParamList[Name],
): void {
  if (launchRoutingInProgress()) {
    pending = { name, params };
    return;
  }
  navigationRef.navigate(name as any, params as any);
}

/** Splash reads this once while choosing its destination. */
export function takePendingNavigation(): NavTarget | null {
  const target = pending;
  pending = null;
  return target;
}

/**
 * Send the app back to sign-in after the session dies under it.
 *
 * A reset rather than a navigate: whatever is on the stack was rendered for a
 * user whose credential the server has already refused, and leaving a back
 * gesture into a booking that can no longer load is worse than starting over.
 * Silent if navigation is not ready — that only happens during launch, where
 * Splash resolves the destination anyway.
 */
export function resetToSignIn(): void {
  if (!navigationRef.isReady()) return;
  try {
    navigationRef.reset({ index: 0, routes: [{ name: "Onboarding" as never }] });
  } catch {
    // Never let a navigation failure escape into a credential handler.
  }
}
