/**
 * A raw Ed25519 keypair. Keys are base64-encoded DER so they round-trip through
 * the existing `license-keys.json` files and the dashboard's encrypted vault
 * without a migration:
 *  - public key: SPKI DER base64 (what `license-pubkey` serves),
 *  - private key: PKCS#8 DER base64 (what the keygen script writes).
 */
export type RawKeyPair = {
    publicKey: string;
    privateKey: string;
};
export declare function signPayload(payloadJson: string, privateKeyB64: string): Buffer;
export declare function verifySignature(data: Buffer, signature: Buffer, publicKeyB64: string): boolean;
//# sourceMappingURL=crypto.d.ts.map