import appConfig from "../app.json";

export const CURRENT_APP_VERSION = appConfig.expo.version;

export const DISPLAY_APP_VERSION = CURRENT_APP_VERSION;

const versionParts = (version: string) => version.split(".").map(part => Number.parseInt(part.replace(/\D/g, ""), 10) || 0);

export function isAppUpdateRequired(current: string, minimum: string): boolean {
  const installed = versionParts(current);
  const required = versionParts(minimum);
  for (let index = 0; index < Math.max(installed.length, required.length); index += 1) {
    const difference = (installed[index] ?? 0) - (required[index] ?? 0);
    if (difference !== 0) return difference < 0;
  }
  return false;
}
