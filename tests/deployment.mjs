import assert from "node:assert/strict";

const base = new URL(process.env.BASE_URL ?? "http://127.0.0.1:3000");
const get = path => fetch(new URL(path, base), { signal: AbortSignal.timeout(15000), redirect: "error" });
const health = await get("/api/health");
assert.equal(health.status, 200, "health status");
assert.deepEqual(await health.json(), { status: "ok", service: "milkgraph-frontend" });

const routes = ["/", "/simulasi", "/tangki", "/filling", "/rencana", "/pasokan", "/constraint", "/persetujuan", "/trace", "/lab", "/hold", "/graph", "/sumber-data", "/pengguna"];
let home;
for (const route of routes) {
  const response = await get(route);
  assert.equal(response.status, 200, route);
  const html = await response.text();
  assert.match(response.headers.get("content-type"), /text\/html/, route);
  assert.match(html, /MilkGraph/, route);
  if (route === "/") home = html;
}

const assets = [...new Set([...home.matchAll(/(?:href|src)="([^"#]+)"/g)].map(match => match[1]).filter(path => path.startsWith("/_next/static/")))];
assert.ok(assets.some(path => path.endsWith(".js")), "JavaScript referenced");
assert.ok(assets.some(path => path.endsWith(".css")), "CSS referenced");
for (const path of [...assets, "/icon.svg", "/apple-icon.png"]) {
  const response = await get(path);
  assert.equal(response.status, 200, path);
  assert.ok((await response.arrayBuffer()).byteLength > 0, path);
}
const missing = await get("/milkgraph-deployment-missing");
assert.equal(missing.status, 404, "unknown route");
console.info(`PASS: health identity, ${routes.length} pages, ${assets.length + 2} assets, 404`);
