import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');
const envExamplePath = resolve(root, '.env.example');
const skipInstall = process.argv.includes('--skip-install');

function readEnv(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    let value = match[2] ?? '';
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    values[match[1]] = value;
  }
  return values;
}

function run(command, args) {
  console.info(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

try {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 11)) {
    throw new Error('PlaySpot requires Node.js 22.11 or newer.');
  }

  if (!existsSync(envPath)) {
    writeFileSync(envPath, readFileSync(envExamplePath, 'utf8'), { mode: 0o600 });
    console.info('Created the ignored frontend .env with the Android Emulator API URL.');
  }
  const env = readEnv(readFileSync(envPath, 'utf8'));
  const apiBaseUrl = process.env.PLAYSPOT_API_BASE_URL || env.PLAYSPOT_API_BASE_URL;
  if (!apiBaseUrl) throw new Error('Set PLAYSPOT_API_BASE_URL in the ignored frontend .env file.');
  let parsedUrl;
  try { parsedUrl = new URL(apiBaseUrl); } catch { throw new Error('PLAYSPOT_API_BASE_URL must be an absolute http(s) URL.'); }
  if (!['http:', 'https:'].includes(parsedUrl.protocol) || !parsedUrl.pathname.replace(/\/$/, '').endsWith('/api/v1')) {
    throw new Error('PLAYSPOT_API_BASE_URL must end with /api/v1 and use http or https.');
  }

  if (!skipInstall) run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ci']);
  console.info(`Frontend dependencies are ready. API URL: ${apiBaseUrl.replace(/\/$/, '')}`);
  console.info('Restart Metro after editing .env so Babel reloads the public API URL.');
  console.info('For a physical Android device, set PLAYSPOT_API_BASE_URL to the development host LAN address.');
} catch (error) {
  console.error(`Frontend setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exitCode = 1;
}
