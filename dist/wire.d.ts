import type { LicensePayload, MachineFingerprint } from './types.js';
/**
 * Wire field names. Kept short because the payload is embedded in the license
 * key string. The first five are the legacy shape and must not change:
 *   m = machine hash, s = shop, e = expiry, t = tier, c = seat count.
 * New v2 fields are additive and optional.
 */
export type WirePayload = {
    v?: number;
    lid?: string;
    cid?: string;
    p?: string;
    ty?: string;
    m: string;
    s: string;
    e: string;
    t?: string;
    /** Per-source fingerprint hashes for the fuzzy match. */
    fp?: MachineFingerprint;
    /** Features. */
    f?: string[];
    /** Duration months (subscription cycles). */
    dm?: number;
    /** Activation limit (machines). */
    al?: number;
    /** Maximum branches for multi-branch products. */
    bl?: number;
    c?: number;
    ia?: string;
};
export declare function toWire(payload: LicensePayload): WirePayload;
export declare function fromWire(raw: Record<string, unknown>): LicensePayload;
//# sourceMappingURL=wire.d.ts.map