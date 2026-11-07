"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Minus, Move, Plus, Rotate3d, RotateCcw, RotateCw, Scan } from "lucide-react";
import * as THREE from "three";
import { MapControls } from "three/examples/jsm/controls/MapControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { asepticTanks, fillers, midTanks, type UnitState, type AsepticTank, type Filler, type MidTank } from "@/mock/ops";
import { SITE, SITE_STATUS, type Focus } from "@/mock/site";
import type { Tone } from "@/mock/types";
import { API_MODE } from "@/lib/api/client";
import { useResource } from "@/lib/api/resource";

export type SceneState = "before" | "after";
export type { Focus };
export type SiteLayout = typeof SITE;
export type SiteStatus = (typeof SITE_STATUS)["before"] & { viewLabel?: string };
type Status = Tone | "milk";
const token = (name: string) => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim());

// Geometri dan status situs datang dari mock/site.ts (nanti GET /api/v1/site/layout dan /site/status).
const deg = THREE.MathUtils.degToRad;
const HALL = { ...SITE.hall, theta: deg(SITE.hall.thetaDeg) };
/** Titik di dalam gedung utama: t melintang (barat negatif), s sepanjang gedung dari ujung utara. */
const H = (t: number, s: number): [number, number] => [HALL.x + Math.cos(HALL.theta) * t + Math.sin(HALL.theta) * s, HALL.z - Math.sin(HALL.theta) * t + Math.cos(HALL.theta) * s];
const BAYS = HALL.bays.map(b => b.t);
const LANE = Object.fromEntries(HALL.lanes.map(l => [l.at, l.t]));
const ST = HALL.stations;
const F2 = H(LANE["AT-2"] - ST.fillerOffset, ST.fillerS);
const LAB = SITE.buildings.find(b => b.id === "lab")!;

/** Sasaran kamera: titik (x, z), tinggi y, dan zoom. */
const aim = ([x, z]: [number, number], y: number, zoom: number): [number, number, number, number] => [x, y, z, zoom];
const FOCI: Record<Focus, [number, number, number, number]> = {
  overview: aim([0, 20], 2, 1), lab: aim([LAB.x, LAB.z], 0, 3.4), yard: aim([SITE.pois.yard.x, -10], 0, 2.8),
  bay1: aim(H(BAYS[0], -6), 0, 4), bay2: aim(H(BAYS[1], -6), 0, 4), silos: aim(H(HALL.silos.t, HALL.silos.items[1].s), 6, 3.4), f2: aim(F2, 0, 3.6),
};
const FOOTPRINT = new THREE.Box3(new THREE.Vector3(...SITE.footprint.min), new THREE.Vector3(...SITE.footprint.max));
const UNIT: Record<UnitState, Status> = { jalan: "milk", cip: "warn", siaga: "neutral", breakdown: "crit", "ganti-format": "warn" };


