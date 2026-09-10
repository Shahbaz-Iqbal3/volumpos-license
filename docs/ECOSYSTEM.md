# VolumPOS Ecosystem — Setup & Operations Reference

Last updated: 2026-09-10

This document records how the VolumPOS product family, its shared license
package, and its release/CI wiring are set up. It is the reference for anyone
picking the system up later.

---

## 1. Repositories

| Repo | Visibility | Default branch | Purpose |
|---|---|---|---|
| `Shahbaz-Iqbal3/volumpos-license` | **Private** | `main` | Shared license package (`@volumpos/license`). |
| `Shahbaz-Iqbal3/volumpos-licensing-hub` | **Private** | `main` | Licensing Hub: Supabase schema, `/activate`, `/renew`, `/verify`, `/admin`, admin panel. |
| `Shahbaz-Iqbal3/resturent-pos` | **Private** | `restaurant-pivot` | VolumPOS Restaurant (Electron + React + SQLite). |
| `Shahbaz-Iqbal3/desktop_POS` | **Private** | `main` | VolumPOS Fabrics (Electron + React + SQLite). Also publishes to `volumpos-releases`. |
| `Shahbaz-Iqbal3/volumpos-releases` | **Public** | `main` | Release artifacts consumed by the landing page. |

Local checkout layout:

```
F:\Projects\POS\
├── volumpos-license\          # shared package (own git repo)
├── volumpos-licensing-hub\    # licensing hub (own git repo)
├── resturent-pos\             # Restaurant product (own git repo)
│   ├── desktop_POS\           # the Electron app
│   ├── pwa-app\               # owner dashboard PWA
│   └── supabase\              # edge functions
├── Fabric_POS\                # Fabrics product (own git repo)
│   └── desktop_POS\
└── dev-dashboard\             # legacy local license issuer (pre-hub)
```

---

## 2. The shared license package

### 2.1 Design

- **Algorithm:** Ed25519. Signature covers the raw UTF-8 JSON payload bytes.
- **Key format:** base64 DER — public key SPKI, private key PKCS#8. Compatible
  with the pre-existing `license-keys.json` and the dashboard's encrypted vault.
- **Wire format:** `base64url(JSON) + "." + base64url(signature)`.
- **One keypair for the whole family.** The public key is baked into each
  product; the private key only lives in the licensing hub / encrypted vault.

### 2.2 Wire payload fields

Legacy fields (must never change, old keys depend on them):

| Field | Meaning |
|---|---|
| `m` | Machine hash — legacy `sha256(node-machine-id)[0:32]`, or composite fingerprint hash |
| `s` | Shop / customer name |
| `e` | Expiry, ISO-8601 |
| `t` | Duration tier (`1y` / `2y` / `5y` / `custom`) |
| `c` | Legacy LAN seat count |

Additive v2 fields:

| Field | Meaning |
|---|---|
| `v` | Payload version (2) |
| `lid` | License id (`LIC-…`) |
| `cid` | Customer id (`CUST-…`) |
| `p` | Product (`FABRIC_POS` / `RESTAURANT_POS`) |
| `ty` | License type (`perpetual` / `subscription`) |
| `fp` | Per-source fingerprint map for fuzzy matching |
| `f` | Feature list |
| `dm` | Duration months (subscription cycle) |
| `al` | Activation limit (machines) |
| `ia` | Issued-at ISO |

> `c` (LAN seats) and `al` (machine activations) are **different** concepts and
> both exist deliberately.

### 2.3 Machine fingerprinting

`getMachineFingerprint()` collects and hashes these sources:

`machine-guid` (registry MachineGuid / IOPlatformUUID / machine-id), `cpu`,
`disk` (serial), `bios` (UUID), `mac`, `hostname`.

Each source is hashed before leaving the module. `matchFingerprint()` requires
**half the sources (rounded up, minimum 1)** — so a 3-source license tolerates
one changed component.

### 2.4 Backward compatibility (critical)

`verifyLicenseKey()` handles two shapes in one code path:

