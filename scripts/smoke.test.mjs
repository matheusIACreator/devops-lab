import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const execute = promisify(execFile);
const smokeScript = fileURLToPath(new URL('./smoke.mjs', import.meta.url));

async function withDeployment(rollForward, check) {
  let versionRequests = 0;
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/') { response.end('Mission control'); return; }
    const requestId = randomUUID();
    response.setHeader('content-type', 'application/json');
    response.setHeader('x-request-id', requestId);
    response.setHeader('cache-control', 'no-store');
    const revision = rollForward && versionRequests >= 1 ? 'new' : 'old';
    let payload;
    if (url.pathname === '/api/health') payload = { status: 'ok', uptimeSeconds: 1, revision };
    if (url.pathname === '/api/version') { versionRequests++; payload = { service: 'devops-lab', revision }; }
    if (url.pathname === '/api/work') {
      if (url.searchParams.get('iterations') === '10') payload = { iterations: 10, digest: 'a'.repeat(64) };
      else { response.statusCode = 400; payload = { error: 'invalid iterations' }; }
    }
    response.end(JSON.stringify({ ...payload, requestId }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await check(`http://127.0.0.1:${server.address().port}`); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

test('aguarda a revisao nova mesmo quando a antiga continua saudavel', async () => {
  await withDeployment(true, async base => {
    const result = await execute(process.execPath, [smokeScript, base, 'new'], {
      env: { ...process.env, SMOKE_READY_TIMEOUT_MS: '5000' }, timeout: 10000,
    });
    assert.match(result.stdout, /Smoke OK/);
  });
});

test('rejeita uma revisao incorreta que permanece saudavel', async () => {
  await withDeployment(false, async base => {
    await assert.rejects(execute(process.execPath, [smokeScript, base, 'new'], {
      env: { ...process.env, SMOKE_READY_TIMEOUT_MS: '500' }, timeout: 10000,
    }), error => { assert.match(error.stderr, /nao ficou pronta/); assert.match(error.stderr, /version.revision=old/); return true; });
  });
});
