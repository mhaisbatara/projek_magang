"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Pencil,
  Trash2,
  Plus,
  X,
  PackagePlus,
  ClipboardList,
  ShoppingCart,
  CheckCircle2,
  Send,
  PackageCheck,
  Ban,
} from "lucide-react";

// ============================================================
// Types
// ============================================================

type Obat = {
  kode_obat: string;
  nama_obat: string;
  kategori: string | null;
  satuan: string | null;
  stok: number;
  harga_beli: string | null;
  harga_jual: string | null;
  stok_minimum: number;
};

type Resep = {
  kode_resep: string;
  kode_kunjungan: string | null;
  tanggal_resep: string | null;
  status_dispensing: "menunggu" | "diracik" | "selesai";
  nama_pasien: string | null;
  no_rm: string | null;
};

type ResepDetail = Resep & {
  catatan: string | null;
  detail: {
    id: string;
    kode_obat: string;
    nama_obat: string;
    satuan: string;
    stok: number;
    dosis: string;
    jumlah: number;
    aturan_pakai: string;
  }[];
};

type Supplier = {
  kode_supplier: string;
  nama_supplier: string;
};

type PO = {
  kode_po: string;
  kode_supplier: string;
  nama_supplier: string | null;
  tanggal_po: string;
  status: "draft" | "dikirim" | "diterima" | "batal";
};

type Tab = "obat" | "resep" | "po";

