"use client";

import { useState } from "react";
import { CheckCircle2, GitBranch, RefreshCw, ShieldAlert, Sliders } from "lucide-react";
import { Badge, Card, Icon, PageHeading, SectionTitle, Toggle } from "@/components/ui";
import { API_MODE, apiSend } from "@/lib/api/client";
import { useResource } from "@/lib/api/resource";
import { useDemo } from "@/lib/demo";

interface MasterSummary {
  version: string;
  sourcePackage: string;
  validationStatus: string;
  tables: Record<string, number>;
  numericalPlanningReady: boolean;
  notes: string[];
}

interface AssetRow {
  asset_id: string;
  asset_name: string;
  asset_type: string;
  area: string;
  clean_status: string;
  operational_status: string;
}

interface ConnectionRow {
  connection_id: string;
  source_asset_id: string;
  destination_asset_id: string;
  via_asset_id?: string;
  flow_type: string;
  is_active: string;
}

interface FinishedSKURow {
  finished_sku_id: string;
  sku_name: string;
  liquid_sku_id: string;
  pack_size_code: string;
  volume_ml?: string;
  market_variant: string;
  shelf_life_days?: string;
}

interface LineDedicationRow {
  line_id: string;
  line_name: string;
  technology: string;
  source_aseptic_tank_id: string;
  allowed_pack_size_codes: string;
  allowed_sku_ids: string;
}

interface ChangeoverResult {
  ruleId: string;
  precedence: string;
  activity: string;
  condition: string;
  requiresCip: boolean;
  cipRuleId?: string;
  cipRequirement?: string;
  additionalNote?: string;
}

const STATIC_FINISHED_SKUS: FinishedSKURow[] = [
  { finished_sku_id: "ESL-FC-1000-LOCAL", sku_name: "Fresh Milk Pasteurized 1000ml", liquid_sku_id: "ESL-FC", pack_size_code: "1000ml", market_variant: "LOCAL", shelf_life_days: "30" },
  { finished_sku_id: "ESL-CH-1000-LOCAL", sku_name: "Fresh Choco Pasteurized 1000ml", liquid_sku_id: "ESL-CH", pack_size_code: "1000ml", market_variant: "LOCAL", shelf_life_days: "30" },
  { finished_sku_id: "ESL-ST-1000-LOCAL", sku_name: "Fresh Strawberry Pasteurized 1000ml", liquid_sku_id: "ESL-ST", pack_size_code: "1000ml", market_variant: "LOCAL", shelf_life_days: "30" },
  { finished_sku_id: "UHT-FC-1000-LOCAL", sku_name: "UHT Full Cream 1000ml Local", liquid_sku_id: "UHT-FC", pack_size_code: "1000ml", market_variant: "LOCAL", shelf_life_days: "365" },
  { finished_sku_id: "UHT-FC-1000-EXP", sku_name: "UHT Full Cream 1000ml Export", liquid_sku_id: "UHT-FC", pack_size_code: "1000ml", market_variant: "EXP", shelf_life_days: "365" },
  { finished_sku_id: "UHT-FC-950-LOCAL", sku_name: "UHT Full Cream 950ml Local", liquid_sku_id: "UHT-FC", pack_size_code: "950ml", market_variant: "LOCAL", shelf_life_days: "365" },
  { finished_sku_id: "UHT-CH-1000-LOCAL", sku_name: "UHT Chocolate 1000ml Local", liquid_sku_id: "UHT-CH", pack_size_code: "1000ml", market_variant: "LOCAL", shelf_life_days: "365" },
  { finished_sku_id: "UHT-ST-1000-LOCAL", sku_name: "UHT Strawberry 1000ml Local", liquid_sku_id: "UHT-ST", pack_size_code: "1000ml", market_variant: "LOCAL", shelf_life_days: "365" },
  { finished_sku_id: "UHT-SK-1000-LOCAL", sku_name: "UHT Skim 1000ml Local", liquid_sku_id: "UHT-SK", pack_size_code: "1000ml", market_variant: "LOCAL", shelf_life_days: "365" },
  { finished_sku_id: "UHT-WC-1000-LOCAL", sku_name: "UHT Whipping Cream 1000ml Local", liquid_sku_id: "UHT-WC", pack_size_code: "1000ml", market_variant: "LOCAL", shelf_life_days: "365" },
];

