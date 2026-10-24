import net from "node:net";

export const TOR_SOCKS = () => process.env.TOR_SOCKS || "socks5h://127.0.0.1:9050";

function parseSocks() {
  try {
    const u = new URL(TOR_SOCKS());
    return { host: u.hostname || "127.0.0.1", port: Number(u.port || 9050) };
  } catch { return { host: "127.0.0.1", port: 9050 }; }
}

/** Is a Tor SOCKS proxy actually listening locally? Never fakes “anonymous”. */
export function torStatus(timeoutMs = 1200) {
  const { host, port } = parseSocks();
  return new Promise((resolve) => {
    const sock = net.connect({ host, port });
    const done = (listening) => { try { sock.destroy(); } catch {} resolve({
      socks: TOR_SOCKS(), listening,
      mode: listening ? "tor-socks-ready" : "direct (Tor not running — start Tor Browser or `tor` service, or set TOR_SOCKS)",
      hint: listening ? "Endpoint checks with viaTor=true will route through Tor." : "No Tor proxy detected. Checks run direct. Install Tor locally — this app does not bundle or impersonate Tor.",
      at: new Date().toISOString(),
    }); };
    sock.setTimeout(timeoutMs);
    sock.once("connect", () => done(true));
    sock.once("timeout", () => done(false));
    sock.once("error", () => done(false));
  });
}
