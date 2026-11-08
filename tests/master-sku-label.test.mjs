import { test } from "node:test";
import assert from "node:assert/strict";
import { skuName, skuOption } from "../components/master-data/sku-label.ts";

test("nama SKU dari data dipakai apa adanya", () => {
  assert.equal(skuName({ finished_sku_id: "UHT-FC-1000-LOCAL", sku_name: "UHT Full Cream 1000ml Local" }), "UHT Full Cream 1000ml Local");
});

test("nama kosong dari API dibentuk dari kode SKU, bukan tanda kurung kosong", () => {
  assert.equal(skuName({ finished_sku_id: "UHT-FC-1000-LOCAL", sku_name: "" }), "UHT Full Cream 1000 ml, lokal");
  assert.equal(skuName({ finished_sku_id: "ESL-CH-320-EXP" }), "ESL Cokelat 320 ml, ekspor");
  assert.equal(skuOption({ finished_sku_id: "ESL-ST-950-LOCAL", sku_name: " " }), "ESL-ST-950-LOCAL · ESL Stroberi 950 ml, lokal");
});

test("kode yang tidak dikenal tetap tampil tanpa kurung kosong", () => {
  assert.equal(skuOption({ finished_sku_id: "X-1", sku_name: "" }), "X-1");
});
