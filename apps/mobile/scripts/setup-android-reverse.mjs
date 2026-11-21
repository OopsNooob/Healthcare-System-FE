import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

function readEnvFileVar(filePath, key) {
  if (!fs.existsSync(filePath)) return '';
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;
    const k = line.slice(0, eqIndex).trim();
    if (k !== key) continue;
    let val = line.slice(eqIndex + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1).trim();
    }
    return val;
  }
  return '';
}

function resolveConfiguredApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv;

  const fromDotEnvLocal = readEnvFileVar(
    path.join(appRoot, '.env.local'),
    'EXPO_PUBLIC_API_URL',
  );
  if (fromDotEnvLocal) return fromDotEnvLocal;

  const fromDotEnv = readEnvFileVar(
    path.join(appRoot, '.env'),
    'EXPO_PUBLIC_API_URL',
  );
  if (fromDotEnv) return fromDotEnv;

  return 'http://10.0.2.2:3000/api/v1';
}

function findAdbExecutable() {
  const adbName = process.platform === 'win32' ? 'adb.exe' : 'adb';
  const candidates = [];

  if (process.env.ANDROID_HOME) {
    candidates.push(path.join(process.env.ANDROID_HOME, 'platform-tools', adbName));
  }
  if (process.env.ANDROID_SDK_ROOT) {
    candidates.push(path.join(process.env.ANDROID_SDK_ROOT, 'platform-tools', adbName));
  }
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    candidates.push(
      path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
    );
  }
  if (process.platform === 'darwin' && process.env.HOME) {
    candidates.push(
      path.join(process.env.HOME, 'Library', 'Android', 'sdk', 'platform-tools', 'adb'),
    );
  }
  if (process.platform === 'linux' && process.env.HOME) {
    candidates.push(
      path.join(process.env.HOME, 'Android', 'Sdk', 'platform-tools', 'adb'),
    );
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return adbName;
}

function main() {
  const apiUrl = resolveConfiguredApiUrl();
  let parsed;
  try {
    parsed = new URL(apiUrl);
  } catch {
    console.warn(`[adb-reverse] Invalid EXPO_PUBLIC_API_URL "${apiUrl}" — skipping.`);
    return;
  }

  const localHosts = new Set(['10.0.2.2', 'localhost', '127.0.0.1']);
  if (!localHosts.has(parsed.hostname)) {
    console.log(`[adb-reverse] Remote API (${parsed.origin}) detected — skipping adb reverse.`);
    return;
  }

  const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
  const adbPath = findAdbExecutable();

  let devicesOutput;
  try {
    devicesOutput = execFileSync(adbPath, ['devices'], { encoding: 'utf8' });
  } catch {
    console.warn('[adb-reverse] adb unavailable — skipping Android port forwarding.');
    return;
  }

  const serials = devicesOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('List of devices attached'))
    .map((line) => /^(\S+)\s+device$/.exec(line)?.[1])
    .filter(Boolean);

  if (serials.length === 0) {
    console.log('[adb-reverse] No online Android devices/emulators found — skipping.');
    return;
  }

  for (const serial of serials) {
    try {
      execFileSync(adbPath, ['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`], {
        encoding: 'utf8',
      });
      console.log(`[adb-reverse] Forwarded ${serial}: tcp:${port} -> tcp:${port}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[adb-reverse] Failed to forward ${serial} port ${port}: ${msg}`);
    }
  }
}

main();

