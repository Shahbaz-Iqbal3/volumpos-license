import type { FingerprintMatch, FingerprintSource, MachineFingerprint } from './types.js';
/** Raw machine id used by legacy licenses: registry MachineGuid on Windows,
 *  IOPlatformUUID on macOS, machine-id on Linux. */
export declare function getRawMachineId(): string;
/**
 * Collect the hardware signals available on this machine. Each source is hashed
 * before it leaves this function; raw serials and UUIDs are never persisted.
 */
export declare function collectFingerprintSources(sources?: FingerprintSource[]): MachineFingerprint;
/** Composite fingerprint hash. This is what a simple `fingerprint` field stores. */
export declare function buildFingerprint(sources: MachineFingerprint): string;
/** Convenience: collect and hash in one step. */
export declare function getMachineFingerprint(sources?: FingerprintSource[]): {
    fingerprint: string;
    sources: MachineFingerprint;
};
/** How many matching sources to require for a fingerprint that carries `count`
 *  of them: half (rounded up), never below `MIN_FINGERPRINT_MATCHES`. So a
 *  3-source fingerprint needs 2, a 2-source fingerprint needs 1. */
export declare function requiredFingerprintMatches(count: number): number;
/**
 * Fuzzy match: compare the per-source hashes stored on the license (`expected`)
 * against the sources collected from this machine (`actual`). Only sources
 * present in both sets are compared; extra or missing sources are tolerated as
 * long as enough match.
 */
export declare function matchFingerprint(expected: MachineFingerprint, actual: MachineFingerprint, required?: number): FingerprintMatch;
//# sourceMappingURL=fingerprint.d.ts.map