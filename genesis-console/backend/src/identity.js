import crypto from "node:crypto";

/**
 * GENESIS identity — branding/handle exactly as supplied by the operator.
 * This is a self-chosen app identity/handle for this console. It is NOT a
 * verified legal-identity claim about any other person.
 */
export const GENESIS_IDENTITY = Object.freeze({
  codename: "GENESIS",
  force: "Angular Force 1",
  displayName: "Genesis Tencen Sintra",
  aliases: ["genesis tabozo", "sanga satoshi", "Tencen Satoshi Nakamoto"],
  handshakePhrase:
    "GENESIS handshake — Genesis Tencen Sintra — angular force 1 — anonymous, allowlisted, end to end.",
  version: "1.0.0",
  webSpeech: "@arena-ai/agents-web-speech@0.0.1 (vendored, see frontend/src/app/voice/)",
});

/** Signed-ish handshake: sha256(codename|display|nonce|timestamp). No secret needed — this proves continuity, not identity. */
export function makeHandshake() {
  const nonce = crypto.randomBytes(12).toString("hex");
  const issuedAt = new Date().toISOString();
  const digest = crypto
    .createHash("sha256")
    .update(`${GENESIS_IDENTITY.codename}|${GENESIS_IDENTITY.displayName}|${nonce}|${issuedAt}`)
    .digest("hex");
  return {
    ...GENESIS_IDENTITY,
    nonce,
    issuedAt,
    handshake: `genesis:${digest.slice(0, 32)}`,
    digest,
  };
}

export function entropySample(bytes = 32) {
  // Unmuted entropy for the 360° surroundings visualiser: real CSPRNG bytes,
  // never a recording of people, never audio of bystanders.
  const buf = crypto.randomBytes(bytes);
  let sum = 0;
  for (const b of buf) sum += b;
  return {
    bytes: bytes,
    mean: +(sum / bytes).toFixed(2),
    hex: buf.toString("hex"),
    at: new Date().toISOString(),
  };
}
