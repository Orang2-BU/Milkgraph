"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { MapControls } from "three/examples/jsm/controls/MapControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Asset, Tanker, Tone } from "@/mock/types";
import { truckLine, type queueLayout } from "./queue-layout";

/**
 * Antrean Truk dalam 3D (next phase PDF). Setiap gerakan berasal dari data, bukan hiasan:
 * RT yang masih dalam perjalanan berjalan menuju gerbang, lingkar di bawah truk menunjukkan lama menunggu, susu dari truk
 * yang bongkar mengalir lewat selang ke Raw Milk Buffer (level tangki dari data), Bay 2 menyemprot air CIP dengan progresnya,
 * dan RT yang mendekati batas holding time berdenyut merah.
 */
type Layout = ReturnType<typeof queueLayout>;
type Tick = (t: number, dt: number) => void;
const css = (name: string) => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim() || "#888");
const TONE: Record<Tone, string> = { ok: "status-ok", warn: "status-warn", crit: "status-crit", neutral: "on-surface-muted" };
const RMT_X = 31;
const GATE_X = -31;
/** Lama tunggu yang dianggap "penuh" di lingkar tunggu [asumsi]. */
const WAIT_FULL = 60;

function material(color: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
}

/** Truk tangki susu: sasis, tangki stainless, kabin, roda (roda diputar saat truk berjalan). */
function truck(tone: THREE.Color, ghost: boolean) {
  const g = new THREE.Group();
  const fade = (m: THREE.MeshStandardMaterial) => { if (ghost) Object.assign(m, { transparent: true, opacity: 0.55 }); return m; };
  const steel = fade(material(0xe9ebed, { metalness: 0.75, roughness: 0.22 }));
  const cab = fade(material(0xfbfbf9, { roughness: 0.4 }));
  const glass = fade(material(0x22302a, { roughness: 0.15, metalness: 0.2 }));
  const dark = fade(material(0x2b2f2c, { roughness: 0.85 }));
  const stripe = fade(material(tone, { emissive: tone, emissiveIntensity: 0.15 }));
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  add(new THREE.BoxGeometry(3.7, 0.24, 1.0), dark, -0.1, 0.5);
  add(new THREE.CapsuleGeometry(0.62, 2.0, 8, 28).rotateZ(Math.PI / 2), steel, -0.65, 1.2);
  add(new THREE.CylinderGeometry(0.64, 0.64, 0.14, 28).rotateZ(Math.PI / 2), stripe, -0.65, 1.2);
  add(new THREE.BoxGeometry(0.2, 0.25, 0.25), steel, -0.65, 1.9);
  add(new RoundedBoxGeometry(0.95, 1.2, 1.12, 3, 0.14), cab, 1.3, 1.05);
  add(new THREE.BoxGeometry(0.06, 0.45, 0.95), glass, 1.79, 1.35);
  const wheels: THREE.Mesh[] = [];
  for (const x of [-1.55, -0.85, 1.3]) for (const z of [-0.48, 0.48]) wheels.push(add(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 18).rotateX(Math.PI / 2), dark, x, 0.3, z));
  return { group: g, wheels };
}

function tree(x: number, z: number, s: number) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.22 * s, 1.4 * s, 8), material(0x8a6f55, { roughness: 0.9 }));
  trunk.position.y = 0.7 * s;
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25 * s, 1), material(0x7fa37a, { roughness: 0.95, flatShading: true }));
  crown.position.y = 2.1 * s;
  trunk.castShadow = crown.castShadow = true;
  g.add(trunk, crown);
  g.position.set(x, 0, z);
  return g;
}

