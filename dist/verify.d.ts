import type { MachineFingerprint, VerifyResult } from './types.js';
export type VerifyOptions = {
    /** Legacy single machine id (`node-machine-id`, raw). Used to verify keys
     *  issued before the per-source fingerprint existed. */
    machineId?: string;
    /** Per-source hashes collected on this machine, used for the fuzzy match on
     *  v2 keys that carry a `fp` map. */
    fingerprint?: MachineFingerprint;
    /** Override the number of matching sources required. */
    requiredMatches?: number;
    /** Reject a license whose `expiresAt` is in the past. Defaults to false —
     *  the app state machine owns grace handling. */
    enforceExpiry?: boolean;
    /** Expected product. When set, a mismatched `p` is rejected. */
    product?: string;
};
/**
 * Verify a license key offline.
 *
 * Legacy keys (issued before this package) carry only `{ m, s, e, t, c? }` and
 * are matched exactly against `legacyMachineHash(machineId)`. Keys with a v2
 * `fp` source map are matched fuzzily. Both share this one code path.
 */
export declare function verifyLicenseKey(key: string, publicKeyB64: string, options?: VerifyOptions): VerifyResult;
//# sourceMappingURL=verify.d.ts.map