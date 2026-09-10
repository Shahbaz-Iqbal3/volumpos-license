// Generate the single Ed25519 keypair shared by the whole VolumPOS family.
// Run once, then store the private key in the encrypted vault (never in a repo).
//
//   node --experimental-strip-types scripts/keygen.ts
//
// Prints the public key (bake into each app's build) and the private key
// (store in the licensing hub / vault only).
import { generateKeyPair } from '../src/keys.ts'

const keys = generateKeyPair()
console.log('Ed25519 keypair generated.')
console.log('\nPUBLIC KEY (safe to embed in products, base64 SPKI DER):')
console.log(keys.publicKey)
console.log('\nPRIVATE KEY (SECRET — store in the encrypted vault, never commit):')
console.log(keys.privateKey)
