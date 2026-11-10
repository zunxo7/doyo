import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

const file = process.env.DB_FILE || "data/doyo.db";
if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
const db = new DatabaseSync(file);
db.exec("CREATE TABLE IF NOT EXISTS docs (col TEXT NOT NULL, id TEXT NOT NULL, json TEXT NOT NULL, PRIMARY KEY (col, id))");
db.exec("CREATE TABLE IF NOT EXISTS blobs (id TEXT PRIMARY KEY, type TEXT NOT NULL, bytes BLOB NOT NULL)");

const getStmt = db.prepare("SELECT json FROM docs WHERE col = ? AND id = ?");
const putStmt = db.prepare("INSERT INTO docs (col, id, json) VALUES (?, ?, ?) ON CONFLICT (col, id) DO UPDATE SET json = excluded.json");
const delStmt = db.prepare("DELETE FROM docs WHERE col = ? AND id = ?");
const listStmt = db.prepare("SELECT json FROM docs WHERE col = ?");

export function get<T>(col: string, id: string): T | null {
  const row = getStmt.get(col, id) as { json: string } | undefined;
  return row ? (JSON.parse(row.json) as T) : null;
}

export function put<T extends { id: string }>(col: string, doc: T): T {
  putStmt.run(col, doc.id, JSON.stringify(doc));
  return doc;
}

export function del(col: string, id: string): void {
  delStmt.run(col, id);
}

export function list<T>(col: string): T[] {
  return (listStmt.all(col) as { json: string }[]).map(row => JSON.parse(row.json) as T);
}

export function putBlob(id: string, type: string, bytes: Buffer): void {
  db.prepare("INSERT INTO blobs (id, type, bytes) VALUES (?, ?, ?) ON CONFLICT (id) DO UPDATE SET type = excluded.type, bytes = excluded.bytes").run(id, type, bytes);
}

export function getBlob(id: string): { type: string; bytes: Buffer } | null {
  const row = db.prepare("SELECT type, bytes FROM blobs WHERE id = ?").get(id) as { type: string; bytes: Uint8Array } | undefined;
  return row ? { type: row.type, bytes: Buffer.from(row.bytes) } : null;
}
