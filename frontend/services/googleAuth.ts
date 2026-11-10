import { GoogleSignin, isSuccessResponse } from "@react-native-google-signin/google-signin";
import { API_BASE_URL } from "./apiBase";
import { saveSessionToken } from "./auth";

export type GoogleAuthUser = { uid: string; email: string; name: string | null };

export class GoogleSignInCancelled extends Error {}

export async function signInWithGoogle(): Promise<GoogleAuthUser> {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) throw new Error("Google sign-in is not set up in this build. Use email instead.");
  GoogleSignin.configure({ webClientId });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  // Always shows the account picker, so people can choose a different account.
  await GoogleSignin.signOut().catch(() => undefined);

  const result = await GoogleSignin.signIn();
  if (!isSuccessResponse(result)) throw new GoogleSignInCancelled();
  const idToken = result.data.idToken;
  if (!idToken) throw new Error("Google did not return a sign-in token.");

  const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "Google sign-in failed.");

  await saveSessionToken(data.token);
  return { uid: data.email, email: data.email, name: data.name ?? null };
}
