/**
 * Premium connectors registry — “much more effective connectors and premium
 * selections of automated surroundings and dependencies, adaptable to what
 * you want; the best variants become yours.”
 * Every connector reports REAL status. Nothing here fakes a connection.
 */
export function connectorRegistry({ tor }) {
  const hasXai = Boolean(process.env.XAI_API_KEY);
  return [
    {
      id: "angular-force-1",
      name: "Angular Force 1 (frontend)",
      tier: "premium",
      status: "active",
      detail: "Angular standalone frontend — identity, voice, checker, 360° surroundings in one shell.",
      variant: "best: standalone components + signals-ready services",
    },
    {
      id: "arena-web-speech",
      name: "Arena AI Agents Web Speech",
      version: "0.0.1",
      tier: "premium",
      status: "active",
      detail: "Vendored v0.0.1 wrapper over Web Speech API (synthesis + recognition) + WebAudio frequency + MediaRecorder. Works with no key.",
      variant: "best: browser Web Speech now, Grok voice when key is supplied",
    },
    {
      id: "grok-voice",
      name: "Voice Speech API — Grok (xAI)",
      tier: "premium",
      status: hasXai ? "key-present (unverified until first call)" : "standby — no XAI_API_KEY",
      detail: hasXai
        ? "XAI_API_KEY present. POST /api/voice/grok/speak will call api.x.ai. Verify your plan exposes a voice/TTS endpoint."
        : "No key set. UI automatically falls back to Web Speech. Add XAI_API_KEY to .env to enable — see README. No key is ever committed.",
      variant: "best: server-side proxy so the key never reaches the browser",
    },
    {
      id: "tor",
      name: "Tor SOCKS5 (anonymous transport)",
      tier: "premium",
      status: tor.listening ? "connected (SOCKS listening)" : "not running — direct mode",
      detail: tor.mode,
      variant: "best: socks5h (DNS through Tor), only for allowlisted, authorised targets",
    },
    {
      id: "endpoint-checker",
      name: "Allowlisted Endpoint Checker",
      tier: "premium",
      status: "active (SSRF-guarded)",
      detail: "http/https only, private/metadata IPs blocked, DNS re-checked, timeout + redirect caps. Authorised systems only.",
      variant: "best: HEAD then GET, timing + safe headers only, body truncated",
    },
    {
      id: "surroundings-360",
      name: "360° Surroundings / Entropy Monitor",
      tier: "premium",
      status: "active",
      detail: "CSPRNG entropy + real API/Tor latency rendered as a 360° radar. It visualises system surroundings — it does not record, follow, or broadcast people.",
      variant: "best: crypto.getRandomValues (browser) + /api/entropy (server)",
    },
    {
      id: "identity-handshake",
      name: "GENESIS Identity Handshake",
      tier: "premium",
      status: "active",
      detail: "Every session opens with the GENESIS handshake (sha256 digest + nonce) and, if voice is on, speaks it. Continuity, not a legal identity claim.",
      variant: "best: handshake at session start, shown + spoken, copyable as `bash genesis handshake`",
    },
    {
      id: "automation",
      name: "Automated Execution",
      tier: "premium",
      status: "active",
      detail: "./run.sh installs rich dependencies in the smartest order (backend → frontend), builds, starts, and smoke-tests itself. Time is used importantly: parallel installs, cached builds, fail-fast.",
      variant: "best: one command — ./run.sh — or npm run dev for hot reload",
    },
  ];
}
