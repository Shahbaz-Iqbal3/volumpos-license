import { execFileSync } from 'child_process';
import os from 'os';
import nodeMachineId from 'node-machine-id';
import { sha256Hex } from './sha256.js';
const { machineIdSync } = nodeMachineId;
const COMMAND_TIMEOUT_MS = 4000;
function run(command, args) {
    try {
        const output = execFileSync(command, args, {
            timeout: COMMAND_TIMEOUT_MS,
            stdio: ['ignore', 'pipe', 'ignore'],
            windowsHide: true
        });
        return output.toString();
    }
    catch {
        return null;
    }
}
function normalize(value) {
    if (!value)
        return null;
    const cleaned = value.replace(/[\r\n\s]+/g, '').trim();
    return cleaned.length > 0 ? cleaned : null;
}
/** Raw machine id used by legacy licenses: registry MachineGuid on Windows,
 *  IOPlatformUUID on macOS, machine-id on Linux. */
export function getRawMachineId() {
    try {
        return machineIdSync(true);
    }
    catch {
        return 'unknown-machine';
    }
}
/** Registry MachineGuid on Windows, IOPlatformUUID on macOS, machine-id on Linux. */
function machineGuidSource() {
    const raw = getRawMachineId();
    return normalize(raw === 'unknown-machine' ? null : raw);
}
function cpuSource() {
    const cpus = os.cpus();
    const model = cpus.length > 0 ? cpus[0]?.model : null;
    return normalize(`${os.arch()}|${model ?? ''}`);
}
function hostnameSource() {
    return normalize(os.hostname());
}
/** First non-internal MAC address. Excluded from matching by default because it
 *  changes with NICs, VPNs and virtualization, but kept as a weak tie-breaker. */
function macSource() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const entry of interfaces[name] ?? []) {
            if (!entry.internal && entry.mac && entry.mac !== '00:00:00:00:00:00') {
                return normalize(entry.mac);
            }
        }
    }
    return null;
}
function diskSerialSource() {
    if (process.platform === 'win32') {
        const wmic = normalize(run('wmic', ['diskdrive', 'get', 'serialnumber']));
        if (wmic) {
            const serial = wmic.replace(/serialnumber/i, '').replace(/[^A-Za-z0-9]/g, '');
            if (serial)
                return serial;
        }
        const cim = normalize(run('powershell', ['-NoProfile', '-Command', '(Get-CimInstance Win32_DiskDrive | Select-Object -First 1).SerialNumber']));
        return cim;
    }
    if (process.platform === 'darwin') {
        const out = run('sh', ['-c', 'ioreg -rd1 -c IOPlatformExpertDevice | awk -F\\" \'/Serial/ {print $4}\'']);
        return normalize(out);
    }
    const out = run('sh', ['-c', 'cat /sys/block/sda/serial 2>/dev/null || lsblk -ndo serial 2>/dev/null | head -n 1']);
    return normalize(out);
}
function biosUuidSource() {
    if (process.platform === 'win32') {
        const wmic = normalize(run('wmic', ['csproduct', 'get', 'uuid']));
        if (wmic) {
            const uuid = wmic.replace(/uuid/i, '').replace(/[^A-Za-z0-9-]/g, '');
            if (uuid)
                return uuid;
        }
        return normalize(run('powershell', ['-NoProfile', '-Command', '(Get-CimInstance Win32_ComputerSystemProduct).UUID']));
    }
    if (process.platform === 'darwin') {
        const out = run('sh', ['-c', 'ioreg -rd1 -c IOPlatformExpertDevice | awk -F\\" \'/UUID/ {print $4}\'']);
        return normalize(out);
    }
    return normalize(run('sh', ['-c', 'cat /sys/class/dmi/id/product_uuid 2>/dev/null']));
}
const COLLECTORS = {
    'machine-guid': machineGuidSource,
    cpu: cpuSource,
    disk: diskSerialSource,
    bios: biosUuidSource,
    mac: macSource,
    hostname: hostnameSource
};
/**
 * Collect the hardware signals available on this machine. Each source is hashed
 * before it leaves this function; raw serials and UUIDs are never persisted.
 */
export function collectFingerprintSources(sources = ['machine-guid', 'cpu', 'disk', 'bios', 'mac', 'hostname']) {
    const result = {};
    for (const source of sources) {
        const value = COLLECTORS[source]?.();
        if (value)
            result[source] = sha256Hex(`${source}:${value}`).slice(0, 32);
    }
    return result;
}
/** Composite fingerprint hash. This is what a simple `fingerprint` field stores. */
export function buildFingerprint(sources) {
    const canonical = Object.keys(sources)
        .sort()
        .map((key) => `${key}=${sources[key]}`)
        .join('|');
    return sha256Hex(canonical).slice(0, 32);
}
/** Convenience: collect and hash in one step. */
export function getMachineFingerprint(sources) {
    const collected = collectFingerprintSources(sources);
    return { fingerprint: buildFingerprint(collected), sources: collected };
}
/** How many matching sources to require for a fingerprint that carries `count`
 *  of them: half (rounded up), never below `MIN_FINGERPRINT_MATCHES`. So a
 *  3-source fingerprint needs 2, a 2-source fingerprint needs 1. */
export function requiredFingerprintMatches(count) {
    return Math.max(1, Math.ceil(count * 0.5));
}
/**
 * Fuzzy match: compare the per-source hashes stored on the license (`expected`)
 * against the sources collected from this machine (`actual`). Only sources
 * present in both sets are compared; extra or missing sources are tolerated as
 * long as enough match.
 */
export function matchFingerprint(expected, actual, required) {
    const expectedKeys = Object.keys(expected);
    const actualKeys = new Set(Object.keys(actual));
    const matched = [];
    const missing = [];
    for (const key of expectedKeys) {
        if (actualKeys.has(key) && expected[key] === actual[key]) {
            matched.push(key);
        }
        else {
            missing.push(key);
        }
    }
    const requiredCount = required ?? requiredFingerprintMatches(expectedKeys.length);
    return {
        ok: matched.length >= requiredCount,
        matched,
        missing,
        matchedCount: matched.length,
        required: requiredCount
    };
}
//# sourceMappingURL=fingerprint.js.map