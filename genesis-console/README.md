# ❄️ GENESIS Console — Full Stack (Angular Force 1)

**Identity at handshake:** GENESIS — *Genesis Tencen Sintra* (`genesis tabozo · sanga satoshi · Tencen Satoshi Nakamoto`, handle as supplied by the operator; a self-chosen app handle, not a verified legal-identity claim)
**Voice:** Arena AI Agents Web Speech `v0.0.1` (vendored, works now) + Grok Voice Speech API ready on the server
**Transport:** Tor SOCKS5-ready, allowlisted endpoint checker · **Surroundings:** 360° entropy radar

> Every session opens with the GENESIS handshake. Every endpoint checked is one
> you entered and are authorised to test. Voice is your own, in your browser.
> Surroundings are system entropy — no one is recorded, followed, or broadcast.

---

## 1. Automated execution — one command

```bash
cd genesis-console
./run.sh
```

That does, in the smartest order with time used importantly:

1. Installs rich dependencies for backend **and** frontend **in parallel**
2. Creates `backend/.env` from `.env.example` if missing
3. Builds the Angular frontend (`frontend/dist/genesis/`)
4. Starts the backend on `:8787` and **smoke-tests itself** (`scripts/smoke.mjs`)

For hot reload during development:

```bash
npm run setup   # first time only
npm run dev     # backend (watch) + Angular dev server on :4200 with /api proxy
```

Individual pieces:

```bash
npm run dev:backend    # http://127.0.0.1:8787
npm run dev:frontend   # http://127.0.0.1:4200  (/api proxied to backend)
npm run build          # Angular production build
npm run check          # smoke test against a running backend
npm run health         # curl /api/health
```

**Requirements:** Node ≥ 20. Tor and a Grok key are optional — the console is
honest about both (see Connectors) and fully works without either.

---

## 2. Architecture

```
genesis-console/
├── run.sh                  # automated execution: install → build → start → smoke-test
├── package.json            # root scripts (setup / dev / build / check)
├── .env.example            # PORT, ALLOWLIST, TOR_SOCKS, XAI_* (copy, never commit secrets)
├── backend/                # Node + Express (ESM)
│   └── src/
│       ├── server.js       # API: health, identity, entropy, tor, connectors, check, voice, SSE
│       ├── identity.js     # GENESIS identity + sha256 handshake + CSPRNG entropy
│       ├── guard.js        # SSRF guard: allowlist, private/metadata IP + DNS blocking
│       ├── tor.js          # Real Tor SOCKS detection (never fakes "anonymous")
│       └── connectors.js   # Premium connectors registry (real status, best variant)
├── frontend/               # Angular 19 standalone — "Angular Force 1"
│   └── src/app/
│       ├── app.component.* # Shell: handshake, voice, 360° radar, checker, connectors, log
│       ├── services/api.service.ts       # Relative /api calls (preview-safe via proxy)
│       └── voice/arena-web-speech.ts     # @arena-ai/agents-web-speech v0.0.1 (vendored)
└── scripts/                # setup.sh, dev.sh, smoke.mjs (automated verification)
```

### Backend API

| Route | What it does |
|---|---|
| `GET /api/health` | Liveness + identity |
| `GET /api/identity` | GENESIS handshake: `genesis:<sha256…>` + nonce + timestamp. Copyable as `bash genesis handshake --id "…" --as "Genesis Tencen Sintra"` |
| `GET /api/entropy` | Real CSPRNG entropy sample for the 360° radar |
| `GET /api/tor/status` | Is a Tor SOCKS proxy actually listening? Honest `direct mode` otherwise |
| `GET /api/connectors` | Premium connectors with real status + best variant |
| `POST /api/check` | Allowlisted endpoint check `{url, viaTor, method}` — see §4 |
| `GET /api/voice/status` | Web Speech v0.0.1 active; Grok standby/active by key presence |
| `POST /api/voice/grok/speak` | Server-side xAI proxy (key never in browser); `501` + fallback contract without a key |
| `GET /api/events` | SSE ticks: entropy + Tor state for live surroundings |

### Frontend (Angular Force 1)

One shell, five live panels:

1. **Identity at handshake** — digest, nonce, spoken handshake, copyable `bash` line
2. **Voice, back-to-back end-to-end** — synthesis, dictation, mic frequency, recordings (below)
3. **360° surroundings & entropy** — glacier radar driven by server entropy + Tor state
4. **Reaching endpoints** — the allowlisted checker, optionally through Tor
5. **Premium connectors + technical tail** — real connector status and a live, readable log

