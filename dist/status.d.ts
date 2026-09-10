import type { LicenseStatus } from './types.js';
export type LicenseStatusInput = {
    /** Whether an activated license key is stored. */
    hasLicense: boolean;
    /** Stored license expiry (ISO). */
    expiresAt?: string | null;
    /** Stored shop name. */
    shopName?: string | null;
    /** Stored trial start (ISO). Defaults to now, matching current apps. */
    trialStart?: string | null;
    now?: Date;
};
/**
 * The status state machine shared by every product. The stored expiry is
 * trusted here (matching the current apps); signature verification happens at
 * activation and at each startup re-check the caller chooses to run.
 */
export declare function computeLicenseStatus(input: LicenseStatusInput): LicenseStatus;
/** True when the app should allow mutating actions. Reads stay allowed always. */
export declare function isOperational(status: LicenseStatus): boolean;
/** True when a subscription check-in should be attempted (inside the renewal
 *  window, before the hard expiry). */
export declare function needsRenewal(expiresAt: string, windowDays: number, now?: Date): boolean;
//# sourceMappingURL=status.d.ts.map