- **Legacy keys** (no `fp`): exact match against `sha256(machineId)[0:32]` using
  `node-machine-id`. Existing issued licenses keep working.
- **v2 keys** (with `fp`): fuzzy per-source match.

The existing **Fabric private key already signs keys the baked-in public key
verifies** — it is the family key. No rotation was performed, so current
customers are unaffected.

### 2.5 Private key policy

| Question | Decision |
|---|---|
| Where | Private key is **only** in the licensing hub secret store / encrypted vault. Never in a repo. |
| Backups | Manual copy of the backup file to multiple sites. |
| Rotation | Not automated yet. `npm run keygen` exists but must not be run casually — see §6. |
| In the package | **No key material.** `signLicense(payload, privateKey)` takes the key as an argument. |

> Publishing the **verifier** does not weaken security: the verifier and public
> key already ship inside the Electron asar. Only the private key matters.

---

## 3. Private package distribution

The package is consumed as a **pinned git dependency**:

```json
"@volumpos/license": "git+https://github.com/Shahbaz-Iqbal3/volumpos-license.git#v0.1.0"
```

npm resolves this to `git+ssh://git@github.com/…` in the lockfile, which is what
lets the deploy key work in CI.

### 3.1 Deploy key

- **Location (this machine):** `C:\Users\DELL\.config\kilo\volumpos-license-deploy\`
  - `volumpos_license_deploy` (private)
  - `volumpos_license_deploy.pub` (public)
- **GitHub:** added to `volumpos-license` as a **read-only** deploy key
  (`read_only: true`, id `162837794`, title `CI read-only deploy key`).
- **Not in any repo.** Keep this file; it is the CI credential.

### 3.2 CI wiring

Secret **`VOLUMPOS_LICENSE_DEPLOY_KEY`** is set on:

- `Shahbaz-Iqbal3/resturent-pos` — set 2026-09-10T06:00:26Z
- `Shahbaz-Iqbal3/desktop_POS` — set 2026-09-10T05:07:18Z

The workflow step in `resturent-pos/.github/workflows/release.yml` (before
`npm ci`):

```yaml
- name: Add read-only deploy key for @volumpos/license
  shell: bash
  env:
    DEPLOY_KEY: ${{ secrets.VOLUMPOS_LICENSE_DEPLOY_KEY }}
  run: |
    mkdir -p ~/.ssh
    printf '%s\n' "$DEPLOY_KEY" > ~/.ssh/volumpos_license_deploy
    chmod 600 ~/.ssh/volumpos_license_deploy
    ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null
    echo "GIT_SSH_COMMAND=ssh -i $HOME/.ssh/volumpos_license_deploy -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new" >> "$GITHUB_ENV"
    git config --global url."git@github.com:".insteadOf "https://github.com/"
```

**Fabric note:** `Fabric_POS` does not yet depend on the package, so its
workflow has no deploy-key step. Add the same block when Fabric is integrated
(Phase 3).

### 3.3 Local development

Local `npm install` uses the machine's GitHub credential manager entry
(`git:https://github.com`). No extra setup needed on this machine.

---

## 4. Release process

### 4.1 Publish a new package version

```bash
cd F:\Projects\POS\volumpos-license
# edit src, then:
npm test
npm run typecheck
npm run build          # regenerates dist/ (dist IS committed)
git add -A
git commit -m "…"
git tag v0.1.1
git push origin main --tags
```

Then bump the dependency in each product to `#v0.1.1` and run `npm install` to
refresh the lockfile.

> `dist/` is committed deliberately so CI needs no TypeScript build of the
> dependency. Always run `npm run build` before committing.

### 4.2 Publish a product release

Products publish on a GitHub Release event (`release.yml`):
`npm ci` → inject env → `electron-vite build` → `electron-builder --publish`.

---

## 5. Secrets inventory (names only)

