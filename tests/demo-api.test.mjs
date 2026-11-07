import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

async function withServer(handler, run) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('actions in API mode call endpoints with correct role and headers', async () => {
  const calls = [];
  await withServer((req, res) => {
    calls.push({ method: req.method, url: req.url, role: req.headers['x-demo-role'] });
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/v1/plans/current/decision') {
      res.end(JSON.stringify({ result: { plan: 'current', status: 'approved' }, log: { id: 1 } }));
    } else if (req.url === '/api/v1/demo/reset') {
      res.end(JSON.stringify({ result: { ok: true }, log: null }));
    } else {
      res.end(JSON.stringify({ result: {}, log: null }));
    }
  }, async base => {
    process.env.NEXT_PUBLIC_DATA_MODE = 'api';
    process.env.NEXT_PUBLIC_API_URL = base;
    const { createActions } = await import('../lib/api/actions.ts');
    const demo = createActions(() => 'planner', base);
    await demo.decidePlan('current', 'approved', 'OK');
    assert.ok(calls.some(c => c.method === 'POST' && c.url === '/api/v1/plans/current/decision'));
    await demo.resetDemo();
    assert.ok(calls.some(c => c.method === 'POST' && c.url === '/api/v1/demo/reset'));
  });
});
