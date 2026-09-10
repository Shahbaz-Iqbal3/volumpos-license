// Node's Buffer is used directly. Every host here (Electron main process, the
// Node issuer, Edge Functions) has it; bundlers do not shim it away because the
// package ships as compiled dist and is externalized from the client build.
export function encodeBase64Url(input) {
    const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : Buffer.from(input);
    return buf.toString('base64url');
}
export function decodeBase64UrlToString(value) {
    return Buffer.from(value, 'base64url').toString('utf8');
}
export function decodeBase64Url(value) {
    return Buffer.from(value, 'base64url');
}
export function encodeBase64(input) {
    return Buffer.from(input).toString('base64');
}
export function decodeBase64(value) {
    return Buffer.from(value, 'base64');
}
//# sourceMappingURL=base64.js.map