| Where | Name | Purpose |
|---|---|---|
| `resturent-pos` Actions | `VOLUMPOS_LICENSE_DEPLOY_KEY` | Read-only deploy key for the package repo. |
| `desktop_POS` Actions | `VOLUMPOS_LICENSE_DEPLOY_KEY` | Same. |
| Product Actions | `SUPABASE_*`, `VITE_*`, `GH_UPLOAD_TOKEN`, `WINDOWS_CSC_*` | Cloud sync + release signing. |
| `dev-dashboard/.env` (local) | `LICENSE_VAULT_PASSWORD`, `LICENSE_SIGN_SECRET`, `DASHBOARD_PASSWORD` | Legacy issuer. |
| Licensing hub (Supabase secrets) | `LICENSE_PRIVATE_KEY`, `LICENSE_ADMIN_SECRET` | Family signing key + admin API gate. |

Never commit these. `.env`, `license-vault.enc`, and `license-keys.json` are all
gitignored.

---

## 6. Key rotation runbook (only if the private key leaks)

1. `npm run keygen` → new public/private pair.
2. Store the new private key in the hub secret store.
3. Bake the new public key into every product (replace the constant in each
   `src/main/license.ts`, or set `POS_LICENSE_PUBLIC_KEY` at build time).
4. **Re-issue every active license** — old keys will no longer verify.
5. Backfill: use the hub's `customers`/`licenses` records to re-sign.

This is disruptive, which is why the current keypair is being reused.

---

## 7. Phase plan & status

| Phase | Scope | Status |
|---|---|---|
| **0** | No disruption to existing customers | Done by design — legacy keys still verify; only license code changed. |
| **1** | Shared license module | **Done.** Package built, tested, hosted privately, and integrated into `resturent-pos`. |
| **2** | Licensing Hub (Supabase): tables + `/activate`, `/renew`, `/verify` + admin panel | **Code complete, not yet deployed.** See §9. |
| **3** | Roll out to all products: Fabric integration, activation screen, multi-machine, silent renew | Not started. |
| **4** | Backfill existing customers at natural touchpoints | Not started. |
| **5** | Retire legacy code; enable abuse alerts | Not started. |

### Decisions locked in

| Topic | Decision |
|---|---|
| Signing | Ed25519, one shared keypair, offline verification |
| Machine ID | Multi-identifier hash, fuzzy match |
| License format | One shared schema with `product` |
| Subscriptions | Short-lived license (cycle + buffer), renewed via `/renew`, backed by `subscriptions.status` |
| Grace period | ~1 week offline tolerance, then read-only |
| Durations | Single `expires_at` + optional `duration_months`; presets 1m/2m/4m/6m/1y/2y and custom dates |
| Cloud split | Hub is fully separate from customer data-sync Supabase |
| Activation | Requires internet; one round trip; no manual fingerprint/file exchange |
| Multi-machine | `activation_limit` per license; same key per machine |
| Renewal | Silent; key entered once; renewals use stored `license_id` + fingerprint |
| Key backup | Manual file copy to multiple sites |
| Payments | Manual now, structured for automated integration later |
| Default activations | 1 machine, editable |
| Obfuscation | Simplest option (`javascript-obfuscator`), not native modules |
| Package hosting | Private GitHub repo + pinned git tag + read-only deploy key |

### Open items

- [ ] Confirm private-key backup locations and who holds them.
- [ ] Decide payment integration (JazzCash/Easypaisa manual vs merchant API) — manual for now.
- [ ] Decide obfuscation rollout timing (Phase 3/5).

---

## 8. Licensing Hub (Phase 2)

Repo: `Shahbaz-Iqbal3/volumpos-licensing-hub` (private). See its own README for
the full deploy runbook. Summary:

### 9.1 What it is

A **separate** Supabase project, developer-owned, decoupled from every
customer's data-sync project. Exposed only via Edge Functions.

### 9.2 Schema

`customers`, `subscriptions`, `licenses`, `machine_activations`, `checkin_log`,
plus `id_counters` for race-safe human ids (`CUST-0001`, `LIC-0000001`).

- RLS is enabled on every table with **no policies** — only `service_role`
  (used inside the Functions) can read or write.
- The **purchase key is never stored**: only `key_hash` (SHA-256) and
  `key_last4`. The raw key is returned exactly once at issuance.

### 9.3 Endpoints

