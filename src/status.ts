import { GRACE_PERIOD_DAYS, TRIAL_PERIOD_DAYS } from './constants.js'
import type { LicenseStatus } from './types.js'

const DAY_MS = 1000 * 60 * 60 * 24

export type LicenseStatusInput = {
  /** Whether an activated license key is stored. */
  hasLicense: boolean
  /** Stored license expiry (ISO). */
  expiresAt?: string | null
  /** Stored shop name. */
  shopName?: string | null
  /** Stored trial start (ISO). Defaults to now, matching current apps. */
  trialStart?: string | null
  now?: Date
}

/**
 * The status state machine shared by every product. The stored expiry is
 * trusted here (matching the current apps); signature verification happens at
 * activation and at each startup re-check the caller chooses to run.
 */
export function computeLicenseStatus(input: LicenseStatusInput): LicenseStatus {
  const now = input.now ?? new Date()
  const shopName = input.shopName ?? 'Unknown Shop'

  if (!input.hasLicense || !input.expiresAt) {
    const trialStart = input.trialStart ? new Date(input.trialStart) : now
    const trialEnd = new Date(trialStart)
    trialEnd.setDate(trialEnd.getDate() + TRIAL_PERIOD_DAYS)
    const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / DAY_MS)
    return {
      state: 'trial',
      daysRemaining: Math.max(0, daysRemaining),
      expiry: trialEnd.toISOString()
    }
  }

  const expiry = new Date(input.expiresAt)
  if (isNaN(expiry.getTime())) return { state: 'none' }

  const graceEnd = new Date(expiry)
  graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS)

  if (now > graceEnd) return { state: 'expired', shopName, expiry: input.expiresAt }
  if (now > expiry) {
    const daysRemaining = Math.ceil((graceEnd.getTime() - now.getTime()) / DAY_MS)
    return { state: 'grace', shopName, expiry: input.expiresAt, daysRemaining }
  }
  const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / DAY_MS)
  return { state: 'valid', shopName, expiry: input.expiresAt, daysRemaining }
}

/** True when the app should allow mutating actions. Reads stay allowed always. */
export function isOperational(status: LicenseStatus): boolean {
  if (status.state === 'trial') return status.daysRemaining > 0
  return status.state === 'valid' || status.state === 'grace'
}

/** True when a subscription check-in should be attempted (inside the renewal
 *  window, before the hard expiry). */
export function needsRenewal(expiresAt: string, windowDays: number, now: Date = new Date()): boolean {
  const expiry = new Date(expiresAt)
  if (isNaN(expiry.getTime())) return true
  const windowStart = new Date(expiry)
  windowStart.setDate(windowStart.getDate() - windowDays)
  return now >= windowStart
}
