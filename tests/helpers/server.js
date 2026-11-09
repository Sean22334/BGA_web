import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function startTestServer(t, extraEnv = {}) {
  const uploads = await mkdtemp(path.join(tmpdir(), 'bga-admin-tests-'));
  const child = spawn(process.execPath, ['server/server.js'], {
    cwd: fileURLToPath(new URL('../..', import.meta.url)), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development', PORT: '0', BGA_DEV_MEMORY: 'true', DB_HOST: '127.0.0.1', DB_PORT: '1',
      JWT_SECRET: 'local-admin-test-secret-not-for-production', ADMIN_EMAIL: 'admin-test@example.com', ADMIN_PASSWORD: 'local-only-test-password', BGA_UPLOAD_DIR: uploads, ...extraEnv }
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) { child.kill(); await once(child, 'exit'); }
    await rm(uploads, { recursive: true, force: true });
  });
  const base = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error(`Test server startup timed out: ${output}`)), 15000);
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Test server exited ${code}: ${output}`)); });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.stdout.on('data', (chunk) => {
      output += chunk;
      const match = /running on port (\d+)/.exec(output);
      if (match) { clearTimeout(timer); resolve(`http://127.0.0.1:${match[1]}`); }
    });
  });
  const request = async (route, { method = 'GET', body, token } = {}) => {
    const response = await fetch(`${base}/api${route}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const text = await response.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    return { status: response.status, data };
  };
  const { data: login } = await request('/auth/login', { method: 'POST', body: { email: 'admin-test@example.com', password: 'local-only-test-password' } });
  return { request, token: login.token, base, uploads };
}
