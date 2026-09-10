import { LICENSE_VERSION } from './constants.js';
export function toWire(payload) {
    const wire = {
        m: payload.fingerprint,
        s: payload.shop,
        e: payload.expiresAt
    };
    if (payload.v !== undefined && payload.v !== 1)
        wire.v = payload.v;
    if (payload.lid)
        wire.lid = payload.lid;
    if (payload.cid)
        wire.cid = payload.cid;
    if (payload.product)
        wire.p = payload.product;
    if (payload.type)
        wire.ty = payload.type;
    if (payload.tier)
        wire.t = payload.tier;
    if (payload.sources && Object.keys(payload.sources).length > 0)
        wire.fp = payload.sources;
    if (payload.features && payload.features.length > 0)
        wire.f = payload.features;
    if (payload.durationMonths !== undefined)
        wire.dm = payload.durationMonths;
    if (payload.activationLimit !== undefined)
        wire.al = payload.activationLimit;
    if (payload.seats !== undefined)
        wire.c = payload.seats;
    if (payload.issuedAt)
        wire.ia = payload.issuedAt;
    return wire;
}
export function fromWire(raw) {
    const asString = (key) => typeof raw[key] === 'string' ? raw[key] : undefined;
    const asNumber = (key) => typeof raw[key] === 'number' ? raw[key] : undefined;
    const fp = raw.fp;
    const sources = fp && typeof fp === 'object' && !Array.isArray(fp) ? fp : undefined;
    return {
        v: typeof raw.v === 'number' ? raw.v : LICENSE_VERSION,
        lid: asString('lid'),
        cid: asString('cid'),
        product: asString('p'),
        type: raw.ty === 'subscription' || raw.ty === 'perpetual' ? raw.ty : undefined,
        shop: asString('s') ?? '',
        fingerprint: asString('m') ?? '',
        expiresAt: asString('e') ?? '',
        tier: asString('t'),
        features: Array.isArray(raw.f) ? raw.f : undefined,
        durationMonths: asNumber('dm'),
        activationLimit: asNumber('al'),
        seats: asNumber('c'),
        issuedAt: asString('ia'),
        sources
    };
}
//# sourceMappingURL=wire.js.map