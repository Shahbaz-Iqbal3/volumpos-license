import { encodeBase64Url } from './base64.js';
import { signPayload } from './crypto.js';
import { toWire } from './wire.js';
/**
 * Build a license key from a payload: `base64url(json) + "." + base64url(sig)`.
 * The signature covers the raw UTF-8 JSON bytes, exactly like the legacy
 * keygen, so any consumer of the old format can still verify these keys. The
 * payload is serialized with the compact wire field names (`wire.ts`).
 */
export function signLicense(payload, privateKeyB64) {
    const payloadJson = JSON.stringify(toWire(payload));
    const signature = signPayload(payloadJson, privateKeyB64);
    return `${encodeBase64Url(payloadJson)}.${encodeBase64Url(signature)}`;
}
/**
 * Add days to a date and return an ISO string. Used for term licenses and for
 * the subscription buffer window.
 */
export function expiryFromDays(days, from = new Date()) {
    const expiry = new Date(from.getTime());
    expiry.setDate(expiry.getDate() + days);
    return expiry.toISOString();
}
/** Add whole months to a date (calendar-aware) and return an ISO string. */
export function expiryFromMonths(months, from = new Date()) {
    const expiry = new Date(from.getTime());
    expiry.setMonth(expiry.getMonth() + months);
    return expiry.toISOString();
}
//# sourceMappingURL=sign.js.map