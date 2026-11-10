import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";

/**
 * Serves app updates over the expo-updates protocol (v1) from files the deploy workflow uploads:
 * OTA_DIR/<runtimeVersion>/<publishedAtMs>/ holds one `expo export`, newest folder wins.
 */
const OTA_DIR = process.env.OTA_DIR ?? "/ota";

const MIME: Record<string, string> = {
  bundle: "application/javascript",
  hbc: "application/javascript",
  js: "application/javascript",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  ttf: "font/ttf",
  otf: "font/otf",
};

type Metadata = { fileMetadata: Record<string, { bundle: string; assets: { path: string; ext: string }[] }> };

const digest = (file: string, algorithm: "sha256" | "md5", encoding: "base64url" | "hex") =>
  createHash(algorithm).update(readFileSync(file)).digest(encoding);

// Manifests are rebuilt only when a new folder is published.
const cache = new Map<string, object>();

function latestUpdate(runtimeVersion: string): string | null {
  if (!/^[\w.-]+$/.test(runtimeVersion)) return null;
  const dir = path.join(OTA_DIR, runtimeVersion);
  if (!existsSync(dir)) return null;
  const published = readdirSync(dir).filter(name => /^\d+$/.test(name)).sort((a, b) => Number(b) - Number(a));
  return published[0] ? path.join(dir, published[0]) : null;
}

function asUuid(hex: string): string {
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function manifestFor(updateDir: string, platform: string, runtimeVersion: string, base: string): object {
  const cacheKey = `${updateDir}:${platform}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const metadataFile = path.join(updateDir, "metadata.json");
  const { fileMetadata } = JSON.parse(readFileSync(metadataFile, "utf8")) as Metadata;
  const files = fileMetadata[platform];
  if (!files) throw new Error(`no ${platform} export`);
  const urlFor = (file: string) => `${base}/ota/assets?file=${encodeURIComponent(path.relative(OTA_DIR, path.join(updateDir, file)))}`;
  const asset = (exported: string, ext: string) => {
    // Exports made on Windows list paths with backslashes.
    const file = exported.split(path.win32.sep).join("/");
    const full = path.join(updateDir, file);
    return {
      hash: digest(full, "sha256", "base64url"),
      key: digest(full, "md5", "hex"),
      fileExtension: `.${ext}`,
      contentType: MIME[ext] ?? "application/octet-stream",
      url: urlFor(file),
    };
  };
  const expoConfigFile = path.join(updateDir, "expoConfig.json");
  const manifest = {
    id: asUuid(digest(metadataFile, "sha256", "hex")),
    createdAt: new Date(Number(path.basename(updateDir))).toISOString(),
    runtimeVersion,
    launchAsset: { ...asset(files.bundle, "bundle"), contentType: "application/javascript" },
    assets: files.assets.map(item => asset(item.path, item.ext)),
    metadata: {},
    extra: { expoClient: existsSync(expoConfigFile) ? JSON.parse(readFileSync(expoConfigFile, "utf8")) : {} },
  };
  cache.set(cacheKey, manifest);
  return manifest;
}

export function registerOta(app: FastifyInstance): void {
  app.get("/ota/manifest", async (req, reply) => {
    const platform = String(req.headers["expo-platform"] ?? "");
    const runtimeVersion = String(req.headers["expo-runtime-version"] ?? "");
    const updateDir = ["android", "ios"].includes(platform) ? latestUpdate(runtimeVersion) : null;
    if (!updateDir) return reply.status(404).send({ error: "No update for this app version." });
    const manifest = manifestFor(updateDir, platform, runtimeVersion, `https://${req.host}`);
    const boundary = `doyo-${Date.now().toString(36)}`;
    const body = [
      `--${boundary}`,
      "Content-Type: application/json; charset=utf-8",
      'Content-Disposition: form-data; name="manifest"',
      "",
      JSON.stringify(manifest),
      `--${boundary}--`,
      "",
    ].join("\r\n");
    return reply
      .header("expo-protocol-version", "1")
      .header("expo-sfv-version", "0")
      .header("cache-control", "private, max-age=0")
      .type(`multipart/mixed; boundary=${boundary}`)
      .send(body);
  });

  app.get<{ Querystring: { file?: string } }>("/ota/assets", async (req, reply) => {
    const full = path.resolve(OTA_DIR, String(req.query.file ?? ""));
    if (!full.startsWith(path.resolve(OTA_DIR) + path.sep) || !existsSync(full)) return reply.status(404).send({ error: "Not found." });
    const ext = path.extname(full).slice(1);
    // Asset paths contain their content hash, so they never change.
    return reply.header("cache-control", "public, max-age=31536000, immutable").type(MIME[ext] ?? "application/octet-stream").send(readFileSync(full));
  });

  app.get("/ota/app.apk", async (_req, reply) => {
    const apk = path.join(OTA_DIR, "doyo.apk");
    if (!existsSync(apk)) return reply.status(404).send({ error: "No build yet." });
    return reply
      .header("content-disposition", 'attachment; filename="doyo.apk"')
      // A new build replaces this file in place, so no cache may keep the old one.
      .header("cache-control", "no-store")
      .type("application/vnd.android.package-archive")
      .send(readFileSync(apk));
  });
}
