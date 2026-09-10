import type { LicensePayload } from './types.js';
/**
 * Build a license key from a payload: `base64url(json) + "." + base64url(sig)`.
 * The signature covers the raw UTF-8 JSON bytes, exactly like the legacy
 * keygen, so any consumer of the old format can still verify these keys. The
 * payload is serialized with the compact wire field names (`wire.ts`).
 */
export declare function signLicense(payload: LicensePayload, privateKeyB64: string): string;
/**
 * Add days to a date and return an ISO string. Used for term licenses and for
 * the subscription buffer window.
 */
export declare function expiryFromDays(days: number, from?: Date): string;
/** Add whole months to a date (calendar-aware) and return an ISO string. */
export declare function expiryFromMonths(months: number, from?: Date): string;
//# sourceMappingURL=sign.d.ts.map