import { generateKeyPairSync } from 'crypto';
import { encodeBase64 } from './base64.js';
/**
 * Generate a single Ed25519 keypair for the whole product family. Keys are
 * base64 DER (SPKI public / PKCS#8 private) to stay compatible with the
 * existing `license-keys.json` and the dashboard's encrypted vault.
 */
export function generateKeyPair() {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    return {
        publicKey: encodeBase64(publicKey.export({ type: 'spki', format: 'der' })),
        privateKey: encodeBase64(privateKey.export({ type: 'pkcs8', format: 'der' }))
    };
}
//# sourceMappingURL=keys.js.map