export function PlantScene({
  state,
  focus,
  roof,
  label,
  layout,
  status: propStatus,
  asepticTanks: propAseptic,
  fillers: propFillers,
  midTanks: propMidTanks,
}: {
  state: SceneState;
  focus: Focus;
  roof: boolean;
  label: string;
  layout?: SiteLayout | null;
  status?: SiteStatus | null;
  asepticTanks?: AsepticTank[] | null;
  fillers?: Filler[] | null;
  midTanks?: MidTank[] | null;
}) {
  void layout;
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<{ position: THREE.Vector3; target: THREE.Vector3; zoom: number } | null>(null);
  const goal = useRef<{ target: THREE.Vector3; zoom: number; jump: boolean } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const zoomNow = useRef(1);
  const targetNow = useRef(new THREE.Vector3(...FOCI.overview.slice(0, 3) as [number, number, number]));
  const [full, setFull] = useState(false);
  const [mode, setMode] = useState<"putar" | "geser">("putar");
  const [auto, setAuto] = useState(false);
  const controlsRef = useRef<MapControls | null>(null);
  const spin = useRef(0);
  const prefs = useRef({ mode, auto });

  const layoutRes = useResource<SiteLayout>(API_MODE ? "/site/layout" : null);
  const statusRes = useResource<SiteStatus>(API_MODE && !propStatus ? `/site/status?view=${state}` : null);
  const asepticRes = useResource<AsepticTank[]>(API_MODE && !propAseptic ? "/production/aseptic-tanks" : null);
  const fillersRes = useResource<Filler[]>(API_MODE && !propFillers ? "/production/fillers" : null);
  const midTanksRes = useResource<MidTank[]>(API_MODE && !propMidTanks ? "/assets/mid-tanks" : null);

  const activeStatus = API_MODE ? (propStatus ?? statusRes.data) : SITE_STATUS[state];
  const activeAseptic = API_MODE ? (propAseptic ?? asepticRes.data) : asepticTanks;
  const activeFillers = API_MODE ? (propFillers ?? fillersRes.data) : fillers;
  const activeMidTanks = API_MODE ? (propMidTanks ?? midTanksRes.data) : midTanks;
  /** Seret kiri memutar (mode putar) atau menggeser (mode geser); tombol kanan selalu kebalikannya. */
  const applyPrefs = (c: MapControls) => {
    const rotate = prefs.current.mode === "putar";
    c.mouseButtons = { LEFT: rotate ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: rotate ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE };
    c.touches = { ONE: rotate ? THREE.TOUCH.ROTATE : THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
    c.autoRotate = prefs.current.auto;
  };
  useEffect(() => { prefs.current = { mode, auto }; if (controlsRef.current) applyPrefs(controlsRef.current); }, [mode, auto]);
  const fly = (key: Focus, zoom?: number) => {
    const [x, y, z, z0] = FOCI[key];
    goal.current = { target: new THREE.Vector3(x, y, z), zoom: zoom ?? z0, jump: window.matchMedia("(prefers-reduced-motion: reduce)").matches };
  };
  const zoomBy = (k: number) => { goal.current = { target: goal.current?.target ?? targetNow.current.clone(), zoom: Math.min(9, Math.max(0.7, zoomNow.current * k)), jump: false }; };
  useEffect(() => fly(focus), [focus]);
  useEffect(() => {
    const sync = () => setFull(document.fullscreenElement === wrap.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  useEffect(() => {
    if (!host.current || !activeStatus || !activeAseptic || !activeFillers || !activeMidTanks) return;
    const el = host.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const s = activeStatus;
    const P = SITE.pois;

    // Palet dari token desain: gedung putih matte, tanah hijau lembut, aksen hijau brand.
    const white = token("surface"), canvas = token("canvas"), ink = token("on-surface"), green = token("accent-fill"), brand = token("primary"), dark = token("surface-inverse"), focusBlue = token("focus");
    const mix = (a: THREE.Color, b: THREE.Color, t: number) => a.clone().lerp(b, t);
    const tone = (t: Status) => token({ ok: "status-ok", warn: "status-warn", crit: "status-crit", neutral: "on-surface-muted", milk: "accent-fill" }[t]);
    const matte = (color: THREE.Color, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness });
    const cool = mix(white, focusBlue, 0.06);

    // Atap panel surya: tekstur grid sel gelap dengan celah terang, seperti terlihat di citra satelit.
    const solarTex = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const g = c.getContext("2d")!;
      g.fillStyle = `#${mix(white, ink, 0.25).getHexString()}`; g.fillRect(0, 0, 128, 128);
      g.fillStyle = `#${mix(dark, focusBlue, 0.3).getHexString()}`;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) g.fillRect(3 + i * 31, 3 + j * 63, 28, 58);
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    })();
    const M = {
      wall: matte(white), wallShade: matte(mix(white, ink, 0.08)), floor: matte(mix(cool, ink, 0.06), 0.9),
      roofWhite: matte(mix(white, ink, 0.05), 0.6), roofRed: matte(mix(tone("crit"), white, 0.35), 0.8), roofBlue: matte(mix(focusBlue, white, 0.35), 0.7),
      ground: matte(mix(green, white, 0.45), 1), paved: matte(mix(cool, ink, 0.16), 0.95), road: matte(mix(cool, ink, 0.34), 0.9),
      line: matte(white, 0.8), parking: matte(mix(tone("warn"), white, 0.35), 0.8),
      steel: new THREE.MeshStandardMaterial({ color: mix(white, ink, 0.1), roughness: 0.35, metalness: 0.55 }),
      frame: matte(mix(white, ink, 0.4), 0.6), door: matte(mix(dark, ink, 0.4), 0.9), shutter: matte(mix(cool, ink, 0.16), 0.7),
      glass: new THREE.MeshStandardMaterial({ color: mix(dark, focusBlue, 0.25), roughness: 0.1, metalness: 0.4 }),
      brand: matte(brand, 0.6), cab: matte(brand, 0.5), tyre: matte(mix(ink, dark, 0.3), 0.8), boxBody: matte(mix(white, ink, 0.04), 0.7),
      leaf: new THREE.MeshStandardMaterial({ color: mix(green, dark, 0.25), roughness: 0.9, flatShading: true }),
      water: new THREE.MeshStandardMaterial({ color: mix(green, focusBlue, 0.35), roughness: 0.2, metalness: 0.1 }),
      sludge: matte(mix(tone("warn"), dark, 0.35), 0.9),
      belt: matte(mix(ink, canvas, 0.35), 0.7), carton: matte(mix(white, dark, 0.22), 0.8), pallet: matte(mix(dark, white, 0.6), 0.9), wrap: matte(mix(white, green, 0.15), 0.6),
      car: matte(mix(white, ink, 0.2), 0.5),
      milk: new THREE.MeshStandardMaterial({ color: green, emissive: green, emissiveIntensity: 0.5 }),
    };
    const solar = (w: number, d: number) => { const t = solarTex.clone(); t.needsUpdate = true; t.repeat.set(w / 8, d / 8); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.35, metalness: 0.3 }); };
    const status = (t: Status, opacity = 1) => new THREE.MeshStandardMaterial({ color: tone(t), roughness: 0.6, transparent: opacity < 1, opacity });

    const scene = new THREE.Scene();
    scene.background = mix(cool, ink, 0.05);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1500);
    camera.position.copy(view.current?.position ?? new THREE.Vector3(-130, 210, 250));
    camera.zoom = view.current?.zoom ?? 1;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    el.appendChild(renderer.domElement);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    scene.environment = pmrem.fromScene(room, 0.04).texture;
    scene.environmentIntensity = 0.45;
    const labels = new CSS2DRenderer();
    labels.domElement.className = "scene-labels";
    el.appendChild(labels.domElement);
    // Kontrol gaya peta: seret untuk menggeser, klik kanan atau dua jari untuk memutar, gulir untuk zoom ke kursor.
    const controls = new MapControls(camera, labels.domElement);
    controls.zoomToCursor = true;
    controls.screenSpacePanning = false;
    controls.panSpeed = 1.2;
    controls.keyPanSpeed = 24;
    controls.listenToKeyEvents(el);
    controls.autoRotateSpeed = 1.2;
    applyPrefs(controls);
    controls.addEventListener("start", () => setAuto(false));
    controlsRef.current = controls;
    const keys = (e: KeyboardEvent) => { if (e.key === "q" || e.key === "e") spin.current += (e.key === "q" ? 1 : -1) * Math.PI / 4; };
    el.addEventListener("keydown", keys);
    controls.target.copy(view.current?.target ?? new THREE.Vector3(...FOCI.overview.slice(0, 3) as [number, number, number]));
    camera.lookAt(controls.target);
    controls.enableDamping = !reduced;
    controls.minPolarAngle = 0.05;
    controls.maxPolarAngle = Math.PI * 0.4;
    controls.minZoom = 0.7;
    controls.maxZoom = 9;

    scene.add(new THREE.HemisphereLight(white, mix(cool, ink, 0.3), 0.85));
    const sun = new THREE.DirectionalLight(white, 2.6);
    sun.position.set(-90, 160, 70);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.radius = 4;
    sun.shadow.bias = -0.0004;
    Object.assign(sun.shadow.camera, { left: -200, right: 200, top: 180, bottom: -180, near: 1, far: 500 });
    scene.add(sun);

    const box = (w: number, h: number, d: number, r = 0) => r ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d);
    const cyl = (r: number, h: number, seg = 32) => new THREE.CylinderGeometry(r, r, h, seg);
    const put = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const tag = (text: string, t: Status, x: number, y: number, z: number, parent: THREE.Object3D = scene) => {
      const div = document.createElement("div");
      div.className = `scene-tag ${t}`;
      div.textContent = text;
      const obj = new CSS2DObject(div);
      obj.position.set(x, y, z);
      parent.add(obj);
    };
    // Pin melayang dengan halo di tanah menandai bottleneck.
    const pins: { group: THREE.Group; y: number }[] = [];
    const halos: THREE.Mesh[] = [];
    const pin = (x: number, y: number, z: number, t: Status, parent: THREE.Object3D = scene) => {
      const g = new THREE.Group();
      put(new THREE.SphereGeometry(1, 32, 16), status(t), 0, 1.4, 0, g).castShadow = false;
      put(new THREE.ConeGeometry(0.62, 1.4, 24), status(t), 0, 0.45, 0, g).rotation.x = Math.PI;
      put(new THREE.SphereGeometry(0.42, 24, 12), M.wall, 0, 1.45, 0.62, g);
      g.position.set(x, y, z);
      parent.add(g);
      pins.push({ group: g, y });
      const halo = put(new THREE.CircleGeometry(2.6, 48), new THREE.MeshBasicMaterial({ color: tone(t), transparent: true, opacity: 0.22 }), x, 0.32, z, parent);
      halo.rotation.x = -Math.PI / 2;
      halo.castShadow = false;
      halos.push(halo);
    };

    // Truk tangki susu: kabin hijau brand, tangki stainless. Sumbu +x lokal adalah bagian belakang.
    const tanker = (x: number, z: number, rotation = 0, parent: THREE.Object3D = scene) => {
      const g = new THREE.Group();
      put(box(2.6, 2.8, 2.5, 0.4), M.cab, -3.7, 2.05, 0, g);
      put(box(0.12, 1, 2.1, 0.05), M.glass, -5.02, 2.6, 0, g);
      put(box(10.2, 0.4, 1.8), M.frame, 0, 0.8, 0, g);
      const barrel = put(new THREE.CapsuleGeometry(1.25, 5.6, 8, 32), M.steel, 1.25, 2.3, 0, g);
      barrel.rotation.z = Math.PI / 2;
      barrel.scale.set(1, 1, 0.84);
      for (const wx of [-3.6, 2.4, 3.8]) for (const wz of [-0.95, 0.95]) put(cyl(0.58, 0.44, 16), M.tyre, wx, 0.58, wz, g).rotation.x = Math.PI / 2;
      g.position.set(x, 0, z);
      g.rotation.y = rotation;
      parent.add(g);
      return g;
    };
    // Truk boks distribusi barang jadi.
    const boxTruck = (x: number, z: number, rotation = 0) => {
      const g = new THREE.Group();
      put(box(2.2, 2.4, 2.3, 0.3), M.wall, -3.6, 1.8, 0, g);
      put(box(7, 3, 2.4, 0.1), M.boxBody, 0.9, 2.3, 0, g);
      for (const wx of [-3.4, 2.6]) for (const wz of [-1, 1]) put(cyl(0.5, 0.4, 12), M.tyre, wx, 0.5, wz, g).rotation.x = Math.PI / 2;
      g.position.set(x, 0, z);
      g.rotation.y = rotation;
      scene.add(g);
    };
    const vessel = (x: number, z: number, r: number, h: number, mat: THREE.Material = M.steel, parent: THREE.Object3D = scene, base = 0.6) => {
      put(cyl(r, h, 32), mat, x, base + h / 2, z, parent);
      put(new THREE.SphereGeometry(r, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat, x, base + h, z, parent).scale.y = 0.35;
      put(cyl(r * 0.9, base, 24), M.frame, x, base / 2, z, parent);
    };
    const roofMat = (kind: (typeof SITE.buildings)[number]["roof"], w: number, d: number) => kind === "solar" ? solar(w, d) : kind === "red" ? M.roofRed : kind === "blue" ? M.roofBlue : M.roofWhite;

    // Tanah, area perkerasan, jalan.
    put(box(420, 1, 330), M.ground, 15, -0.5, 25);
    const slab = (cx: number, cz: number, w: number, d: number, rot = 0, mat = M.paved) => { const m = put(box(w, 0.12, d), mat, cx, 0.06, cz); m.rotation.y = rot; return m; };
    for (const p of SITE.paved) slab(p.x, p.z, p.w, p.d);
    for (const road of SITE.roads) for (let i = 0; i < road.pts.length - 1; i++) {
      const [a, b] = [road.pts[i], road.pts[i + 1]];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const seg = put(box(len + road.w, 0.14, road.w), M.road, (a[0] + b[0]) / 2, 0.08, (a[1] + b[1]) / 2);
      seg.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
      seg.castShadow = false;
    }
    const entry = SITE.roads[0].pts;
    for (let x = entry[0][0] + 5; x < entry[1][0] - 5; x += 6) put(box(2.4, 0.02, 0.22), M.line, x, 0.17, entry[0][1]).castShadow = false;

    // Pohon: hutan di timur dan utara, deretan di tepi situs (seperti di citra satelit).
    const rand = (() => { let seed = 7; return () => (seed = (seed * 16807) % 2147483647) / 2147483647; })();
    const treeSpots: [number, number, number][] = [];
    const scatter = (x0: number, x1: number, z0: number, z1: number, n: number) => { for (let i = 0; i < n; i++) treeSpots.push([x0 + rand() * (x1 - x0), z0 + rand() * (z1 - z0), 6 + rand() * 5]); };
    for (const [x0, x1, z0, z1, n] of SITE.trees) scatter(x0, x1, z0, z1, n);
    const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), M.leaf, treeSpots.length);
    const dummy = new THREE.Object3D();
    treeSpots.forEach(([x, z, h], i) => { dummy.position.set(x, h * 0.45, z); dummy.scale.set(h * 0.42, h * 0.45, h * 0.42); dummy.updateMatrix(); crowns.setMatrixAt(i, dummy.matrix); });
    crowns.castShadow = crowns.receiveShadow = true;
    scene.add(crowns);

    // Gedung lain di situs.
    for (const b of SITE.buildings) {
      const g = new THREE.Group();
      g.position.set(b.x, 0, b.z);
      g.rotation.y = deg(b.rotDeg);
      put(box(b.w, b.h, b.d, 0.2), M.wall, 0, b.h / 2, 0, g);
      if (b.roof === "pyramid") { const p = put(new THREE.ConeGeometry(Math.hypot(b.w, b.d) / 2, 4, 4), M.roofWhite, 0, b.h + 2, 0, g); p.rotation.y = Math.PI / 4; p.scale.z = b.d / b.w; }
      else put(box(b.w + 0.6, 0.4, b.d + 0.6), roofMat(b.roof, b.w, b.d), 0, b.h + 0.2, 0, g);
      if (b.label) tag(b.label, "neutral", 0, b.h + 3, 0, g);
      scene.add(g);
    }
    // Lab test: gerbang antrean.
    tag(s.lab.label, s.lab.tone, LAB.x, LAB.h + 7, LAB.z);
    pin(LAB.x, LAB.h + 5, LAB.z, s.lab.tone);
    // Jembatan conveyor bahan kemas ke gedung utama.
    const br = P.conveyorBridge;
    put(box(br.w, 3, br.d), M.wallShade, br.x, 7, br.z);
    // Pos jaga dan weighbridge di jalan masuk.
    put(box(4, 3.2, 4, 0.3), M.wall, P.gate.x, 1.6, P.gate.z);
    put(box(0.12, 0.12, 7), M.brand, P.gate.x + 4, 1.3, P.gate.z + 5);
    put(box(16, 0.24, 4), M.shutter, P.weighbridge.x, 0.2, P.weighbridge.z);
    tag("Gerbang dan weighbridge", "neutral", P.weighbridge.x - 10, 3, P.weighbridge.z + 6);
    // IPAL: kolam, tangki bulat, bak lumpur.
    const ipal = P.ipal;
    put(box(ipal.pond.w, 0.2, ipal.pond.d), M.water, ipal.pond.x, 0.12, ipal.pond.z);
    for (const { x, z, r } of ipal.tanks) { put(cyl(r, 4, 40), M.wallShade, x, 2, z); put(cyl(r - 0.4, 0.1, 40), M.sludge, x, 4.05, z); }
    put(box(ipal.sludge.w, 0.3, ipal.sludge.d), M.sludge, ipal.sludge.x, 0.2, ipal.sludge.z);
    put(box(10, 4, 8, 0.2), M.wall, ipal.house.x, 2, ipal.house.z);
    tag("IPAL", "neutral", ipal.pond.x - 14, 6, ipal.pond.z - 20);
    // Parkir mobil dan truk distribusi.
    for (let i = 0; i < P.carPark.cols * P.carPark.rows; i++) put(box(4.4, 1.5, 2, 0.4), M.car, P.carPark.x + (i % P.carPark.cols) * 9, 0.75, P.carPark.z + Math.floor(i / P.carPark.cols) * 10);
    for (let i = 0; i < P.dispatchRow.count; i++) boxTruck(P.dispatchRow.x, P.dispatchRow.z + i * P.dispatchRow.step);
    tag("Parkir truk distribusi (perkiraan)", "neutral", P.dispatchRow.x, 5, P.dispatchRow.z + P.dispatchRow.count * P.dispatchRow.step);
    for (const [x, z] of P.dockTrucks) boxTruck(x, z, HALL.theta + Math.PI / 2);

    // Antrean RT di jalur barat, menuju pos sampling dan lab.
    s.yard.forEach(({ rt, tone: t }, i) => {
      const z = P.yard.slots[i];
      tanker(P.yard.x, z, -Math.PI / 2);
      tag(rt, t, P.yard.x, 5, z);
      if (t === "crit") pin(P.yard.x + 4, 6, z, t);
    });
    tag("Yard antrean RT", "neutral", P.yard.x - 12, 2, -10);

    // Gedung utama: dinding (terpotong bila atap disembunyikan), lantai, dan isi proses dari utara ke selatan.
    const hall = new THREE.Group();
    hall.position.set(HALL.x, 0, HALL.z);
    hall.rotation.y = HALL.theta;
    scene.add(hall);
    const wallH = roof ? 13 : 2.6;
    put(box(HALL.width, 0.2, HALL.length), M.floor, 0, 0.1, HALL.length / 2, hall);
    put(box(0.6, wallH, HALL.length), M.wall, -HALL.width / 2, wallH / 2, HALL.length / 2, hall);
    put(box(0.6, wallH, HALL.length), M.wall, HALL.width / 2, wallH / 2, HALL.length / 2, hall);
    put(box(HALL.width, wallH, 0.6), M.wall, 0, wallH / 2, HALL.length, hall);
    put(box(HALL.width, 13, 0.6), M.wall, 0, 6.5, 0, hall);
    put(box(HALL.width + 0.1, 0.8, 0.7), M.brand, 0, 10.5, 0, hall);
    if (roof) {
      const cut = HALL.roofSplitS;
      put(box(HALL.width + 1, 0.5, cut), solar(HALL.width, cut), 0, 13.6, cut / 2, hall);
      put(box(HALL.width + 1, 0.5, HALL.length - cut), solar(HALL.width, HALL.length - cut), 0, 12.8, cut + (HALL.length - cut) / 2, hall);
    }
    // Zona di lantai.
    HALL.zones.forEach(({ name, from: a, to: b }, i) => { put(box(HALL.width - 3, 0.04, b - a), i % 2 ? M.floor : M.wallShade, 0, 0.22, (a + b) / 2, hall).castShadow = false; if (!roof) tag(name, "neutral", -HALL.width / 2 + 2, 3.4, a + 3, hall); });

    // Bay bongkar di dinding utara; truk mundur dari apron utara.
    BAYS.forEach((t, i) => {
      const { rt, tone: st, note } = s.bays[i];
      put(box(5.2, 5, 0.5), status(st === "ok" ? "milk" : st), t, 2.5, -0.1, hall);
      put(box(4.6, 4.6, 0.6), rt ? M.door : M.shutter, t, 2.3, -0.2, hall);
      if (rt) tanker(t, -7.5, -Math.PI / 2, hall);
      else pin(t, 6, -6, "warn", hall);
      tag(`${HALL.bays[i].id} · ${rt ?? note}`, st, t, 9, -8, hall);
    });
    // Raw Milk Buffer di luar dinding barat (kelompok tangki di citra satelit).
    s.silos.forEach((fill, i) => {
      const { id, s: sz } = HALL.silos.items[i], { t: st0, radius, height } = HALL.silos, st: Status = fill > 0.85 ? "warn" : "milk";
      vessel(st0, sz, radius, height, M.steel, hall, 1);
      put(box(0.5, height * fill, 0.6), status(st), st0 + radius + 0.3, 1 + height * fill / 2, sz, hall);
      tag(`${id} · ${Math.round(fill * 100)}%`, fill > 0.85 ? "warn" : "neutral", st0, height + 4, sz, hall);
    });
    // Pemrosesan: degassing, thermal, separator, storage ST-1..6, cream, premix, mixing.
    const pr = HALL.process;
    for (const t of pr.degassing) vessel(t, pr.s, 1.3, 4, M.steel, hall);
    for (const t of pr.thermal) put(box(4, 3, 6, 0.2), M.steel, t, 1.7, pr.s, hall);
    for (const t of pr.separator) { put(cyl(0.9, 2, 20), M.steel, t, 1.2, pr.s, hall); put(new THREE.ConeGeometry(1.3, 1.6, 20), M.steel, t, 3, pr.s, hall); }
    tag("Degassing · Thermal · Separator", "neutral", -1, 7.5, pr.s, hall);
    activeMidTanks.forEach(tank => {
      const cfg = HALL.midTanks[tank.id];
      if (!cfg) return;
      const { t, s: sz, r, h } = cfg;
      const st: Status = tank.state === "cip" ? "warn" : tank.state === "tertahan" ? "crit" : "neutral";
      vessel(t, sz, r, h, st === "neutral" ? M.steel : status(st), hall);
    });
    tag("Storage ST-1..6", "neutral", -12, 13.5, 38, hall);
    tag("Cream · Premix · Mixing", "neutral", 13, 9, 38, hall);

    // Lima jalur: UHT-n → AT-n → dua mesin filling → conveyor → palet.
    const cartons: { mesh: THREE.Mesh; from: number }[] = [];
    activeAseptic.forEach(at => {
      const t = LANE[at.id];
      if (t === undefined) return;
      const at2 = at.id === "AT-2";
      const starved = at2 && s.at2Starved;
      put(box(6, 3.2, 7, 0.2), status(UNIT[at.sterilizerState] ?? "neutral", 1), t, 1.8, ST.uhtS, hall);
      put(box(5.4, 1, 6.4, 0.1), M.steel, t, 3.9, ST.uhtS, hall);
      const atStatus: Status = starved ? "crit" : at.level ? "milk" : "neutral";
      const fill = starved ? 0.06 : at.level / at.capacity || 0.02;
      vessel(t, ST.atS, 2.2, 7, M.steel, hall);
      put(box(0.5, 7 * fill, 0.6), status(atStatus), t + 2.4, 0.6 + 3.5 * fill, ST.atS, hall);
      tag(`${at.sterilizer} → ${at.id}`, starved ? "crit" : UNIT[at.sterilizerState] === "milk" ? "neutral" : "warn", t, 11, ST.atS - 10, hall);
      if (starved) pin(t, 10, ST.atS, "crit", hall);
      at.fillers.forEach((id, k) => {
        const f = activeFillers.find(x => x.id === id);
        if (!f) return;
        const ft = t + (k ? ST.fillerOffset : -ST.fillerOffset);
        const starving = starved && f.state === "jalan";
        const fs: Status = starving ? "crit" : (UNIT[f.state] ?? "neutral");
        const belt = ST.conveyorTo - ST.conveyorFrom;
        put(box(3.4, 3, 4, 0.25), M.wall, ft, 1.7, ST.fillerS, hall);
        put(box(3.45, 0.35, 4.05), status(fs), ft, 0.4, ST.fillerS, hall);
        put(box(1, 0.3, belt), M.belt, ft, 1.1, ST.conveyorFrom + belt / 2, hall);
        put(box(2.6, 0.3, 2.6), M.pallet, ft, 0.45, ST.palletS, hall);
        put(box(2.4, 2, 2.4, 0.15), M.wrap, ft, 1.6, ST.palletS, hall);
        if (f.state === "jalan" && !starving) for (let c = 0; c < 6; c++) { const mesh = put(box(0.5, 0.6, 0.5, 0.05), M.carton, ft, 1.6, ST.conveyorFrom, hall); cartons.push({ mesh, from: c * 9 }); }
        if (fs === "crit") pin(ft, 6, ST.fillerS, "crit", hall);
        if (id === "F2" || id === "F4" || f.state === "breakdown") tag(starving ? `${id} · starvation ${s.starvationAt}` : `${id} · ${f.state === "breakdown" ? "breakdown" : (f.product || "").replace("UHT ", "")}`, fs === "milk" ? "neutral" : fs, ft, 7, ST.fillerS - 4, hall);
      });
    });

    // Aliran susu: bay → RMT → pemrosesan → storage → mixing → UHT-2 → AT-2 → F2, sebagai pipa atas dengan butir bergerak.
    const route = HALL.milkRoute.map(([t, sz]) => new THREE.Vector3(t, 9, sz));
    const lengths = route.slice(1).map((p, i) => p.distanceTo(route[i]));
    const total = lengths.reduce((a, b) => a + b, 0);
    route.slice(1).forEach((p, i) => {
      const a = route[i], mid = a.clone().add(p).multiplyScalar(0.5);
      const pipe = put(cyl(0.22, lengths[i], 10), M.steel, mid.x, mid.y, mid.z, hall);
      pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().sub(a).normalize());
    });
    const along = (d: number) => { let k = 0; while (k < lengths.length - 1 && d > lengths[k]) { d -= lengths[k]; k++; } return route[k].clone().lerp(route[k + 1], Math.min(1, d / lengths[k])); };
    const flowStops = s.at2Starved ? total - lengths.at(-1)! - lengths.at(-2)! : total;
    const flow = Array.from({ length: 26 }, () => put(new THREE.SphereGeometry(0.45, 12, 8), M.milk, 0, 9, 0, hall));

    // RT dalam perjalanan di jalan masuk.
    const inc = P.incoming, gap = inc.span / s.onTheWay;
    const incoming = Array.from({ length: s.onTheWay }, (_, i) => tanker(inc.from + i * gap, inc.z, Math.PI));
    tag(`On the way · ${s.onTheWay} RT`, "neutral", inc.from + 20, 6, inc.z - 3);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      renderer.setSize(w, h); labels.setSize(w, h);
      camera.updateMatrixWorld();
      const projected = new THREE.Box3();
      for (const x of [FOOTPRINT.min.x, FOOTPRINT.max.x]) for (const y of [FOOTPRINT.min.y, FOOTPRINT.max.y]) for (const z of [FOOTPRINT.min.z, FOOTPRINT.max.z]) projected.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
      const size = projected.getSize(new THREE.Vector3());
      const fit = Math.max(size.x / w, size.y / h) / 2;
      camera.left = -w * fit; camera.right = w * fit; camera.top = h * fit; camera.bottom = -h * fit;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    const clock = new THREE.Clock();
    let last = 0;
    const place = (t: number) => {
      flow.forEach((f, i) => { const d = (t * 6 + i * total / flow.length) % total; f.visible = d < flowStops; f.position.copy(along(d)); });
      cartons.forEach(({ mesh, from }) => { mesh.position.z = 131 + ((t * 2 + from) % 54); });
    };
    place(0);
    renderer.setAnimationLoop(() => {
      const t = clock.getElapsedTime(), dt = Math.min(t - last, 0.25);
      last = t;
      if (!reduced) {
        incoming.forEach((g, i) => { g.position.x = inc.from + ((t * 4 + i * gap) % inc.span); });
        pins.forEach(({ group, y }, i) => { group.position.y = y + Math.sin(t * 2.2 + i) * 0.35; group.rotation.y = Math.sin(t * 0.8 + i) * 0.4; });
        halos.forEach((h, i) => { const k = 1 + Math.sin(t * 2.2 + i) * 0.12; h.scale.set(k, k, k); });
        place(t);
      }
      const g = goal.current;
      if (g) {
        const k = g.jump ? 1 : 1 - Math.exp(-dt * 5), offset = camera.position.clone().sub(controls.target);
        controls.target.lerp(g.target, k);
        camera.position.copy(controls.target).add(offset);
        camera.zoom += (g.zoom - camera.zoom) * k;
        camera.updateProjectionMatrix();
        if (controls.target.distanceTo(g.target) < 0.05 && Math.abs(camera.zoom - g.zoom) < 0.01) goal.current = null;
      }
      if (spin.current) {
        const step = reduced || Math.abs(spin.current) < 0.002 ? spin.current : spin.current * (1 - Math.exp(-dt * 6));
        camera.position.sub(controls.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), step).add(controls.target);
        spin.current -= step;
      }
      // Kamera tidak boleh digeser keluar dari situs.
      const clamped = controls.target.clone().clamp(FOOTPRINT.min, FOOTPRINT.max);
      if (!clamped.equals(controls.target)) { camera.position.add(clamped.clone().sub(controls.target)); controls.target.copy(clamped); }
      zoomNow.current = camera.zoom;
      targetNow.current.copy(controls.target);
      controls.update();
      labels.domElement.dataset.zoom = camera.zoom < 1.8 ? "far" : camera.zoom < 3 ? "mid" : "near";
      renderer.render(scene, camera);
      labels.render(scene, camera);
    });
    return () => {
      view.current = { position: camera.position.clone(), target: controls.target.clone(), zoom: camera.zoom };
      controls.stopListenToKeyEvents();
      el.removeEventListener("keydown", keys);
      controlsRef.current = null;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      scene.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); const m = o.material as THREE.MeshStandardMaterial; m.map?.dispose(); m.dispose(); } });
      crowns.geometry.dispose();
      solarTex.dispose();
      scene.environment?.dispose();
      room.dispose();
      pmrem.dispose();
      renderer.dispose();
      el.replaceChildren();
    };
  }, [state, roof, activeStatus, activeAseptic, activeFillers, activeMidTanks]);

  if (API_MODE) {
    const error = layoutRes.error ?? statusRes.error ?? asepticRes.error ?? fillersRes.error ?? midTanksRes.error;
    if (error) {
      return (
        <div ref={wrap} className={`plant-scene-wrap ${full ? "full" : ""}`}>
          <div className="plant-scene" role="alert" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "360px" }}>
            <p className="crit-text">Gagal memuat visualisasi 3D: {error.message}</p>
          </div>
        </div>
      );
    }
    if (!activeStatus || !activeAseptic || !activeFillers || !activeMidTanks) {
      return (
        <div ref={wrap} className={`plant-scene-wrap ${full ? "full" : ""}`}>
          <div className="plant-scene" role="status" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "360px" }}>
            <p className="muted">Memuat visualisasi 3D…</p>
          </div>
        </div>
      );
    }
  }

  return <div ref={wrap} className={`plant-scene-wrap ${full ? "full" : ""}`}>
    <div ref={host} className="plant-scene" role="img" aria-label={`${label} Tombol panah menggeser, Q dan E memutar.`} tabIndex={0} />
    <div className="scene-controls" role="group" aria-label="Kontrol tampilan 3D">
      <button className="icon-button" aria-label="Perbesar" onClick={() => zoomBy(1.4)}><Plus size={17} strokeWidth={1.75} aria-hidden /></button>
      <button className="icon-button" aria-label="Perkecil" onClick={() => zoomBy(1 / 1.4)}><Minus size={17} strokeWidth={1.75} aria-hidden /></button>
      <button className="icon-button" aria-label="Putar ke kiri 45 derajat" onClick={() => { spin.current += Math.PI / 4; }}><RotateCcw size={17} strokeWidth={1.75} aria-hidden /></button>
      <button className="icon-button" aria-label="Putar ke kanan 45 derajat" onClick={() => { spin.current -= Math.PI / 4; }}><RotateCw size={17} strokeWidth={1.75} aria-hidden /></button>
      <button className={`icon-button ${auto ? "on" : ""}`} aria-label="Putar otomatis" aria-pressed={auto} onClick={() => setAuto(a => !a)}><Rotate3d size={17} strokeWidth={1.75} aria-hidden /></button>
      <button className="icon-button" aria-label="Lihat seluruh situs" onClick={() => fly("overview")}><Scan size={17} strokeWidth={1.75} aria-hidden /></button>
      <button className="icon-button" aria-label={full ? "Keluar layar penuh" : "Layar penuh"} onClick={() => full ? document.exitFullscreen() : wrap.current?.requestFullscreen()}>{full ? <Minimize2 size={17} strokeWidth={1.75} aria-hidden /> : <Maximize2 size={17} strokeWidth={1.75} aria-hidden />}</button>
    </div>
    <div className="scene-mode toggle" role="group" aria-label="Fungsi seret">
      <button aria-pressed={mode === "putar"} className={mode === "putar" ? "selected" : ""} onClick={() => setMode("putar")}><Rotate3d size={15} strokeWidth={1.75} aria-hidden />Seret untuk memutar</button>
      <button aria-pressed={mode === "geser"} className={mode === "geser" ? "selected" : ""} onClick={() => setMode("geser")}><Move size={15} strokeWidth={1.75} aria-hidden />Seret untuk menggeser</button>
    </div>
  </div>;
}
