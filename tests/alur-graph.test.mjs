import { test } from "node:test";
import assert from "node:assert/strict";
import { autoLayout, visibleEdges } from "../components/alur/graph.ts";

const asset = (id, stage, active = true) => ({ id, stage, group: stage, kind: "Storage", status: "", tone: "ok", note: "", href: "/", active });
const assets = [asset("A", "s1"), asset("B", "s2"), asset("C", "s3", false), asset("D", "s4")];
const links = [["A", "B"], ["B", "C"], ["C", "D"]];

test("jalur langsung: flow bila kedua alat aktif, idle bila salah satu tidak", () => {
  const edges = visibleEdges(assets, links, new Set(["A", "B", "C", "D"]));
  assert.deepEqual(edges.map(e => `${e.id}:${e.kind}`), ["A>B:flow", "B>C:idle", "C>D:idle"]);
});

test("alat tersembunyi diringkas jadi satu jalur dengan jumlah alat yang dilewati", () => {
  const edges = visibleEdges(assets, links, new Set(["A", "D"]));
  assert.deepEqual(edges.map(e => [e.source, e.target, e.kind, e.via]), [["A", "D", "summary", 2]]);
});

test("tahap dengan lebih dari 5 alat dipecah jadi sub-kolom; tahap kosong tetap punya kolom", () => {
  const many = Array.from({ length: 7 }, (_, i) => asset(`F${i}`, "fill"));
  const { pos, columns } = autoLayout(many, ["empty", "fill"]);
  assert.equal(columns[0].count, 0);
  assert.notEqual(pos.F0.x, pos.F5.x);
  assert.equal(pos.F0.y, pos.F5.y);
});
