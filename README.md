# @volumpos/license

Shared Ed25519 license signing/verification and machine fingerprinting for the
**VolumPOS** product family (VolumPOS Fabrics, VolumPOS Restaurant, and future
products).

- One keypair for the whole family; the **public key** is baked into every
  product, the **private key** never leaves the licensing hub.
- One signed JSON format. Licenses issued before this package (legacy keys) keep
  verifying unchanged.
- Offline verification. After activation, no network call is needed to validate
  an already-issued license.
- Fuzzy machine fingerprinting (multiple hardware signals, match a subset) so a
  single changed component does not invalidate a license.

## Install (private repo, pinned tag)

```json
"@volumpos/license": "git+https://github.com/Shahbaz-Iqbal3/volumpos-license.git#v0.1.0"
```

CI reads this repo with a **read-only deploy key**. See
[`docs/ECOSYSTEM.md`](docs/ECOSYSTEM.md) for the full setup and release runbook.

## Usage

```ts
import {
  signLicense,        // issuer only (needs the private key)
  verifyLicenseKey,   // products (public key only)
  getMachineFingerprint,
  computeLicenseStatus,
  PRODUCTS
} from '@volumpos/license'

// Issuer:
const key = signLicense(
  {
    v: 2,
    lid: 'LIC-0001',
    product: PRODUCTS.RESTAURANT_POS,
    type: 'perpetual',
    shop: 'My Restaurant',
    fingerprint,              // composite hash
    sources,                  // per-source map for fuzzy matching
    expiresAt,
    tier: '1y',
    activationLimit: 1
  },
  process.env.LICENSE_PRIVATE_KEY!
)

// Product:
const result = verifyLicenseKey(key, PUBLIC_KEY, {
  fingerprint: getMachineFingerprint().sources,
  product: PRODUCTS.RESTAURANT_POS
})
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run build` | Compile `src/` to `dist/` (also committed, so CI needs no build step). |
| `npm test` | Unit tests for signing, verification, legacy compatibility, fingerprint, status. |
| `npm run typecheck` | Type-check without emitting. |
| `npm run keygen` | Generate a new family keypair — **do not run unless rotating keys**. |

See [`docs/ECOSYSTEM.md`](docs/ECOSYSTEM.md) for architecture, the private key
policy, and the phase plan.
