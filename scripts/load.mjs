import { writeFile } from 'node:fs/promises';
const base = process.argv[2] || 'http://127.0.0.1:3000';
const requests = Number(process.argv[3] || 100);
const concurrency = Number(process.argv[4] || 5);
if (!Number.isInteger(requests) || requests < 1 || requests > 5000 || !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 20) throw new Error('Use 1–5000 requests e 1–20 workers');
const samples = [];
let next = 0;
const started = performance.now();
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (next++ < requests) {
    const start = performance.now();
    try {
      const response = await fetch(new URL('/api/work?iterations=1000', base), { signal: AbortSignal.timeout(30000) });
      await response.arrayBuffer();
      samples.push({ status: response.status, ms: performance.now() - start });
    } catch { samples.push({ status: 0, ms: performance.now() - start }); }
  }
}));
const sorted = samples.map(s => s.ms).sort((a, b) => a - b);
const result = { base, requests, concurrency, elapsedMs: performance.now() - started, failures: samples.filter(s => s.status !== 200).length, p50: sorted[Math.ceil(sorted.length * .5) - 1], p95: sorted[Math.ceil(sorted.length * .95) - 1], samples };
await writeFile('load-results.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, samples: undefined }, null, 2));
if (result.failures) process.exitCode = 1;
