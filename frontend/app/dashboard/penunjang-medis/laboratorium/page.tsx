"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, X, FlaskConical, ClipboardCheck } from "lucide-react";

type Permintaan = {
  kode_permintaan: string;
  kode_kunjungan: string | null;
  jenis_pemeriksaan: string | null;
  tanggal_permintaan: string | null;
  status: "menunggu" | "diproses" | "selesai";
  nama_pasien: string | null;
  no_rm: string | null;
};

type HasilRow = {
  id: string;
  parameter: string;
  hasil: string;
  nilai_rujukan: string | null;
  satuan: string | null;
};

type PermintaanDetail = Permintaan & {
  jenis_kelamin: "L" | "P" | null;
  tanggal_lahir: string | null;
  hasil: HasilRow[];
};

export default function LaboratoriumPage() {
  const [list, setList] = useState<Permintaan[]>([]);
  const [statusFilter, setStatusFilter] = useState<"" | "menunggu" | "diproses" | "selesai">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [detailTarget, setDetailTarget] = useState<PermintaanDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form input hasil (dipakai saat status diproses)
  const [hasilForm, setHasilForm] = useState<{ parameter: string; hasil: string; nilai_rujukan: string; satuan: string }[]>([
    { parameter: "", hasil: "", nilai_rujukan: "", satuan: "" },
  ]);
  const [emailPetugas, setEmailPetugas] = useState("");

  const fetchPermintaan = async (status: string) => {
    try {
      const json = await api.get(`/laboratorium/permintaan${status ? `?status=${status}` : ""}`);
      if (!json.success || !Array.isArray(json.data)) throw new Error("Format response tidak sesuai");
      setList(json.data);
      setError(null);
    } catch (err) {
      console.error("Fetch permintaan lab error:", err);
      setError(err instanceof Error ? err.message : "Gagal memuat data permintaan lab.");
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchPermintaan(statusFilter);
  }, [statusFilter]);

  const openDetail = async (kode_permintaan: string) => {
    setDetailLoading(true);
    try {
      const json = await api.get(`/laboratorium/permintaan/${kode_permintaan}`);
      if (!json.success) {
        alert(json.message || "Gagal memuat detail permintaan");
        return;
      }
      setDetailTarget(json.data);
      setEmailPetugas("");
      setHasilForm(
        json.data.hasil && json.data.hasil.length > 0
          ? json.data.hasil.map((h: HasilRow) => ({
              parameter: h.parameter,
              hasil: h.hasil,
              nilai_rujukan: h.nilai_rujukan || "",
              satuan: h.satuan || "",
            }))
          : [{ parameter: "", hasil: "", nilai_rujukan: "", satuan: "" }]
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleProses = async (kode_permintaan: string) => {
    setActionLoading(kode_permintaan);
    try {
      const json = await api.patch(`/laboratorium/permintaan/${kode_permintaan}/proses`);
      if (!json.success) {
        alert(json.message || "Gagal memproses permintaan");
        return;
      }
      await fetchPermintaan(statusFilter);
      if (detailTarget?.kode_permintaan === kode_permintaan) {
        openDetail(kode_permintaan);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setActionLoading(null);
    }
  };

  const addHasilRow = () => setHasilForm([...hasilForm, { parameter: "", hasil: "", nilai_rujukan: "", satuan: "" }]);
  const removeHasilRow = (idx: number) => setHasilForm(hasilForm.filter((_, i) => i !== idx));
  const updateHasilRow = (idx: number, field: string, value: string) => {
    const next = [...hasilForm];
    next[idx] = { ...next[idx], [field]: value };
    setHasilForm(next);
  };

  const handleSimpanHasil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailTarget) return;

    const cleanHasil = hasilForm.filter((h) => h.parameter.trim() && h.hasil.trim());
    if (cleanHasil.length === 0) {
      alert("Minimal 1 parameter hasil wajib diisi");
      return;
    }

    setActionLoading(detailTarget.kode_permintaan);
    try {
      const json = await api.post(`/laboratorium/permintaan/${detailTarget.kode_permintaan}/hasil`, {
        email_petugas_lab: emailPetugas || null,
        hasil: cleanHasil,
      });
      if (!json.success) {
        alert(json.message || "Gagal menyimpan hasil");
        return;
      }
      setDetailTarget(null);
      await fetchPermintaan(statusFilter);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge: Record<Permintaan["status"], string> = {
    menunggu: "bg-amber-50 text-amber-700",
    diproses: "bg-sky-50 text-sky-700",
    selesai: "bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 pb-5 border-b border-gray-200">
          <p className="text-xs font-semibold uppercase text-emerald-600 mb-1">Penunjang Medis</p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Laboratorium</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola permintaan pemeriksaan lab dari dokter dan input hasilnya.
          </p>
        </div>

        <div className="flex items-center gap-2 mb-5">
          {(["", "menunggu", "diproses", "selesai"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                statusFilter === s ? "bg-emerald-600 text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {s === "" ? "Semua" : s === "menunggu" ? "Menunggu" : s === "diproses" ? "Diproses" : "Selesai"}
            </button>
          ))}
        </div>

        {loading && list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-gray-500 py-20">
            <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-emerald-600 animate-spin" />
            <p className="text-sm font-medium">Memuat data permintaan lab…</p>
          </div>
        ) : error ? (
          <div className="max-w-sm mx-auto rounded-lg border border-red-200 bg-red-50 p-5 mt-10">
            <p className="text-sm font-semibold text-red-700 mb-1">Data tidak bisa dimuat</p>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setLoading(true);
                fetchPermintaan(statusFilter);
              }}
              className="w-full bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Coba lagi
            </button>
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white py-16 text-center">
            <p className="text-sm text-gray-500">Belum ada permintaan pemeriksaan lab untuk status ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Kode Permintaan</th>
                  <th className="px-4 py-3">Pasien</th>
                  <th className="px-4 py-3">Jenis Pemeriksaan</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.map((item) => (
                  <tr key={item.kode_permintaan} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-500">{item.kode_permintaan}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.nama_pasien || "-"}</p>
                      <p className="text-xs text-gray-400">{item.no_rm || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.jenis_pemeriksaan || "-"}</td>
                    <td className="px-4 py-3 text-gray-500">{item.tanggal_permintaan || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge[item.status]}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {item.status === "menunggu" && (
                          <button
                            onClick={() => handleProses(item.kode_permintaan)}
                            disabled={actionLoading === item.kode_permintaan}
                            className="inline-flex items-center gap-1 bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                          >
                            <FlaskConical className="h-3.5 w-3.5" />
                            {actionLoading === item.kode_permintaan ? "…" : "Proses"}
                          </button>
                        )}
                        {item.status === "diproses" && (
                          <button
                            onClick={() => openDetail(item.kode_permintaan)}
                            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-all active:scale-95"
                          >
                            <ClipboardCheck className="h-3.5 w-3.5" />
                            Input Hasil
                          </button>
                        )}
                        {item.status === "selesai" && (
                          <button
                            onClick={() => openDetail(item.kode_permintaan)}
                            className="text-emerald-600 hover:text-emerald-700 text-xs font-semibold"
                          >
                            Lihat Hasil
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
      </div>

      {/* Modal Detail / Input Hasil */}
      {(detailTarget || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {detailTarget?.status === "selesai" ? "Hasil Pemeriksaan" : "Input Hasil Pemeriksaan"}
                {detailTarget ? ` — ${detailTarget.kode_permintaan}` : ""}
              </h3>
              <button
                onClick={() => setDetailTarget(null)}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

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
                    <p className="text-xs text-gray-400">Jenis Pemeriksaan</p>
                    <p className="font-medium text-gray-900">{detailTarget.jenis_pemeriksaan || "-"}</p>
                  </div>
                </div>

                {detailTarget.status === "selesai" ? (
                  <div className="rounded-lg border border-gray-200 overflow-hidden mb-2">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                        <tr>
                          <th className="px-3 py-2">Parameter</th>
                          <th className="px-3 py-2">Hasil</th>
                          <th className="px-3 py-2">Nilai Rujukan</th>
                          <th className="px-3 py-2">Satuan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {detailTarget.hasil.map((h) => (
                          <tr key={h.id}>
                            <td className="px-3 py-2 font-medium text-gray-900">{h.parameter}</td>
                            <td className="px-3 py-2 text-gray-700">{h.hasil}</td>
                            <td className="px-3 py-2 text-gray-500">{h.nilai_rujukan || "-"}</td>
                            <td className="px-3 py-2 text-gray-500">{h.satuan || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <form onSubmit={handleSimpanHasil}>
                    <p className="block text-xs font-bold uppercase text-gray-400 mb-2">Parameter Hasil</p>
                    <div className="space-y-2 mb-2">
                      {hasilForm.map((row, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Parameter"
                            value={row.parameter}
                            onChange={(e) => updateHasilRow(idx, "parameter", e.target.value)}
                            className={`${inputClass} flex-[1.2]`}
                          />
                          <input
                            type="text"
                            placeholder="Hasil"
                            value={row.hasil}
                            onChange={(e) => updateHasilRow(idx, "hasil", e.target.value)}
                            className={`${inputClass} flex-1`}
                          />
                          <input
                            type="text"
                            placeholder="Nilai rujukan"
                            value={row.nilai_rujukan}
                            onChange={(e) => updateHasilRow(idx, "nilai_rujukan", e.target.value)}
                            className={`${inputClass} flex-1`}
                          />
                          <input
                            type="text"
                            placeholder="Satuan"
                            value={row.satuan}
                            onChange={(e) => updateHasilRow(idx, "satuan", e.target.value)}
                            className={`${inputClass} w-20 shrink-0`}
                          />
                          {hasilForm.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeHasilRow(idx)}
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
                      onClick={addHasilRow}
                      className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-xs font-semibold mb-4"
                    >
                      <Plus className="h-3.5 w-3.5" /> Tambah parameter
                    </button>

                    <div className="mb-5">
                      <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">
                        Email Petugas Lab
                      </label>
                      <input
                        type="email"
                        placeholder="petugas@klinik.com"
                        value={emailPetugas}
                        onChange={(e) => setEmailPetugas(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div className="flex justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setDetailTarget(null)}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading === detailTarget.kode_permintaan}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                      >
                        {actionLoading === detailTarget.kode_permintaan ? "Menyimpan…" : "Simpan Hasil"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 focus:outline-none transition-all";
