"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { MapControls } from "three/examples/jsm/controls/MapControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Asset } from "@/lib/assets";
import type { Tone } from "@/mock/types";
import { CARD, type FlowEdge } from "./graph";

/**
 * Alur alat dalam 3D (poin 14). Bukan model site: susunan, status, jalur, dan pengaturan alat sama persis dengan Alur 2D,
 * hanya digambar sebagai alat 3D. Setiap gerakan berasal dari status alat: susu yang mengalir tampil sebagai butiran di pipa,
 * mixer yang jalan berputar, filling yang jalan mengirim kemasan di konveyor, UHT yang jalan mengeluarkan uap, alat CIP
 * disemprot air, dan alat bermasalah berdenyut dengan lampu peringatan.
 */
type Props = {
  assets: Asset[];
  edges: FlowEdge[];
  pos: Record<string, { x: number; y: number }>;
  columns: { stage: string; x: number; width: number }[];
  badges: Record<string, string>;
  picked: string | null;
  onPick: (id: string) => void;
  onClear: () => void;
  label: string;
};

const S = 1 / 36;
const center = (p: { x: number; y: number }) => new THREE.Vector3((p.x + CARD / 2) * S, 0, (p.y + 60) * S);
const css = (name: string) => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim() || "#888");
const TONE: Record<Tone, string> = { ok: "status-ok", warn: "status-warn", crit: "status-crit", neutral: "on-surface-muted" };
type Tick = (t: number, dt: number) => void;

type Ctx = {
  scene: THREE.Scene; camera: THREE.OrthographicCamera; controls: MapControls; renderer: THREE.WebGLRenderer; labels: CSS2DRenderer;
  content: THREE.Group; particles: { mesh: THREE.Mesh; curve: THREE.Curve<THREE.Vector3>; offset: number }[];
  pulses: THREE.Mesh[]; ticks: Tick[]; groups: Map<string, THREE.Group>; tags: Map<string, HTMLDivElement>; hover?: string;
  goal: THREE.Vector3 | null; fitKey: string; intro: number; goalZoom: number; fit: () => void; resize: () => void;
};

/** Bentuk alat menurut jenisnya; semua mesh diberi userData.id untuk klik. */
function equipment(a: Asset, steel: THREE.Material, tone: THREE.Material, glass: THREE.Material) {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const tank = (r: number, h: number) => { add(new THREE.CylinderGeometry(r, r, h, 40), steel, 0, h / 2 + 0.15); add(new THREE.SphereGeometry(r, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), steel, 0, h + 0.15); add(new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.18, 40), tone, 0, h * 0.62); return h + r + 0.15; };
  let top = 2, motor: THREE.Mesh | undefined;
  switch (a.kind) {
    case "Bay": {
      add(new RoundedBoxGeometry(3.4, 0.22, 2.4, 2, 0.08), steel, 0, 0.11);
      add(new THREE.BoxGeometry(3.4, 0.06, 0.12), tone, 0, 0.25, 1.15);
      if (a.active) { add(new THREE.CylinderGeometry(0.55, 0.55, 2.2, 28).rotateZ(Math.PI / 2), glass, -0.3, 0.95); add(new RoundedBoxGeometry(0.8, 0.9, 1, 2, 0.12), steel, 1.25, 0.7); }
      top = 1.8; break;
    }
    case "Buffer": top = tank(1.15, 2.6); break;
    case "Storage": top = tank(1, 2.4); break;
    case "Cream": top = tank(0.75, 1.9); break;
    case "Premix": top = tank(0.7, 1.7); break;
    case "Aseptic": top = tank(1, 2.2); break;
    case "Mixing": { top = tank(0.85, 1.8); motor = add(new THREE.BoxGeometry(0.5, 0.45, 0.5), tone, 0, top + 0.2); top += 0.45; break; }
    case "Sterilisasi": {
      add(new RoundedBoxGeometry(2.8, 1.5, 1.8, 3, 0.14), steel, 0, 0.75);
      add(new THREE.BoxGeometry(2.82, 0.16, 1.82), tone, 0, 1.15);
      add(new THREE.CylinderGeometry(0.18, 0.18, 1, 16), steel, 0.9, 2);
      top = 2.6; break;
    }
    default: {
      add(new RoundedBoxGeometry(2.4, 1.3, 1.5, 3, 0.12), steel, -0.3, 0.65);
      add(new THREE.BoxGeometry(2.42, 0.14, 1.52), tone, -0.3, 1.05);
      add(new THREE.BoxGeometry(3.6, 0.12, 0.55), glass, 0, 0.55, 1.1);
      top = 1.9;
    }
  }
  g.traverse(o => { o.userData.id = a.id; });
  return { group: g, top, motor };
}

