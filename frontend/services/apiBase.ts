// `||`, not `??`: an empty EXPO_PUBLIC_API_URL must still reach the fallback.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api.letdoyo.com";

export const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");
