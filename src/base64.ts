// Node's Buffer is used directly. Every host here (Electron main process, the
// Node issuer, Edge Functions) has it; bundlers do not shim it away because the
// package ships as compiled dist and is externalized from the client build.

export function encodeBase64Url(input: string | Uint8Array): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : Buffer.from(input)
  return buf.toString('base64url')
}

export function decodeBase64UrlToString(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

export function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value, 'base64url')
}

export function encodeBase64(input: Uint8Array): string {
  return Buffer.from(input).toString('base64')
}

export function decodeBase64(value: string): Buffer {
  return Buffer.from(value, 'base64')
}
