// AES-GCM 256 sealing for the field store (plan §2.5). WebCrypto only.
// Honest limit: a non-extractable key in the same origin stops copying IDB files off a device and casual inspection,
// not script running in the unlocked signed-in origin. Real controls: minimised data, 72 h expiry, wipe, revoke.
// shortcut: key lives on-device only, upgrade to a server-wrapped key if the pen test asks for it.
export type Sealed = { iv: Uint8Array; ct: ArrayBuffer };

export const newKey = () => crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);

const enc = new TextEncoder(), dec = new TextDecoder();

/** AAD = record id, so sealed records cannot be swapped between keys. */
export async function seal(key: CryptoKey, aad: string, value: unknown): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(aad) }, key, enc.encode(JSON.stringify(value)));
  return { iv, ct };
}
export async function open<T>(key: CryptoKey, aad: string, s: Sealed): Promise<T> {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: s.iv as BufferSource, additionalData: enc.encode(aad) }, key, s.ct);
  return JSON.parse(dec.decode(pt)) as T;
}

export async function sha256Hex(s: string) {
  const h = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