export function Flow3D({ assets, edges, pos, columns, badges, picked, onPick, onClear, label }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const ctx = useRef<Ctx | null>(null);
  const handlers = useRef({ onPick, onClear });
  useEffect(() => { handlers.current = { onPick, onClear }; }, [onPick, onClear]);

  // Renderer, kamera, dan kontrol dibuat sekali; isi adegan dibangun ulang saat data berubah.
  useEffect(() => {
    const el = host.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    scene.background = css("canvas");
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    scene.environment = pmrem.fromScene(room, 0.04).texture;
    scene.environmentIntensity = 0.5;
    const labels = new CSS2DRenderer();
    labels.domElement.className = "scene-labels";
    el.appendChild(labels.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d8d0, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(-30, 60, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 40, bottom: -40, far: 200 });
    scene.add(sun, sun.target);

    // Sama seperti graph 2D: seret menggeser kanvas; klik kanan (atau dua jari) memutar; gulir zoom ke kursor.
    const controls = new MapControls(camera, labels.domElement);
    controls.zoomToCursor = true;
    controls.enableDamping = !reduced;
    controls.maxPolarAngle = Math.PI * 0.42;
    controls.minZoom = 0.4;
    controls.maxZoom = 4;
    controls.screenSpacePanning = true;
    controls.listenToKeyEvents(el);

    const content = new THREE.Group();
    scene.add(content);
    const c: Ctx = { scene, camera, controls, renderer, labels, content, particles: [], pulses: [], ticks: [], groups: new Map(), tags: new Map(), goal: null, fitKey: "", intro: reduced ? 1 : -1, goalZoom: 1, fit: () => {}, resize: () => {} };

    c.resize = () => {
      const w = el.clientWidth, h = el.clientHeight, half = 14, aspect = w / h;
      Object.assign(camera, { left: -half * aspect, right: half * aspect, top: half, bottom: -half });
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      labels.setSize(w, h);
    };
    c.fit = () => {
      // Lantai latar tidak ikut dihitung supaya alurnya yang pas di layar.
      const box = new THREE.Box3();
      for (const o of content.children) if (!o.userData.backdrop) box.expandByObject(o);
      if (box.isEmpty()) return;
      const mid = box.getCenter(new THREE.Vector3());
      controls.target.copy(mid);
      camera.position.copy(mid).add(new THREE.Vector3(-14, 34, 38));
      camera.lookAt(mid);
      camera.updateMatrixWorld();
      // Proyeksikan sudut kotak ke ruang kamera supaya seluruh alur pas di layar.
      const span = new THREE.Box3();
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) span.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
      const aspect = el.clientWidth / el.clientHeight, w = span.max.x - span.min.x, h = span.max.y - span.min.y;
      c.goalZoom = Math.min(2.2, (28 * aspect) / (w * 1.06), 28 / (h * 1.1));
      // Pertama dibuka: kamera masuk perlahan dari jauh.
      if (c.intro < 0) c.intro = 0;
      camera.zoom = c.intro < 1 ? c.goalZoom * 0.6 : c.goalZoom;
      camera.updateProjectionMatrix();
      controls.update();
    };
    c.resize();
    const observer = new ResizeObserver(c.resize);
    observer.observe(el);

    // Klik tanpa geser = pilih alat; klik di area kosong menutup panel.
    const ray = new THREE.Raycaster();
    const ndc = (e: PointerEvent) => { const r = el.getBoundingClientRect(); return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
    const hit = (e: PointerEvent) => { ray.setFromCamera(ndc(e), camera); return ray.intersectObjects(content.children, true).find(i => i.object.userData.id)?.object.userData.id as string | undefined; };
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; c.intro = 1; };
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      const id = hit(e);
      if (id) handlers.current.onPick(id); else handlers.current.onClear();
    };
    // Kursor di atas alat mengangkatnya sedikit dan membuka labelnya.
    const onMove = (e: PointerEvent) => {
      if (e.buttons) return;
      const next = hit(e);
      if (next !== c.hover) { if (c.hover) c.tags.get(c.hover)?.classList.remove("hover"); if (next) c.tags.get(next)?.classList.add("hover"); c.hover = next; }
      labels.domElement.style.cursor = next ? "pointer" : "";
    };
    labels.domElement.addEventListener("pointerdown", onDown);
    labels.domElement.addEventListener("pointerup", onUp);
    labels.domElement.addEventListener("pointermove", onMove);

    const clock = new THREE.Clock();
    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
      if (!reduced) {
        for (const p of c.particles) p.mesh.position.copy(p.curve.getPointAt((t * 0.18 + p.offset) % 1));
        for (const m of c.pulses) { const k = (t * 0.8) % 1; m.scale.setScalar(1 + k * 0.9); (m.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - k); }
        for (const tick of c.ticks) tick(t, dt);
      }
      if (c.intro >= 0 && c.intro < 1) { c.intro = Math.min(1, c.intro + dt / 1.4); camera.zoom = c.goalZoom * (0.6 + 0.4 * (1 - (1 - c.intro) ** 3)); camera.updateProjectionMatrix(); }
      for (const [id, g] of c.groups) g.position.y += ((id === c.hover ? 0.3 : 0) - g.position.y) * (reduced ? 1 : 0.2);
      if (c.goal) { controls.target.lerp(c.goal, reduced ? 1 : 0.12); if (controls.target.distanceTo(c.goal) < 0.02) c.goal = null; }
      controls.update();
      // Label sudah ringkas (kode alat saja), jadi baru disembunyikan saat sangat jauh.
      labels.domElement.dataset.zoom = camera.zoom < 0.5 ? "far" : camera.zoom < 1 ? "mid" : "near";
      renderer.render(scene, camera);
      labels.render(scene, camera);
    };
    loop();
    ctx.current = c;

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      labels.domElement.removeEventListener("pointerdown", onDown);
      labels.domElement.removeEventListener("pointerup", onUp);
      labels.domElement.removeEventListener("pointermove", onMove);
      controls.dispose();
      clear(content);
      scene.environment?.dispose();
      room.dispose();
      pmrem.dispose();
      renderer.dispose();
      el.replaceChildren();
      ctx.current = null;
    };
  }, []);

  // Isi adegan dari data yang sama dengan Alur 2D.
  useEffect(() => {
    const c = ctx.current;
    if (!c) return;
    clear(c.content);
    c.particles = [];
    c.pulses = [];
    c.ticks = [];
    c.groups = new Map();
    c.tags = new Map();
    const steel = new THREE.MeshStandardMaterial({ color: 0xe4e6e8, metalness: 0.55, roughness: 0.32 });
    const glass = new THREE.MeshStandardMaterial({ color: 0xf2f3f1, metalness: 0.3, roughness: 0.5 });
    const toneMat = new Map<Tone, THREE.MeshStandardMaterial>();
    const toneOf = (t: Tone) => toneMat.get(t) ?? toneMat.set(t, new THREE.MeshStandardMaterial({ color: css(TONE[t]), roughness: 0.5, emissive: css(TONE[t]), emissiveIntensity: t === "crit" ? 0.35 : 0.08 })).get(t)!;

    // Lantai pabrik di bawah semua tahap, lantai per tahap beserta namanya, dan garis jalur pejalan kaki kuning di antaranya.
    const floor = new THREE.MeshStandardMaterial({ color: css("surface"), roughness: 0.95 });
    const maxY = Math.max(...Object.values(pos).map(p => p.y), 0);
    const left = Math.min(...columns.map(col => col.x)) * S - 6, right = Math.max(...columns.map(col => col.x + Math.max(col.width, CARD))) * S + 6;
    const depth = (maxY + 230) * S + 8;
    const ground = new THREE.Mesh(new THREE.BoxGeometry(right - left, 0.06, depth), new THREE.MeshStandardMaterial({ color: 0xdfe2dc, roughness: 1 }));
    ground.position.set((left + right) / 2, -0.12, depth / 2 - 6.6);
    ground.receiveShadow = true;
    ground.userData.backdrop = true;
    c.content.add(ground);
    const safety = new THREE.MeshStandardMaterial({ color: 0xe8c34a, roughness: 0.7 });
    for (const col of columns.slice(1)) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, depth - 4), safety);
      line.position.set((col.x - 12) * S, -0.07, depth / 2 - 6.6);
      line.userData.backdrop = true;
      c.content.add(line);
    }
    for (const col of columns) {
      const w = (Math.max(col.width, CARD) + 24) * S, d = (maxY + 230) * S;
      const plate = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), floor);
      plate.position.set((col.x + Math.max(col.width, CARD) / 2) * S, -0.04, d / 2 - 2.6);
      plate.receiveShadow = true;
      c.content.add(plate);
      const tag = document.createElement("div");
      tag.className = "flow3d-stage";
      tag.textContent = col.stage;
      const obj = new CSS2DObject(tag);
      obj.position.set(plate.position.x, 0.1, -3.8);
      c.content.add(obj);
    }

    const at = new Map<string, THREE.Vector3>();
    for (const a of assets) {
      const p = pos[a.id];
      if (!p) continue;
      const v = center(p);
      at.set(a.id, v);
      const { group, top, motor } = equipment(a, steel, toneOf(a.tone), glass);
      group.position.copy(v);
      c.content.add(group);
      c.groups.set(a.id, group);
      const beacon = alive(c, a, group, top, motor);
      if (a.tone === "crit") {
        const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.85, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: css("status-crit"), transparent: true, opacity: 0.5, depthWrite: false }));
        ring.position.set(v.x, 0.03, v.z);
        c.content.add(ring);
        c.pulses.push(ring);
      }
      if (a.id === picked) {
        const sel = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: css("primary") }));
        sel.position.set(v.x, 0.04, v.z);
        c.content.add(sel);
      }
      const tag = document.createElement("div");
      // Label ringkas: status tampil untuk alat bermasalah, yang dipilih, yang punya efek rencana, atau saat kursor di atasnya.
      const open = a.tone === "warn" || a.tone === "crit" || a.id === picked || !!badges[a.id];
      tag.className = `scene-tag flow3d-tag peek-tag ${a.tone}${a.id === picked ? " picked" : ""}${open ? " open" : ""}${badges[a.id] ? " planned" : ""}`;
      const name = document.createElement("strong");
      name.textContent = a.id;
      const status = document.createElement("small");
      status.textContent = a.status;
      tag.append(name, status);
      if (badges[a.id]) { const b = document.createElement("span"); b.textContent = badges[a.id]; tag.append(b); }
      const obj = new CSS2DObject(tag);
      obj.position.set(0, top + (beacon ? 1.7 : 0.5), 0);
      group.add(obj);
      c.tags.set(a.id, tag);
    }

    // Pipa: siku dengan sudut membulat. Hijau = mengalir, abu = tidak mengalir, merah = menuju alat bermasalah.
    const tones = new Map(assets.map(a => [a.id, a.tone]));
    const pipeMat = { flow: new THREE.MeshStandardMaterial({ color: css("accent-fill"), roughness: 0.4 }), idle: new THREE.MeshStandardMaterial({ color: css("border"), roughness: 0.6 }), blocked: new THREE.MeshStandardMaterial({ color: css("status-crit"), roughness: 0.4 }), summary: new THREE.MeshStandardMaterial({ color: css("on-surface-muted"), transparent: true, opacity: 0.35 }) };
    const milk = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6 });
    for (const e of edges) {
      const s = at.get(e.source), t = at.get(e.target);
      if (!s || !t) continue;
      const y = 0.35, mx = s.x + (t.x - s.x) * 0.55;
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(s.x + 1, y, s.z), new THREE.Vector3(mx, y, s.z), new THREE.Vector3(mx, y, t.z), new THREE.Vector3(t.x - 1, y, t.z)], false, "catmullrom", 0.08);
      const blocked = tones.get(e.target) === "crit" && e.kind !== "summary";
      const pipe = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, e.kind === "summary" ? 0.06 : 0.11, 10), blocked ? pipeMat.blocked : pipeMat[e.kind]);
      pipe.castShadow = true;
      c.content.add(pipe);
      if (e.kind === "flow" && !blocked) for (let i = 0; i < 3; i++) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), milk);
        c.content.add(dot);
        c.particles.push({ mesh: dot, curve, offset: i / 3 });
      }
    }

    const key = assets.map(a => a.id).join();
    if (key !== c.fitKey) { c.fitKey = key; c.fit(); }
  }, [assets, edges, pos, columns, badges, picked]);

  // Alat dipilih: geser kamera ke alat itu.
  useEffect(() => {
    const c = ctx.current, p = picked ? pos[picked] : null;
    if (c && p) c.goal = center(p);
  }, [picked, pos]);

  return <div ref={host} className="flow-3d" role="img" aria-label={label} tabIndex={0} />;
}

