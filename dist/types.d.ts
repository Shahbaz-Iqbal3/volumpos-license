/** The product family member a license belongs to. New products add a value here. */
export type Product = 'FABRIC_POS' | 'RESTAURANT_POS' | (string & {});
/** A one-time grant (sold term) or a short-lived subscription license. */
export type LicenseType = 'perpetual' | 'subscription';
/** A single hardware signal used to build a machine fingerprint. */
export type FingerprintSource = 'machine-guid' | 'cpu' | 'disk' | 'bios' | 'mac' | 'hostname';
/** The signals collected on this machine, keyed by source. Only present entries
 *  count toward the fuzzy match. */
export type MachineFingerprint = Partial<Record<FingerprintSource, string>>;
/**
 * The signed payload carried by a license key. This is the *stable wire shape*:
 * it is JSON inside the signature, so new optional fields never require a
 * keypair rotation.
 *
 * Legacy keys issued before this package carry only `{ m, s, e, t, c? }`:
 *  - `m` is `sha256(node-machine-id)[0:32]`,
 *  - `t` is the duration tier (`1y` / `2y` / `5y`) or `custom`,
 *  - `c` is the legacy LAN seat count.
 * Those keys must keep verifying unchanged; `verifyLicenseKey` maps them onto
 * this payload (see `parseLicensePayload`).
 */
export type LicensePayload = {
    /** Payload schema version. `1` when absent (legacy keys). */
    v?: number;
    /** License id, e.g. `LIC-0001872`. Generated locally by the issuer. */
    lid?: string;
    /** Customer id, e.g. `CUST-0042`. */
    cid?: string;
    /** Product family member. */
    product?: Product;
    /** One-time grant or subscription. */
    type?: LicenseType;
    /** Human-readable shop/customer name (legacy field `s`). */
    shop: string;
    /** Machine fingerprint hash (legacy field `m`). */
    fingerprint: string;
    /** Expiry as an ISO-8601 string. */
    expiresAt: string;
    /** Duration tier for a one-time grant (`1y` / `2y` / `5y` / `custom`). */
    tier?: string;
    /** Feature flags unlocked by this license. */
    features?: string[];
    /** Billing cycle length in months, for subscription licenses. */
    durationMonths?: number;
    /** Max machines this license may be activated on. */
    activationLimit?: number;
    /** Max branches allowed when the `multi_branch` feature is present. */
    branchLimit?: number;
    /** Legacy LAN seat count (field `c`). Distinct from `activationLimit`. */
    seats?: number;
    /** Issue timestamp, ISO-8601. */
    issuedAt?: string;
    /** Per-source fingerprint hashes for the fuzzy machine match (wire field `fp`).
     *  Absent on legacy keys, which fall back to an exact `machineId` match. */
    sources?: MachineFingerprint;
};
/** The result of a successful `verifyLicenseKey`. */
export type VerifiedLicense = {
    /** Always true — failures return the `VerifyFailure` shape instead. */
    ok: true;
    /** The normalized payload. */
    payload: LicensePayload;
    /** Convenience alias of `payload.shop`. */
    shopName: string;
    /** Convenience alias of `payload.expiresAt`. */
    expiresAt: string;
    /** Legacy `t` value, or undefined. */
    tier?: string;
    /** Legacy LAN seat count, defaulting to 1. */
    seatCount: number;
    /** Activation limit, defaulting to `DEFAULT_ACTIVATION_LIMIT`. */
    activationLimit: number;
    /** Maximum allowed branches (single-branch by default). */
    branchLimit: number;
    /** Signed feature entitlements. Undefined means a legacy license with all features. */
    features?: string[];
};
export type VerifyFailure = {
    ok: false;
    error: string;
    /** Which stage failed, for callers that need to distinguish. */
    reason?: 'malformed' | 'encoding' | 'signature' | 'payload' | 'machine' | 'machine-mismatch' | 'machine-weak' | 'expiry';
};
export type VerifyResult = VerifiedLicense | VerifyFailure;
/** Per-source match detail returned by `matchFingerprint`. */
export type FingerprintMatch = {
    /** True when the number of matching sources meets the required threshold. */
    ok: boolean;
    /** Sources present in both the license fingerprint map and this machine. */
    matched: FingerprintSource[];
    /** Sources present on this machine but not on the license. */
    missing: FingerprintSource[];
    /** How many sources matched, and how many were required. */
    matchedCount: number;
    required: number;
};
/** Returned by the product-facing status state machine. */
export type LicenseState = 'valid' | 'grace' | 'expired' | 'trial' | 'none';
export type LicenseStatus = {
    state: 'valid';
    shopName: string;
    expiry: string;
    daysRemaining: number;
} | {
    state: 'grace';
    shopName: string;
    expiry: string;
    daysRemaining: number;
} | {
    state: 'trial';
    daysRemaining: number;
    expiry: string;
} | {
    state: 'expired';
    shopName: string;
    expiry: string;
} | {
    state: 'none';
};
//# sourceMappingURL=types.d.ts.map