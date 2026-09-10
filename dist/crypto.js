import { createPrivateKey, createPublicKey, sign as cryptoSign, verify as cryptoVerify } from 'crypto';
import { decodeBase64 } from './base64.js';
export function signPayload(payloadJson, privateKeyB64) {
    const keyObject = createPrivateKey({
        key: decodeBase64(privateKeyB64),
        format: 'der',
        type: 'pkcs8'
    });
    return cryptoSign(null, Buffer.from(payloadJson, 'utf8'), keyObject);
}
export function verifySignature(data, signature, publicKeyB64) {
    try {
        const keyObject = createPublicKey({
            key: decodeBase64(publicKeyB64),
            format: 'der',
            type: 'spki'
        });
        return cryptoVerify(null, data, keyObject, signature);
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=crypto.js.map