/**
 * Gerakan alat dari statusnya. Mengembalikan true kalau alat diberi lampu peringatan (label digeser ke atas).
 * Mesh baru ditaruh di dalam grup alat supaya ikut terangkat saat kursor di atasnya, dan bisa diklik sebagai alat itu.
 */
function alive(c: Ctx, a: Asset, group: THREE.Group, top: number, motor?: THREE.Mesh) {
  const add = (m: THREE.Mesh, x: number, y: number, z: number) => { m.position.set(x, y, z); m.userData.id = a.id; group.add(m); return m; };
  if (a.active && motor) c.ticks.push((_, dt) => { motor.rotation.y += dt * 2.4; });
  if (a.active && a.kind === "Filling") {
    // Kemasan berjalan di konveyor mesin filling.
    const pack = new THREE.MeshStandardMaterial({ color: 0xfafaf6, roughness: 0.4 });
    const packs = Array.from({ length: 5 }, (_, i) => { const m = add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.4, 0.26), pack), -1.7 + i * 0.7, 0.81, 1.1); m.castShadow = true; m.userData.o = i / 5; return m; });
    c.ticks.push(t => { for (const m of packs) m.position.x = -1.7 + ((t * 0.22 + m.userData.o) % 1) * 3.4; });
  }
  if (a.active && a.kind === "Sterilisasi") {
    // Uap dari cerobong UHT yang sedang jalan.
    const puffs = Array.from({ length: 5 }, (_, i) => { const m = add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })), 0.9, 2.5, 0); m.userData.o = i / 5; return m; });
    c.ticks.push(t => { for (const m of puffs) { const q = (t * 0.5 + m.userData.o) % 1; m.position.set(0.9 + q * 0.4, 2.5 + q * 1.8, -q * 0.3); m.scale.setScalar(0.6 + q * 1.8); (m.material as THREE.MeshStandardMaterial).opacity = 0.55 * (1 - q); } });
  }
  const cip = /cip/i.test(a.status);
  if (cip) {
    // Semprotan air CIP.
    const water = new THREE.MeshStandardMaterial({ color: 0x9cc8e8, emissive: 0x9cc8e8, emissiveIntensity: 0.4, transparent: true, opacity: 0.85 });
    const drops = Array.from({ length: 14 }, (_, i) => { const m = add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), water), 0, top, 0); Object.assign(m.userData, { x: ((i * 37) % 9) / 4 - 1.1, z: ((i * 53) % 7) / 3.5 - 1, o: i / 14 }); return m; });
    c.ticks.push(t => { for (const m of drops) { const k = (t * 0.9 + m.userData.o) % 1; m.position.set(m.userData.x, top + 0.8 - k * (top + 0.6), m.userData.z); } });
  }
  if (cip || (a.tone !== "crit" && a.tone !== "warn")) return false;
  // Lampu peringatan: merah cepat untuk alat bermasalah, kuning pelan untuk yang tertahan atau ganti format.
  const color = css(TONE[a.tone]);
  const light = add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1 })), 0, top + 0.3, 0);
  const speed = a.tone === "crit" ? 6 : 2.5;
  c.ticks.push(t => { (light.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.sin(t * speed) > 0 ? 1.4 : 0.15; });
  return true;
}

function clear(group: THREE.Group) {
  for (const o of [...group.children]) {
    group.remove(o);
    o.traverse(n => { if (n instanceof THREE.Mesh) { n.geometry.dispose(); (n.material as THREE.Material).dispose(); } });
  }
}
