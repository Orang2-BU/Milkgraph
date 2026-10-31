import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const root = process.env.BASE_URL ?? "http://localhost:3100";
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", e => errors.push(e.message));
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
const report = [];
await mkdir("artifacts", { recursive: true });
try {
  for (const width of [1440, 768, 375]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 1000 });
    for (const [name, route] of [["beranda", "/"], ["receiving", "/receiving"], ["rencana", "/rencana"], ["trace", "/trace"], ["simulasi", "/simulasi"]]) {
      await page.goto(root + route);
      await page.getByRole("heading", { level: 1 }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      if (name === "simulasi") await page.locator(".plant-scene canvas").waitFor();
      const overflow = await page.evaluate(() => ({ window: innerWidth, content: document.documentElement.scrollWidth }));
      assert.ok(overflow.content <= width, `${name} at ${width} overflow: ${JSON.stringify(overflow)}`);
      await page.screenshot({ path: `artifacts/${name}-${width}.png`, fullPage: true, caret: "initial" });
      report.push(`${name} ${width}px: no page overflow`);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(root);
  assert.ok(await page.locator(".attention-item").count() >= 3, "Beranda attention list");
  assert.equal(await page.locator(".module-card").count(), 5);
  assert.equal(await page.locator(".metric-card").count(), 4);
  await page.goto(root + "/receiving");
  await page.getByLabel("Filter tahap RT").selectOption("Lab test");
  assert.equal(await page.locator("#antrean-rt tbody tr").count(), 3);
  await page.getByRole("link", { name: "Periksa kelayakan rencana" }).click();
  await page.getByRole("heading", { name: "Rekomendasi solver: rencana layak" }).waitFor();
  assert.equal(await page.locator(".constraint-table .check.crit").count(), 3);
  assert.equal(await page.locator(".gantt-block.violation").count(), 1);
  await page.getByRole("button", { name: "Rekomendasi", exact: true }).click();
  assert.equal(await page.locator(".gantt-block.violation").count(), 0);
  await page.getByRole("button", { name: "Setujui rekomendasi", exact: true }).click();
  await page.getByLabel("Catatan (opsional)").fill("Informasikan koordinator receiving.");
  await page.getByRole("button", { name: "Konfirmasi persetujuan" }).click();
  await page.getByText(/^Disetujui oleh Rina Wulandari, 14\.\d\d$/).waitFor();
  await page.getByRole("button", { name: "Panduan demo" }).click();
  await page.getByRole("button", { name: "Atur ulang demo" }).click();
  await page.getByRole("button", { name: "What-if: CIP Bay 2 molor 40 menit" }).click();
  assert.equal(await page.locator(".gantt-block.violation").count(), 2);
  await page.getByRole("button", { name: "Tolak", exact: true }).click();
  assert.ok(await page.getByRole("button", { name: "Konfirmasi penolakan" }).isDisabled());
  await page.getByLabel("Catatan (wajib)").fill("Tunggu konfirmasi durasi CIP dari supervisor.");
  await page.getByRole("button", { name: "Konfirmasi penolakan" }).click();
  await page.getByText(/^Ditolak oleh Rina Wulandari, 14\.\d\d$/).waitFor();
  report.push("Rencana: filter RT, 3 constraint violations, solver view clean, approve, reset, what-if, reject: PASS");
  await page.goto(root + "/trace");
  await page.getByRole("button", { name: "Trace mundur" }).click();
  await page.getByRole("heading", { name: "FG-1013-07 berasal dari 4 RT di RMT-2" }).waitFor();
  await page.getByText("trace_backward(lot_id = FG-1013-07)").waitFor();
  await page.getByRole("button", { name: "Lihat sumber LAB-4471", exact: true }).click();
  await page.getByRole("dialog", { name: "Bukti operasional" }).waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("region", { name: "Detail FG-1013-07" }).waitFor();
  await page.getByRole("button", { name: "Mass Balance", exact: true }).click();
  assert.equal(await page.locator(".mass-rows li").count(), 6);
  await page.getByRole("button", { name: "Trace maju", exact: true }).click();
  await page.getByRole("heading", { name: "Susu RT-04 masuk ke 5 lot barang jadi" }).waitFor();
  await page.getByRole("button", { name: "Tabel", exact: true }).click();
  assert.equal(await page.locator(".lot-results tbody tr").count(), 5);
  await page.getByRole("button", { name: "Graf", exact: true }).click();
  await page.getByRole("button", { name: "Separator SP-1, lihat detail" }).click();
  await page.getByRole("region", { name: "Detail SP-1" }).waitFor();
  await page.getByLabel("Pertanyaan tentang genealogi atau rencana").fill("Cuaca besok?");
  await page.getByRole("button", { name: "Kirim pertanyaan" }).click();
  await page.getByRole("heading", { name: "Tidak ada query template yang cocok" }).waitFor();
  await page.getByRole("button", { name: "Ajukan daftar hold" }).click();
  await page.getByRole("button", { name: "Ajukan ke QA" }).click();
  await page.getByText(/diajukan ke QA\/Lab oleh/).waitFor();
  report.push("Trace: backward with template + source modal + node detail, mass balance 6 steps, forward 5 lots, equipment detail, unknown question abstains, hold submitted: PASS");
  await page.goto(root + "/simulasi");
  await page.locator(".scene-tag.crit").first().waitFor();
  await page.getByRole("button", { name: "Rekomendasi · proyeksi 15.30" }).click();
  await page.getByText("RT-27 masuk tepat setelah CIP selesai 15.20.").waitFor();
  assert.equal(await page.locator(".scene-tag.crit").count(), 0);
  report.push("Simulasi 3D: bottlenecks before, none critical after recommendation: PASS");
  assert.equal(await page.locator("#desktop-navigation .nav-list a").count(), 6);
  const tabbed = { receiving: "Pabrik", tangki: "Pabrik", filling: "Pabrik", pasokan: "Rencana", constraint: "Rencana", persetujuan: "Rencana", lab: "Traceability", hold: "Traceability", graph: "Traceability", "sumber-data": "Pengaturan", pengguna: "Pengaturan" };
  for (const [route, menu] of Object.entries(tabbed)) {
    const response = await page.goto(`${root}/${route}`);
    assert.equal(response.status(), 200, route);
    await page.getByRole("heading", { level: 1 }).waitFor();
    assert.equal(await page.locator(".section-tabs a[aria-current=page]").getAttribute("href"), `/${route}`, route);
    assert.equal(await page.locator("#desktop-navigation .nav-item.active").getAttribute("aria-label"), menu, route);
  }
  report.push(`Sidebar 6 menus; ${Object.keys(tabbed).length} tabbed routes show the right menu and tab: PASS`);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(root);
  const menu = page.getByRole("button", { name: "Buka menu", exact: true });
  await menu.click();
  await page.getByRole("dialog", { name: "Menu navigasi" }).waitFor();
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    assert.ok(await page.evaluate(() => document.activeElement === document.body || !!document.activeElement.closest("#mobile-navigation")), "Drawer focus reached page content");
  }
  await page.keyboard.press("Escape");
  assert.ok(await menu.evaluate(node => node === document.activeElement), "Menu focus not restored");
  await menu.click();
  await page.getByRole("dialog").getByRole("link", { name: "Traceability", exact: true }).click();
  assert.equal(await page.locator("dialog[open]").count(), 0);
  await page.getByRole("button", { name: "Trace mundur" }).click();
  await page.getByRole("button", { name: "Graf", exact: true }).click();
  await page.locator(".react-flow__node").first().waitFor();
  report.push("Mobile drawer: focus never reaches page content, Escape restores focus, route closes drawer; graph tab: PASS");
  assert.deepEqual(errors, []);
  report.push("Runtime page and console errors: 0");
  await writeFile("artifacts/browser-report.json", JSON.stringify({ report, errors }, null, 2));
  console.info(report.join("\n"));
} finally { await browser.close(); }
