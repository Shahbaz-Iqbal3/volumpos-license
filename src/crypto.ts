import {
  createPrivateKey,
  createPublicKey,
  sign as cryptoSign,
  verify as cryptoVerify
} from 'crypto'
import { decodeBase64 } from './base64.js'

/**
 * A raw Ed25519 keypair. Keys are base64-encoded DER so they round-trip through
 * the existing `license-keys.json` files and the dashboard's encrypted vault
 * without a migration:
 *  - public key: SPKI DER base64 (what `license-pubkey` serves),
 *  - private key: PKCS#8 DER base64 (what the keygen script writes).
 */
export type RawKeyPair = {
  publicKey: string
  privateKey: string
}

export function signPayload(payloadJson: string, privateKeyB64: string): Buffer {
  const keyObject = createPrivateKey({
    key: decodeBase64(privateKeyB64),
    format: 'der',
    type: 'pkcs8'
  })
  return cryptoSign(null, Buffer.from(payloadJson, 'utf8'), keyObject)
}

export function verifySignature(data: Buffer, signature: Buffer, publicKeyB64: string): boolean {
  try {
    const keyObject = createPublicKey({
      key: decodeBase64(publicKeyB64),
      format: 'der',
      type: 'spki'
    })
    return cryptoVerify(null, data, keyObject, signature)
  } catch {
    return false
  }
}
