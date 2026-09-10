import { createHash } from 'crypto';
export function sha256Hex(input) {
    return createHash('sha256').update(input).digest('hex');
}
/** Legacy machine binding: `sha256(raw)[0:32]`. Kept byte-for-byte identical so
 *  licenses issued before the fingerprint change still verify. */
export function legacyMachineHash(raw) {
    return sha256Hex(raw).slice(0, 32);
}
//# sourceMappingURL=sha256.js.map