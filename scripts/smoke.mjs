import assert from 'node:assert/strict';
const base = process.argv[2] || 'http://127.0.0.1:3000';
const expectedRevision = process.argv[3];
async function request(path, status = 200) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, status, `${path}: HTTP ${response.status}`);
  const data = await response.json();
  assert.equal(response.headers.get('x-request-id'), data.requestId);
  assert.match(data.requestId, /^[a-f0-9-]{36}$/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return data;
}
let ready = false;
for (let attempt = 0; attempt < 30; attempt++) {
  try { await request('/api/health'); ready = true; break; }
  catch { await new Promise(resolve => setTimeout(resolve, 2000)); }
}
assert.ok(ready, 'API não ficou pronta');
const health = await request('/api/health');
assert.equal(health.status, 'ok');
assert.equal(typeof health.uptimeSeconds, 'number');
const version = await request('/api/version');
assert.equal(version.service, 'devops-lab');
if (expectedRevision) assert.equal(version.revision, expectedRevision, 'Revisão implantada diferente da esperada');
const work = await request('/api/work?iterations=10');
assert.equal(work.iterations, 10);
assert.match(work.digest, /^[a-f0-9]{64}$/);
for (const invalid of ['0', '-1', '20001', 'NaN', '1.5', '']) {
  assert.ok((await request(`/api/work?iterations=${invalid}`, 400)).error);
}
const page = await fetch(base);
assert.equal(page.status, 200);
assert.match(await page.text(), /Mission control/);
console.log('Smoke OK: página, saúde, versão, trabalho, validação de entrada e request IDs.');