export function MasterDataView() {
  const { role } = useDemo();
  const [tab, setTab] = useState<"ringkasan" | "topologi" | "sku" | "lini" | "changeover">("ringkasan");
  const [assetFilter, setAssetFilter] = useState("SEMUA");
  const [fromSku, setFromSku] = useState("UHT-FC-1000-LOCAL");
  const [toSku, setToSku] = useState("UHT-CH-1000-LOCAL");
  const [classifying, setClassifying] = useState(false);
  const [classifyResult, setClassifyResult] = useState<ChangeoverResult | null>(null);
  const [classifyError, setClassifyError] = useState<string | null>(null);

  const summaryRes = useResource<MasterSummary>(API_MODE ? "/master" : null);
  const assetsRes = useResource<AssetRow[]>(API_MODE ? "/master/assets" : null);
  const connectionsRes = useResource<ConnectionRow[]>(API_MODE ? "/master/connections" : null);
  const finishedRes = useResource<FinishedSKURow[]>(API_MODE ? "/master/finished-skus" : null);
  const linesRes = useResource<{ dedications: LineDedicationRow[]; lineProductCompatibilities: unknown[]; lineFinishedSkuCompatibilities: unknown[] }>(API_MODE ? "/master/lines" : null);

  const summary = summaryRes.data ?? {
    version: "v2.1",
    sourcePackage: "Greenfields_Ideation_Package_v2_1",
    validationStatus: "VALID",
    tables: {
      asset_configuration: 73,
      asset_connections: 118,
      product_catalog: 8,
      pack_sizes: 5,
      market_variants: 2,
      finished_sku_catalog: 44,
      line_dedication: 10,
      line_product_compatibility: 58,
      line_finished_sku_compatibility: 116,
      changeover_rules: 4,
      cip_rules: 5,
      constraint_catalog: 14,
      unit_conversion: 14,
    },
    numericalPlanningReady: false,
    notes: [
      "13 tabel CSV tervalidasi 100% konsisten relasional pada startup backend.",
      "73 aset dan 118 koneksi rute disajikan sebagai route-capability resmi.",
      "Field numerik bertanda 'X' dan 'N/A' tetap berstatus placeholder asli, tidak dikonversi sepihak ke angka 0.",
    ],
  };

  const assets = assetsRes.data ?? [];
  const connections = connectionsRes.data ?? [];
  const finishedSkus = (finishedRes.data && finishedRes.data.length > 0) ? finishedRes.data : STATIC_FINISHED_SKUS;
  const lineDedications = linesRes.data?.dedications ?? [];

  const assetTypes = ["SEMUA", ...Array.from(new Set(assets.map(a => a.asset_type)))].filter(Boolean);
  const filteredAssets = assetFilter === "SEMUA" ? assets : assets.filter(a => a.asset_type === assetFilter);

  async function handleClassify() {
    setClassifying(true);
    setClassifyError(null);
    if (!API_MODE) {
      // Mock classifier evaluation
      const from = finishedSkus.find(s => s.finished_sku_id === fromSku);
      const to = finishedSkus.find(s => s.finished_sku_id === toSku);
      const flavourFrom = from?.liquid_sku_id.includes("CH") ? "Chocolate" : from?.liquid_sku_id.includes("ST") ? "Strawberry" : "Full Cream";
      const flavourTo = to?.liquid_sku_id.includes("CH") ? "Chocolate" : to?.liquid_sku_id.includes("ST") ? "Strawberry" : "Full Cream";
      const requiresCip = (flavourFrom === "Chocolate" && flavourTo === "Strawberry") || (flavourFrom === "Strawberry" && flavourTo === "Chocolate") || ((flavourFrom === "Chocolate" || flavourFrom === "Strawberry") && flavourTo === "Full Cream");

      setClassifyResult({
        ruleId: flavourFrom !== flavourTo ? "VARIANT" : (from?.pack_size_code !== to?.pack_size_code ? "SIZE" : (from?.market_variant !== to?.market_variant ? "PAPER" : "NONE")),
        precedence: flavourFrom !== flavourTo ? "FIRST" : (from?.pack_size_code !== to?.pack_size_code ? "SECOND" : (from?.market_variant !== to?.market_variant ? "THIRD" : "LAST")),
        activity: flavourFrom !== flavourTo ? "Variant Changeover" : (from?.pack_size_code !== to?.pack_size_code ? "Size Change" : (from?.market_variant !== to?.market_variant ? "Paper Change" : "None")),
        condition: flavourFrom !== flavourTo ? "Flavour_variant_changes" : (from?.pack_size_code !== to?.pack_size_code ? "Same_flavour_different_size_any_market" : "Same_sku"),
        requiresCip,
        cipRuleId: requiresCip ? (flavourTo === "Full Cream" ? "CIP_CH_ST" : "CIP_FLAVOUR") : undefined,
        cipRequirement: requiresCip ? "CIP wajib diselesaikan sebelum produk berikutnya dijalankan" : undefined,
        additionalNote: "Hasil evaluasi simulator aturan Greenfields v2.1",
      });
      setClassifying(false);
      return;
    }

    try {
      const res = await apiSend<ChangeoverResult>(
        "POST",
        "/master/changeover/classify",
        { from: fromSku, to: toSku },
        role
      );
      setClassifyResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengklasifikasikan transisi changeover";
      setClassifyError(msg);
    } finally {
      setClassifying(false);
    }
  }

  return (
    <div className="page-enter">
      <PageHeading
        title="Katalog Master Greenfields"
        subtitle="Spesifikasi resmi pabrik: 13 tabel master relasional, 73 aset, 118 rute aliran, 44 SKU, dan aturan transisi CIP."
      />

      <section className="callout" style={{ borderLeft: "4px solid var(--color-primary, #00782A)" }}>
        <Icon icon={CheckCircle2} size={20} style={{ color: "#00782A" }} />
        <div>
          <strong>Status Integritas Dataset v2.1: {summary.validationStatus}</strong>
          <p>
            Semua 13 berkas CSV telah dimuat langsung dari paket Greenfields Ideation Package v2.1. Parameter kuantitatif (kapasitas tangki, kecepatan filler, laju alir, durasi CIP) saat ini mempertahankan tanda placeholder asli klien (&apos;X&apos; dan &apos;N/A&apos;). Solver dan visualisasi operasional tetap menggunakan model tervalidasi terpisah untuk mencegah kalkulasi palsu.
          </p>
        </div>
      </section>

      <div style={{ margin: "20px 0" }}>
        <Toggle
          label="Pilih tampilan katalog master"
          value={tab}
          onChange={setTab}
          options={[
            { value: "ringkasan", label: "Ringkasan 13 Tabel" },
            { value: "topologi", label: "Aset & Rute (73/118)" },
            { value: "sku", label: "Katalog Produk & SKU" },
            { value: "lini", label: "Dedikasi Lini" },
            { value: "changeover", label: "Simulator Changeover & CIP" },
          ]}
        />
      </div>

      {tab === "ringkasan" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="grid-2">
            <Card>
              <SectionTitle title="Inventaris Tabel Master" subtitle="13 tabel terverifikasi pada startup server" />
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nama Tabel</th>
                      <th>Jumlah Baris</th>
                      <th>Kategori</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary.tables).map(([name, count]) => (
                      <tr key={name}>
                        <td><span className="mono"><strong>{name}.csv</strong></span></td>
                        <td><Badge tone="ok">{count} record</Badge></td>
                        <td className="small muted">
                          {name.includes("asset") ? "Topologi Pabrik" : name.includes("sku") || name.includes("product") ? "Katalog Produk" : name.includes("line") ? "Alokasi & Lini" : "Aturan Operasional"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <SectionTitle title="Prinsip & Batasan Integritas" subtitle="Kepatuhan standar data klien" />
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div className="panel">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <Icon icon={ShieldAlert} size={16} style={{ color: "#00782A" }} />
                    <strong>Perlakuan Nilai Placeholder</strong>
                  </div>
                  <p className="small muted">
                    Sebanyak 531 sel berisi &apos;X&apos; dan &apos;N/A&apos; tidak diubah menjadi angka perkiraan atau nilai nol sembarangan. Flag <code className="mono">numericalPlanningReady: false</code> dipasang agar sistem tidak mengeksekusi perhitungan kapasitas matematis sebelum parameter riil diisi oleh pihak plant.
                  </p>
                </div>

                <div className="panel">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <Icon icon={GitBranch} size={16} />
                    <strong>Koneksi Rute vs Bukti Transfer</strong>
                  </div>
                  <p className="small muted">
                    Sebanyak 118 relasi di <code className="mono">asset_connections.csv</code> merepresentasikan kapabilitas rute pipa fisik yang diizinkan (route capability), bukan rekam transfer historis atau genealogi perpindahan susu aktif.
                  </p>
                </div>

                <div className="panel">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <Icon icon={Sliders} size={16} />
                    <strong>Dedikasi Tangki Aseptik &amp; Lini</strong>
                  </div>
                  <p className="small muted">
                    Setiap tangki aseptik AT-01 hingga AT-05 didedikasikan tepat ke 2 lini filling melalui pipa steril PIPE-01 hingga PIPE-10. Aturan AT_SAME_PRODUCT melarang dua lini yang berbagi satu tangki memproses produk berbeda secara simultan.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "topologi" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <Card>
            <SectionTitle
              title="73 Aset Konfigurasi Pabrik"
              subtitle="Dari Unloading Bay hingga Final Output"
              action={
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <label htmlFor="asset-type-select" className="small muted">Filter Tipe:</label>
                  <select
                    id="asset-type-select"
                    className="button secondary"
                    value={assetFilter}
                    onChange={e => setAssetFilter(e.target.value)}
                  >
                    {assetTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              }
            />
            <div className="table-wrap" style={{ maxHeight: "350px", overflowY: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>ID Aset</th>
                    <th>Nama Aset</th>
                    <th>Tipe Aset</th>
                    <th>Area</th>
                    <th>Status Bersih</th>
                    <th>Status Operasional</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="muted" style={{ textAlign: "center", padding: "20px" }}>
                        {API_MODE && assetsRes.loading ? "Memuat aset dari server..." : "Tidak ada aset yang sesuai filter."}
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map(a => (
                      <tr key={a.asset_id}>
                        <td><span className="mono"><strong>{a.asset_id}</strong></span></td>
                        <td>{a.asset_name}</td>
                        <td><Badge>{a.asset_type}</Badge></td>
                        <td className="small muted">{a.area}</td>
                        <td><Badge tone={a.clean_status === "CLEAN" ? "ok" : "warn"}>{a.clean_status || "CLEAN"}</Badge></td>
                        <td><Badge tone="neutral">{a.operational_status || "AVAILABLE"}</Badge></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <SectionTitle
              title="118 Jalur Koneksi Pipa Resmi"
              subtitle="Rute fisik yang diizinkan mengalirkan susu di dalam pabrik"
            />
            <div className="table-wrap" style={{ maxHeight: "350px", overflowY: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>ID Rute</th>
                    <th>Aset Sumber</th>
                    <th>Aset Tujuan</th>
                    <th>Melalui Pipa Khusus</th>
                    <th>Tipe Aliran</th>
                  </tr>
                </thead>
                <tbody>
                  {connections.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="muted" style={{ textAlign: "center", padding: "20px" }}>
                        {API_MODE && connectionsRes.loading ? "Memuat rute dari server..." : "Daftar 118 rute koneksi siap dimuat via API mode."}
                      </td>
                    </tr>
                  ) : (
                    connections.map(c => (
                      <tr key={c.connection_id}>
                        <td><span className="mono">{c.connection_id}</span></td>
                        <td><strong>{c.source_asset_id}</strong></td>
                        <td><strong>{c.destination_asset_id}</strong></td>
                        <td>{c.via_asset_id ? <Badge tone="ok">{c.via_asset_id}</Badge> : <span className="muted">-</span>}</td>
                        <td><span className="mono small">{c.flow_type}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === "sku" && (
        <Card>
          <SectionTitle
            title="Katalog 44 SKU Barang Jadi (Finished SKU)"
            subtitle="Kombinasi 8 Liquid SKU, 5 Ukuran Kemasan, dan 2 Varian Pasar (LOCAL / EXP)"
          />
          <div className="table-wrap" style={{ maxHeight: "500px", overflowY: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>ID Finished SKU</th>
                  <th>Nama Produk</th>
                  <th>Liquid SKU</th>
                  <th>Ukuran</th>
                  <th>Pasar</th>
                  <th>Masa Simpan</th>
                </tr>
              </thead>
              <tbody>
                {finishedSkus.map(s => (
                  <tr key={s.finished_sku_id}>
                    <td><span className="mono"><strong>{s.finished_sku_id}</strong></span></td>
                    <td>{s.sku_name}</td>
                    <td><Badge tone="neutral">{s.liquid_sku_id}</Badge></td>
                    <td><span className="mono">{s.pack_size_code}</span></td>
                    <td><Badge tone={s.market_variant === "LOCAL" ? "ok" : "warn"}>{s.market_variant}</Badge></td>
                    <td className="small muted">{s.shelf_life_days ? `${s.shelf_life_days} hari` : "Sesuai SOP"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "lini" && (
        <Card>
          <SectionTitle
            title="10 Lini Filling &amp; Dedikasi Tangki Aseptik"
            subtitle="Spesifikasi alokasi aseptic tank ke filling line"
          />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID Lini</th>
                  <th>Nama Mesin Filling</th>
                  <th>Teknologi</th>
                  <th>Sumber Tangki Aseptik</th>
                  <th>Ukuran Kemasan Diizinkan</th>
                  <th>SKU Produk Diizinkan</th>
                </tr>
              </thead>
              <tbody>
                {lineDedications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted" style={{ textAlign: "center", padding: "20px" }}>
                      {API_MODE && linesRes.loading ? "Memuat dedikasi lini..." : "Data lini dimuat via API mode."}
                    </td>
                  </tr>
                ) : (
                  lineDedications.map(l => (
                    <tr key={l.line_id}>
                      <td><span className="mono"><strong>{l.line_id}</strong></span></td>
                      <td>{l.line_name}</td>
                      <td><Badge>{l.technology}</Badge></td>
                      <td><Badge tone="ok">{l.source_aseptic_tank_id}</Badge></td>
                      <td className="mono small">{l.allowed_pack_size_codes}</td>
                      <td className="mono small">{l.allowed_sku_ids}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "changeover" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <Card>
            <SectionTitle
              title="Simulator Aturan Changeover &amp; CIP"
              subtitle="Evaluasi transisi antar SKU barang jadi berdasarkan aturan hirarkis Greenfields v2.1"
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginTop: "16px" }}>
              <div>
                <label htmlFor="sku-from-select" className="small" style={{ display: "block", marginBottom: "6px" }}><strong>SKU Saat Ini (From):</strong></label>
                <select
                  id="sku-from-select"
                  className="button secondary"
                  style={{ width: "100%" }}
                  value={fromSku}
                  onChange={e => setFromSku(e.target.value)}
                >
                  {finishedSkus.map(s => (
                    <option key={s.finished_sku_id} value={s.finished_sku_id}>
                      {s.finished_sku_id} ({s.sku_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="sku-to-select" className="small" style={{ display: "block", marginBottom: "6px" }}><strong>SKU Rencana Berikutnya (To):</strong></label>
                <select
                  id="sku-to-select"
                  className="button secondary"
                  style={{ width: "100%" }}
                  value={toSku}
                  onChange={e => setToSku(e.target.value)}
                >
                  {finishedSkus.map(s => (
                    <option key={s.finished_sku_id} value={s.finished_sku_id}>
                      {s.finished_sku_id} ({s.sku_name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: "16px" }}>
              <button
                className="button primary"
                disabled={classifying || fromSku === ""}
                onClick={() => void handleClassify()}
              >
                <Icon icon={RefreshCw} size={16} className={classifying ? "spin" : ""} />
                {classifying ? "Mengevaluasi Aturan..." : "Evaluasi Transisi Changeover"}
              </button>
            </div>

            {classifyError && (
              <p className="small crit-text" role="alert" style={{ marginTop: "12px" }}>
                {classifyError}
              </p>
            )}

            {classifyResult && (
              <div className="panel" style={{ marginTop: "20px", borderLeft: "4px solid var(--color-primary, #00782A)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px 0" }}>{classifyResult.activity}</h3>
                    <p className="small muted">Aturan Aktif: <code className="mono">{classifyResult.ruleId}</code> (Presedensi: {classifyResult.precedence})</p>
                  </div>
                  <Badge tone={classifyResult.requiresCip ? "crit" : "ok"}>
                    {classifyResult.requiresCip ? "CIP Wajib Dijalankan" : "Tidak Perlu CIP Khusus"}
                  </Badge>
                </div>

                <dl className="fact-list" style={{ marginTop: "14px" }}>
                  <div>
                    <dt>Kondisi Pemicu</dt>
                    <dd className="mono">{classifyResult.condition}</dd>
                  </div>
                  <div>
                    <dt>Kebutuhan CIP</dt>
                    <dd>{classifyResult.requiresCip ? (classifyResult.cipRequirement || "Wajib CIP sesuai SOP Flavour") : "Lanjut produksi setelah changeover mesin"}</dd>
                  </div>
                  {classifyResult.cipRuleId && (
                    <div>
                      <dt>Kode Aturan CIP</dt>
                      <dd className="mono">{classifyResult.cipRuleId}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Catatan Tambahan</dt>
                    <dd>{classifyResult.additionalNote || "SOP normal berlaku."}</dd>
                  </div>
                </dl>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