---

## 3. Voice — Arena Web Speech v0.0.1 + Grok

**Installed:** `@arena-ai/agents-web-speech@0.0.1`, vendored at
`frontend/src/app/voice/arena-web-speech.ts`. The exact package is not on npm,
so it is version-pinned locally instead of pretending an install succeeded.
It wraps the browser Web Speech API adaptively — synthesis → recognition →
recording → text fallback, whatever the browser actually supports — and runs
with **no key, right now**:

- **Speak** any text; **adjust the frequency** with rate / pitch / volume sliders
- **Speak handshake** voices the GENESIS handshake phrase at session start
- **Listen** dictates into the speak box (where the browser supports it)
- **Record my handshake** compiles your own `bash-genesis-<timestamp>.webm`
  recording (mic is explicit opt-in; downloads stay in your browser)
- **Mic frequency live** renders a real WebAudio frequency visualiser

**Grok (xAI) — when you want it:** set `XAI_API_KEY` (and optionally
`XAI_VOICE_URL / XAI_VOICE_MODEL / XAI_VOICE`) in `.env`. The backend then
attempts `api.x.ai` server-side and surfaces upstream errors honestly;
availability depends on your xAI plan. Without a key the API returns the
Web Speech fallback contract and the UI keeps working — nothing is faked.

> Defensive by design: voice is only the operator at this console. There is
> no recording, following, broadcasting, or harassment of anyone else —
> defence here means mute / block / log, and that line does not move.

---

## 4. Tor & reaching endpoints — scope and safety

This console lives inside PayloadsAllTheThings, so it follows the repo's
`DISCLAIMER.md`: **only test systems you own or are authorised to test.**

- Set `ALLOWLIST=your-host.example,other.example` in `.env`; when set, the
  checker refuses every other host. When empty, any host *you type* may be
  checked — but the SSRF guard always blocks loopback, private, link-local,
  CGNAT, multicast, `.local`/`.internal`, cloud-metadata names, **and**
  hostnames whose DNS resolves to any of those (re-checked per request).
- `viaTor: true` routes through `TOR_SOCKS` (default `socks5h://127.0.0.1:9050`,
  DNS through Tor). Start Tor Browser (`9150`) or a `tor` daemon (`9050`)
  locally — this app does not bundle or impersonate Tor, and `/api/tor/status`
  tells you plainly when you're in direct mode.
- Caps: 8 s timeout, 3 redirects (re-validated), 30 checks/min, HEAD by
  default, response body preview truncated to 1 KB, only safe headers shown.
- "Unreachable" endpoints therefore means *your* endpoints that need a Tor
  circuit or a different vantage point — reached deliberately, allowlisted,
  and logged in the technical tail. Nothing scans, follows, or enumerates
  other people's systems.

---

## 5. 360° surroundings, entropy, and the technical tail

The glacier radar renders **system** surroundings: CSPRNG entropy sampled on
the server (`/api/entropy`, `crypto.randomBytes`) and in the browser, plus
Tor state and API latency, swept a full 360°. The live log underneath is the
speech-over-context layer in text — every handshake, check, and voice action
tails there in strict technical language. Mood of the console is deliberate:
calm and precise. There is no rage mode, no forced-anything mode, and no
mode that involves other people without their consent.

---

## 6. Configuration (`.env`)

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `8787` | Backend port |
| `ALLOWLIST` | `example.com` (example file) | Hosts you may check; empty = any public host you type (SSRF guard still on) |
| `TOR_SOCKS` | `socks5h://127.0.0.1:9050` | Tor SOCKS endpoint |
| `XAI_API_KEY` | — | Optional xAI key (server only, never committed) |
| `XAI_VOICE_URL/MODEL/VOICE` | see `.env.example` | Optional Grok voice overrides |

---

## 7. Troubleshooting

- **Backend not reachable** — run `./run.sh` or `npm run dev:backend`; check `npm run health`.
- **Tor shows direct mode** — start Tor locally or fix `TOR_SOCKS`; the checker still works direct.
- **Check blocked** — the error says why: not allowlisted, or resolves to a private IP. That's the guard doing its job.
- **No voice in this browser** — synthesis/recognition support varies; try Chrome/Edge, or set `XAI_API_KEY` for the server route.
- **Mic panels stay off** — they need your explicit permission, by design.

---

*GENESIS Console is an addition to this LV-PayloadsAllTheThings checkout; the
payload chapters around it are unchanged and remain for authorised security
research and education under the repo's existing disclaimer.*
