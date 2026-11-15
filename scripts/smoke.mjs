import assert from 'node:assert/strict';
const base = process.argv[2] || 'http://127.0.0.1:3000';
const expectedRevision = process.argv[3];
const readyTimeoutMs = Number(process.env.SMOKE_READY_TIMEOUT_MS || 120000);
assert.ok(Number.isInteger(readyTimeoutMs) && readyTimeoutMs >= 500 && readyTimeoutMs <= 300000, 'SMOKE_READY_TIMEOUT_MS deve estar entre 500 e 300000');
async function request(path, status = 200, timeoutMs = 30000) {
  const response = await fetch(new URL(path, base), { cache: 'no-store', signal: AbortSignal.timeout(Math.max(1, Math.ceil(timeoutMs))) });
  assert.equal(response.status, status, `${path}: HTTP ${response.status}`);
  const data = await response.json();
  assert.equal(response.headers.get('x-request-id'), data.requestId);
  assert.match(data.requestId, /^[a-f0-9-]{36}$/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return data;
}
const deadline = performance.now() + readyTimeoutMs;
let ready = false;
let lastObservation = 'nenhuma resposta';
while (performance.now() < deadline) {
  try {
    const health = await request('/api/health', 200, Math.min(10000, deadline - performance.now()));
    const version = await request('/api/version', 200, Math.min(10000, deadline - performance.now()));
    lastObservation = `health=${health.status}, health.revision=${health.revision}, version.revision=${version.revision}`;
    assert.equal(health.status, 'ok');
    assert.equal(typeof health.uptimeSeconds, 'number');
    assert.equal(version.service, 'devops-lab');
    if (expectedRevision) {
      assert.equal(health.revision, expectedRevision);
      assert.equal(version.revision, expectedRevision);
    }
    ready = true;
    break;
  } catch (error) {
    if (lastObservation === 'nenhuma resposta') lastObservation = error.message;
  }
  const remaining = deadline - performance.now();
  if (remaining > 0) await new Promise(resolve => setTimeout(resolve, Math.min(2000, remaining)));
}
assert.ok(ready, `Revisao esperada ${expectedRevision || '(qualquer)'} nao ficou pronta em ${readyTimeoutMs} ms. Ultima observacao: ${lastObservation}`);
const work = await request('/api/work?iterations=10');
assert.equal(work.iterations, 10);
assert.match(work.digest, /^[a-f0-9]{64}$/);
for (const invalid of ['0', '-1', '20001', 'NaN', '1.5', '']) {
  assert.ok((await request(`/api/work?iterations=${invalid}`, 400)).error);
}
const page = await fetch(base, { signal: AbortSignal.timeout(30000) });
assert.equal(page.status, 200);
assert.match(await page.text(), /Mission control/);
console.log('Smoke OK: revisao esperada, pagina, saude, trabalho, validacao de entrada e request IDs.');
