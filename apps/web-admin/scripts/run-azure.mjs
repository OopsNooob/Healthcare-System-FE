import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

const DEFAULT_AZURE_API_URL = 'https://healthcare-2026.eastasia.cloudapp.azure.com/api/v1';
const targetApiUrl = (
  process.env.VITE_AZURE_API_BASE_URL || DEFAULT_AZURE_API_URL
)
  .trim()
  .replace(/\/+$/, '');

console.log(`[web-admin:azure] Starting Vite against ${targetApiUrl}`);

const child = spawn('pnpm', ['exec', 'vite', ...process.argv.slice(2)], {
  cwd: appRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    VITE_API_BASE_URL: targetApiUrl,
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

