import { describe, it, expect } from 'vitest'
import {
  generateKeyPair,
  signLicense,
  verifyLicenseKey,
  legacyMachineHash,
  getMachineFingerprint,
  matchFingerprint,
  requiredFingerprintMatches,
  computeLicenseStatus,
  isOperational,
  needsRenewal,
  encodeBase64Url,
  signPayload
} from '../src/index.js'
import { expiryFromDays } from '../src/sign.js'

const keys = generateKeyPair()

function signed(payload: Record<string, unknown>, privateKey = keys.privateKey): string {
  return signLicense(payload as any, privateKey)
}

describe('sign + verify round trip (v2)', () => {
  it('verifies a license against a matching fingerprint', () => {
    const { fingerprint, sources } = getMachineFingerprint(['machine-guid', 'cpu'])
    const key = signed({
      v: 2,
      lid: 'LIC-0001',
      product: 'FABRIC_POS',
      type: 'perpetual',
      shop: 'Test Shop',
      fingerprint,
      sources,
      expiresAt: expiryFromDays(365),
      tier: '1y',
      activationLimit: 3
    })

    const result = verifyLicenseKey(key, keys.publicKey, { fingerprint: sources, product: 'FABRIC_POS' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.shopName).toBe('Test Shop')
    expect(result.activationLimit).toBe(3)
    expect(result.payload.lid).toBe('LIC-0001')
  })

  it('rejects a different machine when too few sources match', () => {
    const { sources } = getMachineFingerprint(['machine-guid', 'cpu'])
    const key = signed({
      shop: 'Test Shop',
      fingerprint: 'composite',
      sources,
      expiresAt: expiryFromDays(30)
    })
    const other = { 'machine-guid': 'deadbeef', cpu: 'deadbeef' }
    expect(verifyLicenseKey(key, keys.publicKey, { fingerprint: other }).ok).toBe(false)
  })

  it('tolerates one changed source out of three (fuzzy)', () => {
    const sources = { 'machine-guid': 'a', cpu: 'b', disk: 'c' } as any
    const now = { 'machine-guid': 'a', cpu: 'b', disk: 'CHANGED' } as any
    const key = signed({ shop: 'S', fingerprint: 'x', sources, expiresAt: expiryFromDays(30) })
    expect(requiredFingerprintMatches(3)).toBe(2)
    expect(verifyLicenseKey(key, keys.publicKey, { fingerprint: now }).ok).toBe(true)
  })

  it('rejects a tampered payload', () => {
    const key = signed({ shop: 'S', fingerprint: 'x', expiresAt: expiryFromDays(30) })
    const [payload] = key.split('.')
    const tampered = `${payload}.${Buffer.from('nope').toString('base64url')}`
    expect(verifyLicenseKey(tampered, keys.publicKey).ok).toBe(false)
  })

  it('rejects a mismatched product', () => {
    const key = signed({ shop: 'S', fingerprint: 'x', product: 'FABRIC_POS', expiresAt: expiryFromDays(30) })
    const result = verifyLicenseKey(key, keys.publicKey, { product: 'RESTAURANT_POS' })
    expect(result.ok).toBe(false)
  })
})

describe('legacy key compatibility', () => {
  it('verifies a key signed the old way (exact machine hash)', () => {
    const machineId = 'legacy-machine-id'
    const legacyJson = JSON.stringify({
      m: legacyMachineHash(machineId),
      s: 'Old Shop',
      e: expiryFromDays(30),
      t: '2y',
      c: 4
    })
    const key = `${encodeBase64Url(legacyJson)}.${encodeBase64Url(signPayload(legacyJson, keys.privateKey))}`

    const result = verifyLicenseKey(key, keys.publicKey, { machineId })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.shopName).toBe('Old Shop')
    expect(result.seatCount).toBe(4)
    expect(result.activationLimit).toBe(1)
  })

  it('rejects a legacy key for another machine', () => {
    const legacyJson = JSON.stringify({
      m: legacyMachineHash('machine-a'),
      s: 'Old Shop',
      e: expiryFromDays(30),
      t: '1y'
    })
    const key = `${encodeBase64Url(legacyJson)}.${encodeBase64Url(signPayload(legacyJson, keys.privateKey))}`
    expect(verifyLicenseKey(key, keys.publicKey, { machineId: 'machine-b' }).ok).toBe(false)
  })
})

describe('fingerprint matching', () => {
  it('computes a stable composite fingerprint', () => {
    const a = getMachineFingerprint(['cpu', 'hostname'])
    const b = getMachineFingerprint(['hostname', 'cpu'])
    expect(a.fingerprint).toBe(b.fingerprint)
    expect(a.fingerprint).toHaveLength(32)
  })

  it('requires half of the sources, at least one', () => {
    expect(requiredFingerprintMatches(1)).toBe(1)
    expect(requiredFingerprintMatches(2)).toBe(1)
    expect(requiredFingerprintMatches(3)).toBe(2)
    expect(requiredFingerprintMatches(4)).toBe(2)
  })

  it('reports matched and missing sources', () => {
    const result = matchFingerprint(
      { 'machine-guid': 'a', cpu: 'b', disk: 'c' },
      { 'machine-guid': 'a', cpu: 'X', disk: 'c' }
    )
    expect(result.ok).toBe(true)
    expect(result.matched).toEqual(['machine-guid', 'disk'])
    expect(result.missing).toEqual(['cpu'])
  })
})

describe('status state machine', () => {
  const now = new Date('2026-01-10T00:00:00Z')

  it('reports trial when no license is stored', () => {
    const status = computeLicenseStatus({ hasLicense: false, trialStart: '2026-01-08T00:00:00Z', now })
    expect(status.state).toBe('trial')
    expect(isOperational(status)).toBe(true)
  })

  it('blocks an elapsed trial', () => {
    const status = computeLicenseStatus({ hasLicense: false, trialStart: '2025-12-01T00:00:00Z', now })
    expect(status.state).toBe('trial')
    expect(status.state === 'trial' && status.daysRemaining).toBe(0)
    expect(isOperational(status)).toBe(false)
  })

  it('reports grace then expired around the expiry', () => {
    const grace = computeLicenseStatus({ hasLicense: true, expiresAt: '2026-01-08T00:00:00Z', now })
    expect(grace.state).toBe('grace')
    const expired = computeLicenseStatus({ hasLicense: true, expiresAt: '2025-12-20T00:00:00Z', now })
    expect(expired.state).toBe('expired')
    expect(isOperational(expired)).toBe(false)
  })

  it('flags renewal inside the window', () => {
    expect(needsRenewal('2026-01-13T00:00:00Z', 5, now)).toBe(true)
    expect(needsRenewal('2026-02-13T00:00:00Z', 5, now)).toBe(false)
  })
})
