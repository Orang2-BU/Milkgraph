import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { apiGet, apiSend } from '../lib/api/client.ts';

async function withServer(handler, run) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('GET uses versioned endpoint and selected role, never substitutes mock data on failure', async () => {
  await withServer((req, res) => {
    assert.equal(req.url, '/api/v1/receiving');
    assert.equal(req.headers['x-demo-role'], 'qa');
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'UNAVAILABLE', message: 'Database tidak tersedia.' } }));
  }, async base => {
    await assert.rejects(apiGet('/receiving', 'qa', base), error => error.code === 'UNAVAILABLE' && error.message === 'Database tidak tersedia.');
  });
});

test('mutation returns backend result and log without inventing local state', async () => {
  await withServer(async (req, res) => {
    assert.equal(req.method, 'POST');
    assert.equal(req.url, '/api/v1/plans/current/decision');
    assert.equal(req.headers['x-demo-role'], 'planner');
    assert.deepEqual(JSON.parse(await new Promise(resolve => { let body = ''; req.on('data', chunk => body += chunk); req.on('end', () => resolve(body)); })), { status: 'approved', note: '' });
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ result: { plan: 'current' }, log: { id: 10 } }));
  }, async base => {
    assert.deepEqual(await apiSend('POST', '/plans/current/decision', { status: 'approved', note: '' }, 'planner', base), { result: { plan: 'current' }, log: { id: 10 } });
  });
});

test('plan check uses POST, not an invented GET endpoint', async () => {
  await withServer((req, res) => {
    assert.equal(req.method, 'POST');
    assert.equal(req.url, '/api/v1/plans/current/check');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ violations: { before: 3, after: 0 } }));
  }, async base => {
    assert.equal((await apiSend('POST', '/plans/current/check', {}, 'planner', base)).violations.before, 3);
  });
});

test('SSE sends last event ID for replay after disconnect', async () => {
  const { streamEvents } = await import('../lib/api/events.ts');
  await withServer((req, res) => {
    assert.equal(req.headers['last-event-id'], '5');
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.end('id: 6\nevent: hold.created\ndata: {"id":6}\n\n');
  }, async base => {
    const events = [];
    await streamEvents('qa', (event, id) => events.push([event, id]), new AbortController().signal, base, '5');
    assert.deepEqual(events, [['hold.created', '6']]);
  });
});

test('SSE uses role header and parses named events', async () => {
  const { streamEvents } = await import('../lib/api/events.ts');
  await withServer((req, res) => {
    assert.equal(req.url, '/api/v1/events');
    assert.equal(req.headers['x-demo-role'], 'receiving');
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.end('id: 5\nevent: plan.decided\ndata: {"id":5}\n\n');
  }, async base => {
    const events = [];
    await streamEvents('receiving', event => events.push(event), new AbortController().signal, base);
    assert.deepEqual(events, ['plan.decided']);
  });
});
