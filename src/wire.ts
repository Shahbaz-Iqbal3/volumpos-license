import { LICENSE_VERSION } from './constants.js'
import type { LicensePayload, MachineFingerprint } from './types.js'

/**
 * Wire field names. Kept short because the payload is embedded in the license
 * key string. The first five are the legacy shape and must not change:
 *   m = machine hash, s = shop, e = expiry, t = tier, c = seat count.
 * New v2 fields are additive and optional.
 */
export type WirePayload = {
  v?: number
  lid?: string
  cid?: string
  p?: string
  ty?: string
  m: string
  s: string
  e: string
  t?: string
  /** Per-source fingerprint hashes for the fuzzy match. */
  fp?: MachineFingerprint
  /** Features. */
  f?: string[]
  /** Duration months (subscription cycles). */
  dm?: number
  /** Activation limit (machines). */
  al?: number
  c?: number
  ia?: string
}

export function toWire(payload: LicensePayload): WirePayload {
  const wire: WirePayload = {
    m: payload.fingerprint,
    s: payload.shop,
    e: payload.expiresAt
  }
  if (payload.v !== undefined && payload.v !== 1) wire.v = payload.v
  if (payload.lid) wire.lid = payload.lid
  if (payload.cid) wire.cid = payload.cid
  if (payload.product) wire.p = payload.product
  if (payload.type) wire.ty = payload.type
  if (payload.tier) wire.t = payload.tier
  if (payload.sources && Object.keys(payload.sources).length > 0) wire.fp = payload.sources
  if (payload.features && payload.features.length > 0) wire.f = payload.features
  if (payload.durationMonths !== undefined) wire.dm = payload.durationMonths
  if (payload.activationLimit !== undefined) wire.al = payload.activationLimit
  if (payload.seats !== undefined) wire.c = payload.seats
  if (payload.issuedAt) wire.ia = payload.issuedAt
  return wire
}

export function fromWire(raw: Record<string, unknown>): LicensePayload {
  const asString = (key: string): string | undefined =>
    typeof raw[key] === 'string' ? (raw[key] as string) : undefined
  const asNumber = (key: string): number | undefined =>
    typeof raw[key] === 'number' ? (raw[key] as number) : undefined

  const fp = raw.fp
  const sources =
    fp && typeof fp === 'object' && !Array.isArray(fp) ? (fp as MachineFingerprint) : undefined

  return {
    v: typeof raw.v === 'number' ? raw.v : LICENSE_VERSION,
    lid: asString('lid'),
    cid: asString('cid'),
    product: asString('p'),
    type: raw.ty === 'subscription' || raw.ty === 'perpetual' ? raw.ty : undefined,
    shop: asString('s') ?? '',
    fingerprint: asString('m') ?? '',
    expiresAt: asString('e') ?? '',
    tier: asString('t'),
    features: Array.isArray(raw.f) ? (raw.f as string[]) : undefined,
    durationMonths: asNumber('dm'),
    activationLimit: asNumber('al'),
    seats: asNumber('c'),
    issuedAt: asString('ia'),
    sources
  }
}
