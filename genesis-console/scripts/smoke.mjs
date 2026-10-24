// Automated smoke test — waits for the backend, then verifies every route
// that must work with no secrets and no Tor running.
const BASE = process.env.BASE || "http://127.0.0.1:8787";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(path) {
  const r = await fetch(BASE + path);
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json();
}

for (let i = 0; i < 30; i++) {
  try { await get("/api/health"); break; } catch { if (i === 29) throw new Error("Backend never came up on " + BASE); await wait(500); }
}
console.log("✓ /api/health", await get("/api/health"));
const id = await get("/api/identity");
console.log("✓ /api/identity", id.codename, id.handshake);
if (!id.handshake?.startsWith("genesis:")) throw new Error("Bad handshake");
console.log("✓ /api/tor/status", (await get("/api/tor/status")).mode);
console.log("✓ /api/connectors", (await get("/api/connectors")).connectors.length, "connectors");
console.log("✓ /api/voice/status", (await get("/api/voice/status")).webspeech);
const check = await fetch(BASE + "/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: "http://127.0.0.1:8787/api/health" }) });
console.log("✓ SSRF guard blocks loopback →", check.status, await check.text().then(t => t.slice(0, 140)));
if (check.status !== 400) throw new Error("SSRF guard failed!");
console.log("\n✅ GENESIS smoke test passed — full stack, handshake, Tor status, connectors, voice fallback, SSRF guard.");