export default function FarmasiPage() {
  const [tab, setTab] = useState<Tab>("obat");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 pb-5 border-b border-gray-200">
          <p className="text-xs font-semibold uppercase text-emerald-600 mb-1">
            Penunjang Medis
          </p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Farmasi</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola stok obat, proses resep dokter, dan pengadaan ke supplier.
          </p>
        </div>

        <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
          <TabButton active={tab === "obat"} onClick={() => setTab("obat")} icon={PackagePlus}>
            Stok Obat
          </TabButton>
          <TabButton active={tab === "resep"} onClick={() => setTab("resep")} icon={ClipboardList}>
            Resep / Dispensing
          </TabButton>
          <TabButton active={tab === "po"} onClick={() => setTab("po")} icon={ShoppingCart}>
            Purchase Order
          </TabButton>
        </div>

        {tab === "obat" && <ObatTab />}
        {tab === "resep" && <ResepTab />}
        {tab === "po" && <PoTab />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-emerald-600 text-emerald-700"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

// ============================================================
// TAB: Stok Obat
// ============================================================

function ObatTab() {
  const [list, setList] = useState<Obat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [form, setForm] = useState({
    nama_obat: "",
    kategori: "",
    satuan: "",
    stok: "",
    harga_beli: "",
    harga_jual: "",
    stok_minimum: "",
  });

  const [stokModalTarget, setStokModalTarget] = useState<Obat | null>(null);
  const [stokFisikInput, setStokFisikInput] = useState("");

  const fetchObat = async () => {
    try {
      const json = await api.get("/farmasi/obat");
      if (!json.success || !Array.isArray(json.data)) throw new Error("Format response tidak sesuai");
      setList(json.data);
      setError(null);
    } catch (err) {
      console.error("Fetch obat error:", err);
      setError(err instanceof Error ? err.message : "Gagal memuat data obat.");
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObat();
  }, []);

  const resetForm = () =>
    setForm({ nama_obat: "", kategori: "", satuan: "", stok: "", harga_beli: "", harga_jual: "", stok_minimum: "" });

  const openAdd = () => {
    setModalMode("add");
    setEditTarget(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (item: Obat) => {
    setModalMode("edit");
    setEditTarget(item.kode_obat);
    setForm({
      nama_obat: item.nama_obat || "",
      kategori: item.kategori || "",
      satuan: item.satuan || "",
      stok: String(item.stok ?? ""),
      harga_beli: item.harga_beli ? String(item.harga_beli) : "",
      harga_jual: item.harga_jual ? String(item.harga_jual) : "",
      stok_minimum: String(item.stok_minimum ?? ""),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_obat.trim()) {
      alert("Nama obat tidak boleh kosong");
      return;
    }

    setLoading(true);
    setIsModalOpen(false);
    try {
      if (modalMode === "add") {
        const json = await api.post("/farmasi/obat", {
          nama_obat: form.nama_obat,
          kategori: form.kategori || null,
          satuan: form.satuan || null,
          stok: form.stok ? Number(form.stok) : 0,
          harga_beli: form.harga_beli || null,
          harga_jual: form.harga_jual || null,
          stok_minimum: form.stok_minimum ? Number(form.stok_minimum) : 0,
        });
        if (!json.success) alert(json.message || "Gagal menambahkan obat");
      } else if (editTarget) {
        const json = await api.put(`/farmasi/obat/${editTarget}`, {
          nama_obat: form.nama_obat,
          kategori: form.kategori || null,
          satuan: form.satuan || null,
          harga_beli: form.harga_beli || null,
          harga_jual: form.harga_jual || null,
          stok_minimum: form.stok_minimum ? Number(form.stok_minimum) : 0,
        });
        if (!json.success) alert(json.message || "Gagal memperbarui obat");
      }
      await fetchObat();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: Obat) => {
    if (!confirm(`Hapus obat ${item.nama_obat}? Tindakan ini permanen.`)) return;
    setActionLoading(item.kode_obat);
    try {
      const json = await api.delete(`/farmasi/obat/${item.kode_obat}`);
      if (!json.success) alert(json.message || "Gagal menghapus obat");
      await fetchObat();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setActionLoading(null);
    }
  };

  const openStokModal = (item: Obat) => {
    setStokModalTarget(item);
    setStokFisikInput(String(item.stok));
  };

  const handleStokSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stokModalTarget) return;
    if (stokFisikInput === "" || isNaN(Number(stokFisikInput))) {
      alert("Stok fisik wajib diisi berupa angka");
      return;
    }
    setActionLoading(stokModalTarget.kode_obat);
    try {
      const json = await api.patch(`/farmasi/obat/${stokModalTarget.kode_obat}/stok`, {
        stok_fisik: Number(stokFisikInput),
      });
      if (!json.success) alert(json.message || "Gagal menyesuaikan stok");
      setStokModalTarget(null);
      await fetchObat();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && list.length === 0) return <LoadingBlock text="Memuat data obat…" />;
  if (error) return <ErrorBlock error={error} onRetry={() => { setLoading(true); fetchObat(); }} />;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-all shadow-sm active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Tambah Obat
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyBlock text="Belum ada data obat." onAdd={openAdd} addLabel="Tambah Obat Pertama" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Kode</th>
                <th className="px-4 py-3">Nama Obat</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Satuan</th>
                <th className="px-4 py-3 text-right">Stok</th>
                <th className="px-4 py-3 text-right">Harga Jual</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((item) => {
                const low = item.stok <= item.stok_minimum;
                return (
                  <tr key={item.kode_obat} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-500">{item.kode_obat}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.nama_obat}</td>
                    <td className="px-4 py-3 text-gray-500">{item.kategori || "-"}</td>
                    <td className="px-4 py-3 text-gray-500">{item.satuan || "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openStokModal(item)}
                        disabled={actionLoading === item.kode_obat}
                        className={`font-mono font-semibold px-2 py-0.5 rounded-full text-xs ${
                          low ? "bg-rose-50 text-rose-600" : "bg-gray-100 text-gray-700"
                        } hover:opacity-75 transition-opacity disabled:opacity-50`}
                        title="Klik untuk sesuaikan stok"
                      >
                        {item.stok}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {item.harga_jual ? `Rp${Number(item.harga_jual).toLocaleString("id-ID")}` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={actionLoading === item.kode_obat}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-50"
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tambah/Edit Obat */}
      {isModalOpen && (
        <Modal title={modalMode === "add" ? "Tambah Obat Baru" : "Edit Obat"} onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit}>
            <div className="space-y-3 mb-5">
              <Field label="Nama Obat">
                <input
                  type="text"
                  value={form.nama_obat}
                  onChange={(e) => setForm({ ...form, nama_obat: e.target.value })}
                  className={inputClass}
                  autoFocus
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Kategori">
                  <input
                    type="text"
                    value={form.kategori}
                    onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Satuan">
                  <input
                    type="text"
                    placeholder="Tablet, Botol, dll"
                    value={form.satuan}
                    onChange={(e) => setForm({ ...form, satuan: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>
              {modalMode === "add" && (
                <Field label="Stok Awal">
                  <input
                    type="number"
                    value={form.stok}
                    onChange={(e) => setForm({ ...form, stok: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Harga Beli">
                  <input
                    type="number"
                    value={form.harga_beli}
                    onChange={(e) => setForm({ ...form, harga_beli: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Harga Jual">
                  <input
                    type="number"
                    value={form.harga_jual}
                    onChange={(e) => setForm({ ...form, harga_jual: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Stok Minimum">
                <input
                  type="number"
                  value={form.stok_minimum}
                  onChange={(e) => setForm({ ...form, stok_minimum: e.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>
            <ModalFooter onCancel={() => setIsModalOpen(false)} />
          </form>
        </Modal>
      )}

      {/* Modal Penyesuaian Stok */}
      {stokModalTarget && (
        <Modal title={`Sesuaikan Stok — ${stokModalTarget.nama_obat}`} onClose={() => setStokModalTarget(null)}>
          <form onSubmit={handleStokSubmit}>
            <div className="mb-5">
              <p className="text-xs text-gray-500 mb-3">
                Stok sistem saat ini: <span className="font-semibold text-gray-700">{stokModalTarget.stok}</span>
              </p>
              <Field label="Stok Fisik (hasil hitung nyata)">
                <input
                  type="number"
                  value={stokFisikInput}
                  onChange={(e) => setStokFisikInput(e.target.value)}
                  className={inputClass}
                  autoFocus
                />
              </Field>
              <p className="text-[11px] text-gray-400 mt-1.5">
                Selisih akan otomatis tercatat di riwayat stok opname.
              </p>
            </div>
            <ModalFooter onCancel={() => setStokModalTarget(null)} />
          </form>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// TAB: Resep / Dispensing
// ============================================================

function ResepTab() {
  const [list, setList] = useState<Resep[]>([]);
  const [statusFilter, setStatusFilter] = useState<"" | "menunggu" | "diracik" | "selesai">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [detailTarget, setDetailTarget] = useState<ResepDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchResep = async (status: string) => {
    try {
      const json = await api.get(`/farmasi/resep${status ? `?status=${status}` : ""}`);
      if (!json.success || !Array.isArray(json.data)) throw new Error("Format response tidak sesuai");
      setList(json.data);
      setError(null);
    } catch (err) {
      console.error("Fetch resep error:", err);
      setError(err instanceof Error ? err.message : "Gagal memuat data resep.");
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchResep(statusFilter);
  }, [statusFilter]);

  const openDetail = async (kode_resep: string) => {
    setDetailLoading(true);
    try {
      const json = await api.get(`/farmasi/resep/${kode_resep}`);
      if (!json.success) {
        alert(json.message || "Gagal memuat detail resep");
        return;
      }
      setDetailTarget(json.data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleProses = async (kode_resep: string) => {
    setActionLoading(kode_resep);
    try {
      const json = await api.patch(`/farmasi/resep/${kode_resep}/proses`);
      if (!json.success) {
        alert(json.message || "Gagal memproses resep");
        return;
      }
      await fetchResep(statusFilter);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSelesai = async (kode_resep: string) => {
    if (!confirm("Tandai resep selesai? Stok obat akan otomatis dikurangi sesuai jumlah pada resep.")) return;
    setActionLoading(kode_resep);
    try {
      const json = await api.patch(`/farmasi/resep/${kode_resep}/selesai`);
      if (!json.success) {
        alert(json.message || "Gagal menyelesaikan resep");
        return;
      }
      setDetailTarget(null);
      await fetchResep(statusFilter);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge: Record<Resep["status_dispensing"], string> = {
    menunggu: "bg-amber-50 text-amber-700",
    diracik: "bg-sky-50 text-sky-700",
    selesai: "bg-emerald-50 text-emerald-700",
  };

  if (loading && list.length === 0) return <LoadingBlock text="Memuat data resep…" />;
  if (error) return <ErrorBlock error={error} onRetry={() => { setLoading(true); fetchResep(statusFilter); }} />;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {(["", "menunggu", "diracik", "selesai"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              statusFilter === s ? "bg-emerald-600 text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            {s === "" ? "Semua" : s === "menunggu" ? "Menunggu" : s === "diracik" ? "Diracik" : "Selesai"}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyBlock text="Belum ada resep untuk status ini." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Kode Resep</th>
                <th className="px-4 py-3">Pasien</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((item) => (
                <tr key={item.kode_resep} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-500">{item.kode_resep}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{item.nama_pasien || "-"}</p>
                    <p className="text-xs text-gray-400">{item.no_rm || "-"}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.tanggal_resep || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge[item.status_dispensing]}`}>
                      {item.status_dispensing}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openDetail(item.kode_resep)}
                        className="text-emerald-600 hover:text-emerald-700 text-xs font-semibold"
                      >
                        Lihat Detail
                      </button>
                      {item.status_dispensing === "menunggu" && (
                        <button
                          onClick={() => handleProses(item.kode_resep)}
                          disabled={actionLoading === item.kode_resep}
                          className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                        >
                          {actionLoading === item.kode_resep ? "…" : "Proses"}
                        </button>
                      )}
                      {item.status_dispensing === "diracik" && (
                        <button
                          onClick={() => handleSelesai(item.kode_resep)}
                          disabled={actionLoading === item.kode_resep}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                        >
                          {actionLoading === item.kode_resep ? "…" : "Selesaikan"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(detailTarget || detailLoading) && (
        <Modal title={`Detail Resep${detailTarget ? ` — ${detailTarget.kode_resep}` : ""}`} onClose={() => setDetailTarget(null)} wide>
          {detailLoading && !detailTarget ? (
            <p className="text-sm text-gray-500 py-6 text-center">Memuat…</p>
          ) : detailTarget ? (
            <div>
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Pasien</p>
                  <p className="font-medium text-gray-900">{detailTarget.nama_pasien || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">No. RM</p>
                  <p className="font-medium text-gray-900">{detailTarget.no_rm || "-"}</p>
                </div>
              </div>
              {detailTarget.catatan && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded-md p-2.5 mb-4">
                  Catatan dokter: {detailTarget.catatan}
                </p>
              )}
              <div className="rounded-lg border border-gray-200 overflow-hidden mb-5">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Obat</th>
                      <th className="px-3 py-2">Dosis</th>
                      <th className="px-3 py-2 text-right">Jumlah</th>
                      <th className="px-3 py-2">Aturan Pakai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {detailTarget.detail.map((d) => (
                      <tr key={d.id}>
                        <td className="px-3 py-2 font-medium text-gray-900">{d.nama_obat}</td>
                        <td className="px-3 py-2 text-gray-500">{d.dosis}</td>
                        <td className="px-3 py-2 text-right text-gray-700">
                          {d.jumlah} {d.satuan}
                          {d.stok < d.jumlah && (
                            <span className="ml-1.5 text-rose-500 text-xs">(stok {d.stok})</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-500">{d.aturan_pakai}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => setDetailTarget(null)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Tutup
                </button>
                {detailTarget.status_dispensing === "menunggu" && (
                  <button
                    onClick={() => handleProses(detailTarget.kode_resep)}
                    className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 transition-colors shadow-sm"
                  >
                    Proses Resep
                  </button>
                )}
                {detailTarget.status_dispensing === "diracik" && (
                  <button
                    onClick={() => handleSelesai(detailTarget.kode_resep)}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    Selesaikan & Kurangi Stok
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// TAB: Purchase Order
// ============================================================

function PoTab() {
  const [list, setList] = useState<PO[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [obatOptions, setObatOptions] = useState<Obat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [kodeSupplier, setKodeSupplier] = useState("");
  const [items, setItems] = useState([{ kode_obat: "", qty: "", harga_satuan: "" }]);

  const fetchAll = async () => {
    try {
      const [poJson, supplierJson, obatJson] = await Promise.all([
        api.get("/farmasi/po"),
        api.get("/farmasi/supplier"),
        api.get("/farmasi/obat"),
      ]);
      if (!poJson.success) throw new Error(poJson.message || "Format response tidak sesuai");
      setList(poJson.data || []);
      setSuppliers(supplierJson.data || []);
      setObatOptions(obatJson.data || []);
      setError(null);
    } catch (err) {
      console.error("Fetch PO error:", err);
      setError(err instanceof Error ? err.message : "Gagal memuat data purchase order.");
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openAdd = () => {
    setKodeSupplier("");
    setItems([{ kode_obat: "", qty: "", harga_satuan: "" }]);
    setIsModalOpen(true);
  };

  const addItemRow = () => setItems([...items, { kode_obat: "", qty: "", harga_satuan: "" }]);
  const removeItemRow = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItemRow = (idx: number, field: string, value: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: value };
    setItems(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kodeSupplier) {
      alert("Pilih supplier terlebih dahulu");
      return;
    }
    const cleanItems = items.filter((it) => it.kode_obat && it.qty);
    if (cleanItems.length === 0) {
      alert("Minimal 1 item obat wajib diisi");
      return;
    }

    setLoading(true);
    setIsModalOpen(false);
    try {
      const json = await api.post("/farmasi/po", {
        kode_supplier: kodeSupplier,
        items: cleanItems.map((it) => ({
          kode_obat: it.kode_obat,
          qty: Number(it.qty),
          harga_satuan: it.harga_satuan || null,
        })),
      });
      if (!json.success) alert(json.message || "Gagal membuat purchase order");
      await fetchAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleKirim = async (kode_po: string) => {
    setActionLoading(kode_po);
    try {
      const json = await api.patch(`/farmasi/po/${kode_po}/kirim`);
      if (!json.success) alert(json.message || "Gagal mengirim PO");
      await fetchAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setActionLoading(null);
    }
  };

  const handleTerima = async (kode_po: string) => {
    if (!confirm("Konfirmasi barang sudah diterima? Stok obat akan otomatis bertambah.")) return;
    setActionLoading(kode_po);
    try {
      const json = await api.patch(`/farmasi/po/${kode_po}/terima`);
      if (!json.success) alert(json.message || "Gagal konfirmasi penerimaan");
      await fetchAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatal = async (kode_po: string) => {
    if (!confirm("Batalkan purchase order ini?")) return;
    setActionLoading(kode_po);
    try {
      const json = await api.patch(`/farmasi/po/${kode_po}/batal`);
      if (!json.success) alert(json.message || "Gagal membatalkan PO");
      await fetchAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (kode_po: string) => {
    if (!confirm("Hapus purchase order draft ini?")) return;
    setActionLoading(kode_po);
    try {
      const json = await api.delete(`/farmasi/po/${kode_po}`);
      if (!json.success) alert(json.message || "Gagal menghapus PO");
      await fetchAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge: Record<PO["status"], string> = {
    draft: "bg-gray-100 text-gray-600",
    dikirim: "bg-sky-50 text-sky-700",
    diterima: "bg-emerald-50 text-emerald-700",
    batal: "bg-rose-50 text-rose-600",
  };

  if (loading && list.length === 0) return <LoadingBlock text="Memuat data purchase order…" />;
  if (error) return <ErrorBlock error={error} onRetry={() => { setLoading(true); fetchAll(); }} />;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-all shadow-sm active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Buat Purchase Order
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyBlock text="Belum ada purchase order." onAdd={openAdd} addLabel="Buat PO Pertama" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Kode PO</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((item) => (
                <tr key={item.kode_po} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-500">{item.kode_po}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.nama_supplier || "-"}</td>
                  <td className="px-4 py-3 text-gray-500">{item.tanggal_po}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge[item.status]}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {item.status === "draft" && (
                        <>
                          <button
                            onClick={() => handleKirim(item.kode_po)}
                            disabled={actionLoading === item.kode_po}
                            className="inline-flex items-center gap-1 bg-sky-600 hover:bg-sky-700 text-white px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                          >
                            <Send className="h-3 w-3" />
                            Kirim
                          </button>
                          <button
                            onClick={() => handleDelete(item.kode_po)}
                            disabled={actionLoading === item.kode_po}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-50"
                            title="Hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {item.status === "dikirim" && (
                        <>
                          <button
                            onClick={() => handleTerima(item.kode_po)}
                            disabled={actionLoading === item.kode_po}
                            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                          >
                            <PackageCheck className="h-3 w-3" />
                            Terima
                          </button>
                          <button
                            onClick={() => handleBatal(item.kode_po)}
                            disabled={actionLoading === item.kode_po}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-50"
                            title="Batalkan"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {item.status === "diterima" && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Selesai
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <Modal title="Buat Purchase Order" onClose={() => setIsModalOpen(false)} wide>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <Field label="Supplier">
                <select
                  value={kodeSupplier}
                  onChange={(e) => setKodeSupplier(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Pilih supplier…</option>
                  {suppliers.map((s) => (
                    <option key={s.kode_supplier} value={s.kode_supplier}>
                      {s.nama_supplier}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <p className="block text-xs font-bold uppercase text-gray-400 mb-2">Item Obat</p>
            <div className="space-y-2 mb-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={item.kode_obat}
                    onChange={(e) => updateItemRow(idx, "kode_obat", e.target.value)}
                    className={`${inputClass} flex-[2]`}
                  >
                    <option value="">Pilih obat…</option>
                    {obatOptions.map((o) => (
                      <option key={o.kode_obat} value={o.kode_obat}>
                        {o.nama_obat}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.qty}
                    onChange={(e) => updateItemRow(idx, "qty", e.target.value)}
                    className={`${inputClass} flex-1`}
                  />
                  <input
                    type="number"
                    placeholder="Harga satuan"
                    value={item.harga_satuan}
                    onChange={(e) => updateItemRow(idx, "harga_satuan", e.target.value)}
                    className={`${inputClass} flex-1`}
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItemRow}
              className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-xs font-semibold mb-5"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah item
            </button>

            <ModalFooter onCancel={() => setIsModalOpen(false)} submitLabel="Buat PO" />
          </form>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// Shared UI helpers
// ============================================================

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 focus:outline-none transition-all";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div
        className={`w-full ${wide ? "max-w-lg" : "max-w-sm"} rounded-xl bg-white p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ onCancel, submitLabel = "Simpan" }: { onCancel: () => void; submitLabel?: string }) {
  return (
    <div className="flex justify-end gap-2.5">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
      >
        Batal
      </button>
      <button
        type="submit"
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
      >
        {submitLabel}
      </button>
    </div>
  );
}

function LoadingBlock({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-gray-500 py-20">
      <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-emerald-600 animate-spin" />
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}

function ErrorBlock({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="max-w-sm mx-auto rounded-lg border border-red-200 bg-red-50 p-5 mt-10">
      <p className="text-sm font-semibold text-red-700 mb-1">Data tidak bisa dimuat</p>
      <p className="text-sm text-red-600 mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="w-full bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
      >
        Coba lagi
      </button>
    </div>
  );
}

function EmptyBlock({ text, onAdd, addLabel }: { text: string; onAdd?: () => void; addLabel?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white py-16 text-center">
      <p className="text-sm text-gray-500">{text}</p>
      {onAdd && (
        <button
          onClick={onAdd}
          className="mt-3 inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" /> {addLabel}
        </button>
      )}
    </div>
  );
}