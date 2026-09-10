import type { RawKeyPair } from './crypto.js';
/**
 * Generate a single Ed25519 keypair for the whole product family. Keys are
 * base64 DER (SPKI public / PKCS#8 private) to stay compatible with the
 * existing `license-keys.json` and the dashboard's encrypted vault.
 */
export declare function generateKeyPair(): RawKeyPair;
//# sourceMappingURL=keys.d.ts.map