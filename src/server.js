import http from "node:http";
import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { localDaily, tokyoDate } from "./daily.js";
import { fallbackImage, historyFor, imageFor } from "./upstream.js";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, "..", "public");
const port = Number.parseInt(process.env.PORT || "3000", 10);
const timeoutMs = Math.min(Math.max(Number.parseInt(process.env.FETCH_TIMEOUT_MS || "3500", 10), 500), 10000);
const cacheDir = process.env.CACHE_DIR || "/tmp/thing-of-the-day-cache";
const memory = new Map();
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json; charset=utf-8" };

const csp = ["default-src 'self'", "script-src 'self'", "style-src 'self'", "img-src 'self' https://upload.wikimedia.org data:", "connect-src 'self'", "font-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'self' https://canva.com https://*.canva.com https://*.canva-apps.com https://morninghub-production.up.railway.app", "upgrade-insecure-requests"].join("; ");

function headers(extra = {}) {
  return { "Content-Security-Policy": csp, "Referrer-Policy": "strict-origin-when-cross-origin", "X-Content-Type-Options": "nosniff", "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()", "Cross-Origin-Resource-Policy": "cross-origin", ...extra };
}

async function readCache(date) {
  if (memory.has(date)) return memory.get(date);
  try { const value = JSON.parse(await readFile(join(cacheDir, `${date}.json`), "utf8")); memory.set(date, value); return value; } catch { return null; }
}

async function saveCache(date, value) {
  memory.set(date, value);
  try {
    await mkdir(cacheDir, { recursive: true });
    const target = join(cacheDir, `${date}.json`), temp = `${target}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify(value), { encoding: "utf8", mode: 0o600 });
    await rename(temp, target);
  } catch (error) { console.warn("Cache write skipped:", error.message); }
}

async function todayPayload() {
  const date = tokyoDate(), cached = await readCache(date);
  if (cached) return cached;
  const base = localDaily(date);
  const [historyResult, imageResult] = await Promise.allSettled([historyFor(date, timeoutMs), imageFor(date, timeoutMs)]);
  const value = {
    ...base,
    history: historyResult.status === "fulfilled" ? historyResult.value : await historyFor(date, 1, async () => { throw new Error("offline"); }),
    image: imageResult.status === "fulfilled" ? imageResult.value : fallbackImage(),
    generatedAt: new Date().toISOString(), timeZone: "Asia/Tokyo"
  };
  await saveCache(date, value);
  return value;
}

async function handler(req, res) {
  const url = new URL(req.url, "http://local");
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, headers({ Allow: "GET, HEAD" })); return res.end(); }
  if (url.pathname === "/health") { res.writeHead(200, headers({ "Content-Type": "application/json", "Cache-Control": "no-store" })); return res.end('{"ok":true}'); }
  if (url.pathname === "/api/today") {
    try { const body = JSON.stringify(await todayPayload()); res.writeHead(200, headers({ "Content-Type": mime[".json"], "Cache-Control": "public, max-age=300, s-maxage=1800", "Content-Length": Buffer.byteLength(body) })); return res.end(req.method === "HEAD" ? undefined : body); }
    catch { res.writeHead(503, headers({ "Content-Type": mime[".json"], "Cache-Control": "no-store" })); return res.end('{"error":"Daily board temporarily unavailable"}'); }
  }
  const route = url.pathname === "/" ? "/index.html" : url.pathname === "/about" ? "/about.html" : url.pathname;
  const safe = normalize(route).replace(/^(\.\.(\/|\\|$))+/, "");
  const file = join(publicDir, safe);
  if (!file.startsWith(publicDir)) { res.writeHead(404, headers()); return res.end(); }
  try { const body = await readFile(file); res.writeHead(200, headers({ "Content-Type": mime[extname(file)] || "application/octet-stream", "Cache-Control": "public, max-age=3600", "Content-Length": body.length })); res.end(req.method === "HEAD" ? undefined : body); }
  catch { res.writeHead(404, headers({ "Content-Type": "text/plain; charset=utf-8" })); res.end("Not found"); }
}

export const server = http.createServer((req, res) => handler(req, res));
if (process.argv[1] === fileURLToPath(import.meta.url)) server.listen(port, "0.0.0.0", () => console.log(`Thing of the Day listening on ${port}`));
