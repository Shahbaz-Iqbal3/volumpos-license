import { DEFAULT_ACTIVATION_LIMIT } from './constants.js';
import { decodeBase64Url, decodeBase64UrlToString } from './base64.js';
import { verifySignature } from './crypto.js';
import { legacyMachineHash } from './sha256.js';
import { buildFingerprint, matchFingerprint } from './fingerprint.js';
import { fromWire } from './wire.js';
function fail(reason, error) {
    return { ok: false, reason, error };
}
/**
 * Verify a license key offline.
 *
 * Legacy keys (issued before this package) carry only `{ m, s, e, t, c? }` and
 * are matched exactly against `legacyMachineHash(machineId)`. Keys with a v2
 * `fp` source map are matched fuzzily. Both share this one code path.
 */
export function verifyLicenseKey(key, publicKeyB64, options = {}) {
    const parts = key.trim().split('.');
    if (parts.length !== 2)
        return fail('malformed', 'Malformed license key');
    const [payloadB64, sigB64] = parts;
    let payloadJson;
    let raw;
    try {
        payloadJson = decodeBase64UrlToString(payloadB64);
        raw = JSON.parse(payloadJson);
    }
    catch {
        return fail('payload', 'Invalid payload JSON');
    }
    if (!verifySignature(Buffer.from(payloadJson, 'utf8'), decodeBase64Url(sigB64), publicKeyB64)) {
        return fail('signature', 'Invalid signature');
    }
    const payload = fromWire(raw);
    if (options.product && payload.product && payload.product !== options.product) {
        return fail('machine-mismatch', `License is for ${payload.product}, not ${options.product}`);
    }
    const expiry = new Date(payload.expiresAt);
    if (isNaN(expiry.getTime()))
        return fail('expiry', 'Invalid expiry date');
    if (options.enforceExpiry && expiry.getTime() < Date.now()) {
        return fail('expiry', 'License has expired');
    }
    const isLegacy = raw.m !== undefined && raw.fp === undefined;
    const matchesMachine = () => {
        if (isLegacy) {
            if (!options.machineId)
                return false;
            return payload.fingerprint === legacyMachineHash(options.machineId);
        }
        if (payload.sources && options.fingerprint) {
            return matchFingerprint(payload.sources, options.fingerprint, options.requiredMatches).ok;
        }
        // v2 key presented by a host that can only compute a legacy id, or a
        // single-source fingerprint. Fall back to recomputing the composite when
        // possible, otherwise the legacy hash.
        if (options.machineId) {
            return (payload.fingerprint === legacyMachineHash(options.machineId) ||
                payload.fingerprint === buildFingerprint(options.fingerprint ?? {}));
        }
        return false;
    };
    if (!matchesMachine()) {
        const reason = isLegacy && !options.machineId ? 'machine' : 'machine-mismatch';
        return fail(reason, 'License key is for a different machine');
    }
    return {
        ok: true,
        payload,
        shopName: payload.shop,
        expiresAt: payload.expiresAt,
        tier: payload.tier,
        seatCount: payload.seats ?? 1,
        activationLimit: payload.activationLimit ?? DEFAULT_ACTIVATION_LIMIT
    };
}
//# sourceMappingURL=verify.js.map