export function Queue3D({ tankers, assets, layout, picked, onPick, label }: { tankers: Tanker[]; assets: Asset[]; layout: Layout; picked: string | null; onPick: (id: string | null) => void; label: string }) {
  const host = useRef<HTMLDivElement>(null);
  const pickRef = useRef(onPick);
  useEffect(() => { pickRef.current = onPick; }, [onPick]);
  // Kamera disimpan supaya memilih truk (yang membangun ulang adegan) tidak mengembalikan kamera ke awal.
  const saved = useRef<{ pos: THREE.Vector3; target: THREE.Vector3; zoom: number } | null>(null);

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
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    scene.environment = pmrem.fromScene(room, 0.04).texture;
    scene.environmentIntensity = 0.55;
    const labels = new CSS2DRenderer();
    labels.domElement.className = "scene-labels";
    el.appendChild(labels.domElement);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xcfd8c6, 1.0));
    const sun = new THREE.DirectionalLight(0xfff6e8, 2.0);
    sun.position.set(-25, 55, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    Object.assign(sun.shadow.camera, { left: -70, right: 50, top: 30, bottom: -30, far: 160 });
    scene.add(sun);

    const controls = new MapControls(camera, labels.domElement);
    Object.assign(controls, { zoomToCursor: true, screenSpacePanning: true, enableDamping: !reduced, maxPolarAngle: Math.PI * 0.42, minZoom: 0.4, maxZoom: 4 });

    const ticks: Tick[] = [];
    const tag = (text: string, cls: string, pos: THREE.Vector3, sub?: string) => {
      const div = document.createElement("div");
      div.className = cls;
      const strong = document.createElement("strong");
      strong.textContent = text;
      div.append(strong);
      if (sub) { const s = document.createElement("small"); s.textContent = sub; div.append(s); }
      const obj = new CSS2DObject(div);
      obj.position.copy(pos);
      scene.add(obj);
      return div;
    };
    const flat = (w: number, d: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, extra: THREE.MeshStandardMaterialParameters = {}) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), material(color, { roughness: 0.95, ...extra }));
      m.position.set(x, y, z);
      m.receiveShadow = true;
      scene.add(m);
      return m;
    };
    /** Bilah progres datar di lantai: latar abu dan isi berwarna. */
    const bar = (x: number, z: number, w: number, frac: number, color: THREE.Color) => {
      const f = Math.min(1, Math.max(0, frac));
      flat(w, 0.5, 0xd9dcd6, x, 0.16, z);
      if (f) flat(w * f, 0.52, color, x - w / 2 + (w * f) / 2, 0.18, z, { emissive: color, emissiveIntensity: 0.2 });
    };

    // Lingkungan: rumput, halaman beton, jalan masuk dengan marka, pohon di tepi.
    flat(170, 90, 0xcfdfbf, -8, -0.09, 0, { roughness: 1 });
    flat(66, 30, css("surface"), -1, -0.04, 0);
    flat(100, 7, 0xcfd2cd, -18, 0.0, 0);
    const dash = material(0xffffff, { roughness: 0.6 });
    for (let x = -66; x < 26; x += 4) { const m = new THREE.Mesh(new THREE.BoxGeometry(2, 0.02, 0.18), dash); m.position.set(x, 0.05, 0); scene.add(m); }
    [[-62, -12, 1.2], [-54, 13, 1], [-46, -14, 0.9], [-40, 12, 1.1], [-20, -18, 1], [-8, 18, 1.2], [6, -18, 0.9], [18, 18, 1], [40, -13, 1.2], [42, 11, 1], [-68, 6, 1.1], [26, -19, 0.8]]
      .forEach(([x, z, s]) => scene.add(tree(x, z, s)));

    // Gerbang dengan palang yang terangkat saat truk datang.
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.5), material(0x3b403c));
    post.position.set(GATE_X, 0.8, -4.2);
    post.castShadow = true;
    scene.add(post);
    const boom = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 8), material(0xffffff));
    arm.position.z = 4;
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 1.2), material(css("status-crit")));
    tip.position.z = 7.2;
    boom.add(arm, tip);
    boom.position.set(GATE_X, 1.5, -4.2);
    scene.add(boom);
    tag("Gerbang", "scene-tag neutral", new THREE.Vector3(GATE_X, 2.6, -5.2));

    // Lantai tiap tahap dan panah alur di jalan.
    for (const zone of layout.zones) {
      if (zone.id !== "otw") flat(9, 20, 0xeef0ec, zone.x, 0.02, 0);
      if (zone.id !== "otw") tag(zone.label, `flow3d-stage ${zone.tone}`, new THREE.Vector3(zone.x, 0.3, -11.6), zone.note);
    }
    const arrowMat = new THREE.MeshBasicMaterial({ color: css("accent-fill") });
    for (let i = 1; i < layout.zones.length - 1; i++) {
      const mid = (layout.zones[i].x + layout.zones[i + 1].x) / 2;
      const tri = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.5, 3).rotateZ(-Math.PI / 2).rotateX(Math.PI / 2), arrowMat);
      tri.position.set(mid, 0.08, 0);
      tri.scale.y = 0.12;
      scene.add(tri);
      ticks.push(t => { tri.position.x = mid + Math.sin(t * 2 + i) * 0.35; });
    }

    // Lab QA: gedung dengan lampu atap berkedip selama ada sampel yang diuji.
    const labZone = layout.zones.find(z => z.id === "Lab test");
    if (labZone) {
      const lab = new THREE.Mesh(new RoundedBoxGeometry(6, 2.6, 3, 2, 0.15), material(0xf6f7f4));
      lab.position.set(labZone.x, 1.3, 13);
      lab.castShadow = true;
      scene.add(lab);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), new THREE.MeshStandardMaterial({ color: css("status-warn"), emissive: css("status-warn"), emissiveIntensity: 1 }));
      beacon.position.set(labZone.x + 2.2, 2.85, 13);
      scene.add(beacon);
      ticks.push(t => { (beacon.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.sin(t * 5) > 0 ? 1.2 : 0.2; });
      tag("Lab QA", "scene-tag neutral", new THREE.Vector3(labZone.x, 3.4, 14.4), `${labZone.note} sedang diuji`);
    }

    // Raw Milk Buffer: silo transparan dengan level isi dari data.
    const silos = new Map<string, THREE.Vector3>();
    const buffers = assets.filter(a => a.kind === "Buffer");
    buffers.forEach((a, i) => {
      const z = (i - (buffers.length - 1) / 2) * 6.2, h = 6, r = 1.6, frac = a.fill / a.capacity;
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 40, 1, true), material(0xeef0f2, { metalness: 0.5, roughness: 0.25, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
      shell.position.set(RMT_X, h / 2 + 0.2, z);
      const milk = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r * 0.94, h * frac, 40), material(0xfdfcf7, { roughness: 0.3, emissive: 0xffffff, emissiveIntensity: 0.05 }));
      milk.position.set(RMT_X, 0.2 + (h * frac) / 2, z);
      milk.castShadow = true;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2), material(0xe4e7ea, { metalness: 0.6, roughness: 0.25 }));
      cap.position.set(RMT_X, h + 0.2, z);
      cap.castShadow = true;
      const level = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.03, r * 1.03, 0.22, 40, 1, true), material(css(TONE[a.tone]), { emissive: css(TONE[a.tone]), emissiveIntensity: 0.35, side: THREE.DoubleSide }));
      level.position.set(RMT_X, 0.2 + h * frac, z);
      scene.add(shell, milk, cap, level);
      silos.set(a.id, new THREE.Vector3(RMT_X - r, 1.2, z));
      tag(`${a.id} · ${Math.round(frac * 100)}%`, `scene-tag flow3d-tag ${a.tone}`, new THREE.Vector3(RMT_X, h + 2.2, z), a.tone === "ok" ? undefined : a.status);
    });
    if (buffers.length) tag("Raw Milk Buffer", "flow3d-stage neutral", new THREE.Vector3(RMT_X, 0.3, -11.6), `${buffers.length} tangki`);

    // Bay bongkar: atap, progres bongkar atau CIP dari data, semprotan air saat CIP.
    const bayAsset = new Map(assets.filter(a => a.kind === "Bay").map(a => [a.id, a]));
    for (const b of layout.bays) {
      const a = bayAsset.get(b.id);
      const cip = /cip/i.test(b.status);
      flat(6.4, 4.6, cip ? css("status-warn-soft") : 0xf3f4f1, b.x, 0.12, b.z);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.16, 4.8), material(0xffffff, { transparent: true, opacity: 0.4, depthWrite: false }));
      roof.position.set(b.x, 3.4, b.z);
      scene.add(roof);
      for (const dx of [-3.1, 3.1]) for (const dz of [-2.2, 2.2]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 8), material(0xaeb3af)); p.position.set(b.x + dx, 1.7, b.z + dz); scene.add(p); }
      const frac = a ? a.fill / a.capacity : 0;
      bar(b.x, b.z + 2.9, 6, frac, css(TONE[b.tone]));
      tag(b.id, `scene-tag flow3d-tag ${b.tone}`, new THREE.Vector3(b.x + 4.6, 0.4, b.z + 1.6), a ? cip ? `CIP ${a.fill}/${a.capacity} mnt` : `${Math.round(frac * 100)}% terbongkar` : b.status);
      if (cip) {
        const water = new THREE.MeshStandardMaterial({ color: 0x9cc8e8, emissive: 0x9cc8e8, emissiveIntensity: 0.4, transparent: true, opacity: 0.85 });
        const drops = Array.from({ length: 18 }, (_, i) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), water); d.userData = { x: b.x + ((i * 37) % 11) / 2 - 2.5, z: b.z + ((i * 53) % 7) / 2 - 1.7, o: i / 18 }; scene.add(d); return d; });
        ticks.push(t => { for (const d of drops) { const k = (t * 0.9 + d.userData.o) % 1; d.position.set(d.userData.x, 3.2 - k * 3, d.userData.z); } });
      }
    }

    // Truk sesuai tahap.
    const byId = new Map(tankers.map(t => [t.id, t]));
    const groups = new Map<string, THREE.Group>();
    const tags = new Map<string, HTMLDivElement>();
    const milkMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.7 });
    const hoseMat = material(0x56605a, { roughness: 0.7 });
    const unloadTo: Record<string, string[]> = { "Bay 1": ["RMT-1"], "Bay 2": ["RMT-2"], "Bay 3": ["RMT-2", "RMT-3"] };
    for (const s of layout.slots.filter(sl => !sl.ghost)) {
      const t = byId.get(s.id);
      if (!t) continue;
      const tone = css(TONE[t.tone]);
      const { group } = truck(tone, false);
      group.position.set(s.x - (s.bay ? 0.5 : 0), 0, s.z);
      group.traverse(o => { o.userData.id = t.id; });
      scene.add(group);
      groups.set(t.id, group);
      const x = group.position.x;

      if (t.stage !== "Unloading") {
        // Lingkar tunggu: busur sepanjang lama menunggu terhadap 60 menit, berputar pelan.
        const base = new THREE.Mesh(new THREE.RingGeometry(2.15, 2.35, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xd5d8d3 }));
        base.position.set(x, 0.1, s.z);
        const arc = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.4, 64, 1, 0, Math.PI * 2 * Math.min(1, t.wait / WAIT_FULL)).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: tone }));
        arc.position.set(x, 0.11, s.z);
        scene.add(base, arc);
        ticks.push((_, dt) => { arc.rotation.y -= dt * 0.25; });
      }
      if (t.tone === "crit") {
        // Menunggu bay dengan mesin menyala: denyut merah, getar halus, asap knalpot.
        const pulse = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.65, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: tone, transparent: true, depthWrite: false }));
        pulse.position.set(x, 0.12, s.z);
        scene.add(pulse);
        const puffs = Array.from({ length: 5 }, (_, i) => { const p = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: 0xb9bdb9, transparent: true })); p.userData.o = i / 5; scene.add(p); return p; });
        ticks.push(t2 => {
          const k = (t2 * 0.8) % 1;
          pulse.scale.setScalar(1 + k * 0.7);
          (pulse.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - k);
          group.position.y = Math.abs(Math.sin(t2 * 18)) * 0.025;
          for (const p of puffs) { const q = (t2 * 0.6 + p.userData.o) % 1; p.position.set(x + 1.75 + q * 0.6, 1.9 + q * 2, s.z - 0.45); p.scale.setScalar(0.6 + q * 1.6); (p.material as THREE.MeshStandardMaterial).opacity = 0.5 * (1 - q); }
        });
      }
      if (t.stage === "Sampling") {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8), material(0x9aa09b));
        pole.position.set(x - 2.3, 0.9, s.z + 1.1);
        const light = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), new THREE.MeshStandardMaterial({ color: css("status-ok"), emissive: css("status-ok"), emissiveIntensity: 1 }));
        light.position.set(pole.position.x, 1.9, pole.position.z);
        scene.add(pole, light);
        ticks.push(t2 => { (light.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 + 0.8 * Math.abs(Math.sin(t2 * 3 + s.z)); });
      }
      if (s.bay) for (const target of unloadTo[s.bay] ?? []) {
        // Selang dari truk ke Raw Milk Buffer; butiran susu mengalir sepanjang selang.
        const end = silos.get(target);
        if (!end) continue;
        const start = new THREE.Vector3(x - 1.8, 0.7, s.z + 0.6);
        const curve = new THREE.CatmullRomCurve3([start, new THREE.Vector3(start.x - 0.4, 0.3, s.z + 1.5), new THREE.Vector3(s.x + 4.2, 0.35, s.z + 1.5), new THREE.Vector3(end.x - 2, 0.5, end.z), end]);
        const hose = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.12, 8), hoseMat);
        hose.castShadow = true;
        scene.add(hose);
        const dots = Array.from({ length: 6 }, (_, i) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), milkMat); d.userData.o = i / 6; scene.add(d); return d; });
        ticks.push(t2 => { for (const d of dots) d.position.copy(curve.getPointAt((t2 * 0.22 + d.userData.o) % 1)); });
      }
      if (t.id === picked) {
        const sel = new THREE.Mesh(new THREE.RingGeometry(2.7, 2.95, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: css("primary") }));
        sel.position.set(x, 0.13, s.z);
        scene.add(sel);
      }
      tags.set(t.id, tag(t.id, `scene-tag flow3d-tag peek-tag ${t.tone}${t.id === picked ? " picked" : ""}${t.tone === "crit" || t.id === picked ? " open" : ""}`, new THREE.Vector3(x, 2.5, s.z - 0.6), truckLine(t)));
    }

    // RT dalam perjalanan: berjalan di jalan masuk menuju gerbang; palang terangkat saat truk sampai.
    const ghosts = layout.slots.filter(sl => sl.ghost);
    const coming = ghosts.map((_, i) => {
      const { group, wheels } = truck(css("on-surface-muted"), true);
      scene.add(group);
      return { group, wheels, offset: i / ghosts.length };
    });
    const SPAN = 28;
    ticks.push((t, dt) => {
      let open = 0;
      for (const c of coming) {
        const k = (t * 0.045 + c.offset) % 1;
        c.group.position.set(GATE_X - SPAN + k * SPAN, 0, 1.8);
        for (const w of c.wheels) w.rotation.z -= dt * 4;
        const alpha = Math.min(0.6, k * 4, (1 - k) * 8);
        c.group.traverse(o => { if (o instanceof THREE.Mesh) (o.material as THREE.MeshStandardMaterial).opacity = alpha; });
        if (k > 0.82) open = Math.max(open, Math.min(1, (k - 0.82) / 0.08));
      }
      boom.rotation.x = -open * Math.PI * 0.45;
    });
    if (reduced) coming.forEach((c, i) => c.group.position.set(GATE_X - SPAN + (i + 0.5) * (SPAN / coming.length), 0, 1.8));
    if (coming.length) tag("Dalam perjalanan", "flow3d-stage neutral", new THREE.Vector3(GATE_X - SPAN / 2, 0.3, -6), `${coming.length} RT menuju plant`);

    // Kamera: tampak seluruh halaman, lalu masuk perlahan saat pertama dibuka.
    const fit = () => {
      const w = el.clientWidth, h = el.clientHeight, aspect = w / h, half = 14;
      Object.assign(camera, { left: -half * aspect, right: half * aspect, top: half, bottom: -half });
      renderer.setSize(w, h);
      labels.setSize(w, h);
      camera.updateProjectionMatrix();
    };
    fit();
    const goalZoom = Math.min(1.7, (28 * el.clientWidth / el.clientHeight) / 56, 28 / 26);
    controls.target.copy(saved.current?.target ?? new THREE.Vector3(5, 0, 1));
    camera.position.copy(saved.current?.pos ?? new THREE.Vector3(0, 30, 37));
    camera.zoom = saved.current?.zoom ?? (reduced ? goalZoom : goalZoom * 0.6);
    camera.updateProjectionMatrix();
    controls.update();
    let intro = saved.current || reduced ? 1 : 0;
    const observer = new ResizeObserver(fit);
    observer.observe(el);

    // Klik memilih truk; kursor di atas truk mengangkatnya sedikit.
    const ray = new THREE.Raycaster();
    let down: { x: number; y: number } | null = null, hover: string | undefined;
    const at = (e: PointerEvent) => { const r = el.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera); return ray.intersectObjects([...groups.values()], true)[0]?.object.userData.id as string | undefined; };
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; intro = 1; };
    const onUp = (e: PointerEvent) => { if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) pickRef.current(at(e) ?? null); };
    const onMove = (e: PointerEvent) => { if (e.buttons) return; const next = at(e); if (next !== hover) { if (hover) tags.get(hover)?.classList.remove("hover"); if (next) tags.get(next)?.classList.add("hover"); hover = next; } labels.domElement.style.cursor = hover ? "pointer" : ""; };
    labels.domElement.addEventListener("pointerdown", onDown);
    labels.domElement.addEventListener("pointerup", onUp);
    labels.domElement.addEventListener("pointermove", onMove);

    const clock = new THREE.Clock();
    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
      if (!reduced) for (const tick of ticks) tick(t, dt);
      if (intro < 1) { intro = Math.min(1, intro + dt / 1.4); camera.zoom = goalZoom * (0.6 + 0.4 * (1 - (1 - intro) ** 3)); camera.updateProjectionMatrix(); }
      for (const [id, g] of groups) if (byId.get(id)?.tone !== "crit") g.position.y += ((id === hover ? 0.3 : 0) - g.position.y) * 0.2;
      controls.update();
      labels.domElement.dataset.zoom = camera.zoom < 0.5 ? "far" : "near";
      renderer.render(scene, camera);
      labels.render(scene, camera);
    };
    loop();

    return () => {
      saved.current = { pos: camera.position.clone(), target: controls.target.clone(), zoom: camera.zoom };
      cancelAnimationFrame(frame);
      observer.disconnect();
      labels.domElement.removeEventListener("pointerdown", onDown);
      labels.domElement.removeEventListener("pointerup", onUp);
      labels.domElement.removeEventListener("pointermove", onMove);
      controls.dispose();
      scene.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } });
      scene.environment?.dispose();
      room.dispose();
      pmrem.dispose();
      renderer.dispose();
      el.replaceChildren();
    };
  }, [tankers, assets, layout, picked]);

  return <div ref={host} className="queue-3d" role="img" aria-label={label} tabIndex={0} />;
}
