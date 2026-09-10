export { LICENSE_VERSION, GRACE_PERIOD_DAYS, TRIAL_PERIOD_DAYS, RENEWAL_WINDOW_DAYS, DEFAULT_ACTIVATION_LIMIT, PRODUCTS, SUBSCRIPTION_CYCLES_MONTHS } from './constants.js';
export { encodeBase64Url, decodeBase64Url, encodeBase64, decodeBase64 } from './base64.js';
export { signPayload, verifySignature } from './crypto.js';
export { sha256Hex, legacyMachineHash } from './sha256.js';
export { generateKeyPair } from './keys.js';
export { signLicense, expiryFromDays, expiryFromMonths } from './sign.js';
export { verifyLicenseKey } from './verify.js';
export { collectFingerprintSources, buildFingerprint, getMachineFingerprint, getRawMachineId, matchFingerprint, requiredFingerprintMatches } from './fingerprint.js';
export { computeLicenseStatus, isOperational, needsRenewal } from './status.js';
//# sourceMappingURL=index.js.map