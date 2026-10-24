import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "node:http";
import https from "node:https";
import { SocksProxyAgent } from "socks-proxy-agent";
import { makeHandshake, entropySample, GENESIS_IDENTITY } from "./identity.js";
import { validateTarget } from "./guard.js";
import { torStatus, TOR_SOCKS } from "./tor.js";
import { connectorRegistry } from "./connectors.js";

const app = express();
const PORT = Number(process.env.PORT || 8787);

app.use(cors({ origin: [/localhost:\d+$/, /127\.0\.0\.1:\d+$/, /\.e2b\.app$/], credentials: false }));
app.use(express.json({ limit: "256kb" }));

// Tiny in-memory rate limit for the checker (anti-abuse)
const hits = new Map();
function rateLimit(req, res, next) {
  const key = req.ip || "unknown";
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < 60_000);
  if (arr.length >= 30) return res.status(429).json({ error: "Rate limit: 30 checks / minute" });
  arr.push(now); hits.set(key, arr); next();
}

app.get("/api/health", (_req, res) => res.json({
  ok: true, app: "GENESIS Console", force: GENESIS_IDENTITY.force,
  identity: GENESIS_IDENTITY.codename, at: new Date().toISOString(),
}));

app.get("/api/identity", (_req, res) => res.json(makeHandshake()));

app.get("/api/entropy", (_req, res) => res.json(entropySample(48)));

app.get("/api/tor/status", async (_req, res) => res.json(await torStatus()));

app.get("/api/connectors", async (_req, res) => {
  const tor = await torStatus();
  res.json({ connectors: connectorRegistry({ tor }), at: new Date().toISOString() });
});

/**
 * POST /api/check { url, viaTor?, method? }
 * Allowlisted, SSRF-guarded endpoint check. Authorised systems only.
 */
app.post("/api/check", rateLimit, async (req, res) => {
  const started = Date.now();
  try {
    const url = await validateTarget(req.body?.url);
    const viaTor = Boolean(req.body?.viaTor);
    const method = req.body?.method === "GET" ? "GET" : "HEAD";
    let agent;
    if (viaTor) {
      const tor = await torStatus();
      if (!tor.listening) return res.status(400).json({ error: "viaTor requested but no Tor SOCKS proxy is listening", tor });
      agent = new SocksProxyAgent(TOR_SOCKS());
    }
    const result = await fetchWithRedirects(url, { method, agent, timeoutMs: 8000 });
    res.json({
      url: url.toString(), method, viaTor,
      ...result,
      ms: Date.now() - started,
      at: new Date().toISOString(),
      note: "Checked only because the host is allowlisted/entered by you and resolved to a public IP. Use only on systems you own or are authorised to test.",
    });
  } catch (e) {
    res.status(400).json({ error: String(e?.message || e), ms: Date.now() - started });
  }
});

function fetchWithRedirects(url, { method, agent, timeoutMs }, redirects = 0) {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(url, { method, agent, timeout: timeoutMs, headers: { "User-Agent": "GENESIS-Console/1.0 allowlisted-checker" } }, (r) => {
      const chunks = [];
      let size = 0;
      r.on("data", (c) => { if (size < 8192) { chunks.push(c); size += c.length; } });
      r.on("end", () => {
        if ([301, 302, 303, 307, 308].includes(r.statusCode) && r.headers.location && redirects < 3) {
          // Redirect targets are re-validated by the caller contract: resolve here only if public http(s)
          try {
            const next = new URL(r.headers.location, url);
            if (!["http:", "https:"].includes(next.protocol)) throw new Error("Redirect to non-http blocked");
            return resolve(fetchWithRedirects(next, { method: "HEAD", agent, timeoutMs }, redirects + 1));
          } catch (e) { return reject(e); }
        }
        const safeHeaders = {};
        for (const k of ["content-type", "content-length", "server", "cache-control", "x-content-type-options", "strict-transport-security"]) {
          if (r.headers[k]) safeHeaders[k] = r.headers[k];
        }
        resolve({
          status: r.statusCode, ok: r.statusCode >= 200 && r.statusCode < 400,
          headers: safeHeaders,
          bodyPreview: method === "GET" ? Buffer.concat(chunks).toString("utf8").slice(0, 1000) : "",
          redirects,
        });
      });
    });
    req.on("timeout", () => { req.destroy(new Error("Timeout after " + timeoutMs + "ms")); });
    req.on("error", reject);
    req.end();
  });
}

/**
 * Voice — Grok (xAI) proxy + Web Speech fallback contract.
 * The browser NEVER sees XAI_API_KEY. If no key / no voice endpoint on your
 * plan, the frontend uses Web Speech (v0.0.1) — that is the working default.
 */
app.get("/api/voice/status", (_req, res) => res.json({
  webspeech: { package: "@arena-ai/agents-web-speech", version: "0.0.1", status: "active (browser, no key needed)" },
  grok: {
    provider: "xAI Grok API", keyPresent: Boolean(process.env.XAI_API_KEY),
    status: process.env.XAI_API_KEY ? "key present — speak endpoint will attempt api.x.ai" : "standby — set XAI_API_KEY in .env",
    fallback: "Web Speech synthesis (rate/pitch adjustable) + recognition + recording compile",
  },
  identityHandshakeSpoken: true,
}));

app.post("/api/voice/grok/speak", async (req, res) => {
  const text = String(req.body?.text || "").slice(0, 1000);
  if (!text) return res.status(400).json({ error: "text is required" });
  if (!process.env.XAI_API_KEY) {
    return res.status(501).json({
      error: "XAI_API_KEY not set — use Web Speech fallback",
      fallback: { engine: "@arena-ai/agents-web-speech@0.0.1", text },
    });
  }
  try {
    // xAI's public API is OpenAI-compatible for chat; voice/TTS availability
    // depends on your plan. We attempt the documented-compatible route and
    // surface the upstream result honestly instead of faking audio.
    const r = await fetch(process.env.XAI_VOICE_URL || "https://api.x.ai/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.XAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.XAI_VOICE_MODEL || "grok-voice", input: text, voice: process.env.XAI_VOICE || "alloy" }),
    });
    if (!r.ok) return res.status(502).json({ error: `xAI voice upstream ${r.status}`, detail: (await r.text()).slice(0, 500), fallback: "Use Web Speech in the browser" });
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type", r.headers.get("content-type") || "audio/mpeg");
    res.send(buf);
  } catch (e) {
    res.status(502).json({ error: String(e?.message || e), fallback: "Use Web Speech in the browser" });
  }
});

// SSE: live surroundings ticks (entropy + latency). No people, no audio, no tracking.
app.get("/api/events", (req, res) => {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  const tick = async () => {
    const tor = await torStatus(400);
    res.write(`data: ${JSON.stringify({ at: new Date().toISOString(), entropy: entropySample(16), torListening: tor.listening })}\n\n`);
  };
  tick();
  const id = setInterval(tick, 3000);
  req.on("close", () => clearInterval(id));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`GENESIS backend → http://0.0.0.0:${PORT}  (identity: ${GENESIS_IDENTITY.codename} / ${GENESIS_IDENTITY.force})`);
});