| Function | Auth | Purpose |
|---|---|---|
| `POST /activate` | purchase key | First activation; returns a signed license. Same machine → re-issue. |
| `POST /renew` | `license_id` + fingerprint | Silent subscription check-in; returns a fresh license. |
| `POST /verify` | `x-admin-secret` | Support lookup. |
| `POST /admin` | `x-admin-secret` | Issue customers/licenses/subscriptions; stats. |

All deploy with `--no-verify-jwt`; safety comes from the purchase key / admin
secret, not a user session.

### 9.4 Why there are two signers

Edge Functions run on **Deno** and cannot import the Node build of
`@volumpos/license`. `supabase/functions/_shared/licenseSign.ts` is therefore a
WebCrypto implementation of the same wire format. Trust is enforced by tests:
`test/crossCompat.test.ts` signs in the hub and verifies with the package, and
asserts the two serialize a payload to **byte-identical JSON**. 19 tests pass.

### 9.5 Deploy status — LIVE

**Deployed and verified end-to-end on 2026-09-10.**

| Item | Value |
|---|---|
| Supabase project | `VolumPOS-License-Hub` |
| Project ref | `pmtoxlydnookibkwnbac` |
| Region | `ap-south-1` |
| Functions URL | `https://pmtoxlydnookibkwnbac.supabase.co/functions/v1` |
| Deployed functions | `activate`, `renew`, `verify`, `admin` (all ACTIVE) |
| Migration | `0001_licensing_hub.sql` applied |

Secrets set: `LICENSE_PRIVATE_KEY` (the family key from
`Fabric_POS/desktop_POS/license-keys.json`) and `LICENSE_ADMIN_SECRET` (generated;
stored locally at
`C:\Users\DELL\.config\kilo\volumpos-license-deploy\hub-admin-secret.txt`).

Verified behaviour:
- `/admin` issues customers and licenses; purchase key shown once.
- `/activate` returns a license that **the real `@volumpos/license` package
  verifies**, including fuzzy matching (1 of 3 sources changed still valid).
- Same machine re-issues without consuming a seat; a second seat is granted
  under the limit; a third is denied `409`.
- `/renew` is idempotent outside the renewal window and advances a subscription
  exactly one cycle + 7-day buffer inside it.
- Revoked licenses are denied on both `/activate` (403) and `/renew`
  (`billing: false`).
- `/verify` and `/admin` reject requests without the admin secret (403).

Active deployed project uses the **live family key**, so licenses it issues are
accepted by current product builds. No key rotation was needed.

### 9.6 Admin panel

`admin.html` is static. Serve it locally (e.g. `npx serve` in the hub repo),
then enter:
- Hub base URL: `https://pmtoxlydnookibkwnbac.supabase.co/functions/v1`
- Admin secret: the value in `hub-admin-secret.txt`

### 9.7 Rotating the PAT

The Supabase personal access token used for deployment was shared in plaintext
during setup. **Rotate it** in Supabase (Account → Access Tokens) once no longer
needed, and update any place it was stored.

---

## 9. Known constraints / gotchas

1. **Legacy issuer is local-only.** `dev-dashboard` is still the current keygen.
   It has no Supabase. The hub replaces it in Phase 2.
2. **Seat enforcement is dead code** in `resturent-pos` (`occupySeat`/
   `releaseSeat` have no callers). Do not assume the LAN seat cap works.
3. **Signature is verified at activation only.** After that, the stored
   `licenseExpiry` in the SQLite `settings` table is trusted. Phase 3 should
   re-verify at startup.
4. **`getMachineId()` still returns the raw `node-machine-id`** for display and
   legacy keys; the v2 fuzzy path uses `getMachineFingerprintHash()`.
5. **`pwa-app/js/config.js` contains a Supabase `anon` key and a VAPID public
   key.** Both are public by design; the code rejects service-role keys.
6. **Git Bash's `ssh` crashed on this machine** (stackdump). Use Windows
   OpenSSH (`C:\WINDOWS\System32\OpenSSH\ssh.exe`) when testing SSH locally.
