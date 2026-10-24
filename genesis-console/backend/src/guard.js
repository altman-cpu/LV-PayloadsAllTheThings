import dns from "node:dns/promises";
import net from "node:net";

/**
 * SSRF guard for the allowlisted endpoint checker.
 * Only use this console against systems you own or are authorised to test
 * (this repo is PayloadsAllTheThings — same rule as its DISCLAIMER.md).
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
]);

function ipv4Private(ip) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some(Number.isNaN)) return true; // fail closed
  const [a, b] = p;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 169 && b === 254) ||          // link-local / cloud metadata
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 168) ||          // private
    (a === 100 && b >= 64 && b <= 127) ||// CGNAT
    a >= 224                              // multicast / reserved
  );
}

export function isPrivateIp(ip) {
  if (net.isIPv4(ip)) return ipv4Private(ip);
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    return v === "::1" || v === "::" || v.startsWith("fe80:") || v.startsWith("fc") || v.startsWith("fd");
  }
  return true; // fail closed on unknown
}

export function allowlistHosts() {
  return (process.env.ALLOWLIST || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

/**
 * Validate a user-entered target.
 * - http/https only, no credentials in URL
 * - hostname must be on ALLOWLIST when ALLOWLIST is set
 * - hostname + every DNS-resolved IP must be public (blocks SSRF / metadata)
 */
export async function validateTarget(raw) {
  let url;
  try { url = new URL(String(raw)); } catch { throw new Error("Invalid URL"); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only http:// and https:// are allowed");
  if (url.username || url.password) throw new Error("URLs with embedded credentials are not allowed");
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error(`Blocked hostname: ${host}`);
  }
  const allow = allowlistHosts();
  if (allow.length && !allow.some((h) => host === h || host.endsWith(`.${h}`))) {
    throw new Error(`Host not on ALLOWLIST: ${host}. Add it to ALLOWLIST in .env for systems you own/are authorised to test.`);
  }
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error(`Private/reserved IP blocked: ${host}`);
  } else {
    const records = await dns.lookup(host, { all: true }).catch(() => []);
    if (!records.length) throw new Error(`DNS lookup failed for ${host}`);
    for (const r of records) {
      if (isPrivateIp(r.address)) throw new Error(`Host resolves to private IP (${r.address}) — blocked`);
    }
  }
  return url;
}
