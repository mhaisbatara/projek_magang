"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Stethoscope,
  Activity,
  User,
  Clock,
  ClipboardList,
  HeartPulse,
  Thermometer,
  Wind,
  Ruler,
  Weight,
  X,
  Save,
  Loader2,
  UserCircle2,
} from "lucide-react";

type Poliklinik = {
  id: string;
  kode_poli: string;
  nama_poli: string;
};

type KunjunganItem = {
  id: string;
  kode_kunjungan: string;
  kode_antrian: string | null;
  no_rm: string;
  kode_poli: string;
  no_sip: string | null;
  kode_penjamin: string | null;
  tanggal_kunjungan: string;
  jam_masuk: string | null;
  jam_selesai: string | null;
  keluhan_awal: string | null;
  status_kunjungan: "menunggu" | "diperiksa" | "selesai" | "batal";
  nama_pasien: string;
  jenis_kelamin: string | null;
  tanggal_lahir: string | null;
  nama_poli: string;
  nama_dokter: string | null;
};

type Dokter = {
  id: string;
  no_sip: string;
  nama_dokter: string;
  kode_poli: string | null;
};

const initialForm = {
  no_sip: "",
  subjektif: "",
  objektif: "",
  assessment: "",
  plan: "",
  icd10_code: "",
  icd10_deskripsi: "",
  tekanan_darah: "",
  suhu: "",
  nadi: "",
  respirasi: "",
  berat_badan: "",
  tinggi_badan: "",
};

export default function PemeriksaanDokterPage() {
  const [polis, setPolis] = useState<Poliklinik[]>([]);
  const [selectedPoli, setSelectedPoli] = useState<string>("");
  const [kunjunganList, setKunjunganList] = useState<KunjunganItem[]>([]);
  const [dokterList, setDokterList] = useState<Dokter[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeKunjungan, setActiveKunjungan] = useState<KunjunganItem | null>(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const fetchPolis = async () => {
    try {
      const json = await api.get("/pasien/poli");
      if (json.success && Array.isArray(json.data)) {
        setPolis(json.data);
        if (json.data.length > 0) {
          setSelectedPoli(json.data[0].kode_poli);
        }
      } else {
        throw new Error("Gagal mengambil data poliklinik");
      }
    } catch (err) {
      console.error(err);
      setError("Gagal memuat data poliklinik.");
    } finally {
      setLoading(false);
    }
  };

  const fetchKunjungan = async (kodePoli: string) => {
    if (!kodePoli) return;
    setListLoading(true);
    try {
      const json = await api.get(`/pelayanan-medis/kunjungan?kode_poli=${kodePoli}&status=diperiksa`);
      if (json.success && Array.isArray(json.data)) {
        setKunjunganList(json.data);
      }
    } catch (err) {
      console.error("Fetch kunjungan error:", err);
    } finally {
      setListLoading(false);
    }
  };

  const fetchDokter = async (kodePoli: string) => {
    try {
      const json = await api.get(`/pelayanan-medis/dokter?kode_poli=${kodePoli}`);
      if (json.success && Array.isArray(json.data)) {
        setDokterList(json.data);
      }
    } catch (err) {
      console.error("Fetch dokter error:", err);
    }
  };

  useEffect(() => {
    // Fetch awal saat halaman dibuka. fetchPolis juga dipakai ulang oleh
    // tombol "Coba Lagi", jadi sengaja tidak diinlinekan ke dalam effect ini.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPolis();
  }, []);

  useEffect(() => {
    if (selectedPoli) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchKunjungan(selectedPoli);
      fetchDokter(selectedPoli);
    }
  }, [selectedPoli]);

  const openPeriksaModal = (item: KunjunganItem) => {
    setActiveKunjungan(item);
    setForm({ ...initialForm, no_sip: item.no_sip || "" });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveKunjungan(null);
    setForm(initialForm);
  };

  const handleChange = (field: keyof typeof initialForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeKunjungan) return;

    setSaving(true);
    try {
      const json = await api.post("/pelayanan-medis/pemeriksaan", {
        kode_kunjungan: activeKunjungan.kode_kunjungan,
        ...form,
      });
      if (json.success) {
        closeModal();
        await fetchKunjungan(selectedPoli);
      } else {
        alert(json.message || "Gagal menyimpan hasil pemeriksaan");
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan");
    } finally {
      setSaving(false);
    }
  };

  // "Hari ini" dihitung sekali saat komponen mount (bukan setiap render) agar
  // fungsi render tetap murni sesuai aturan react-hooks/purity.
  const [now] = useState(() => new Date());

  const calcAge = (tanggalLahir: string | null) => {
    if (!tanggalLahir) return "-";
    const dob = new Date(tanggalLahir);
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
      age--;
    }
    return `${age} th`;
  };

  const formatTime = (dateTimeStr: string | null) => {
    if (!dateTimeStr) return "-";
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-emerald-600">
          <div className="h-10 w-10 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin" />
          <p className="text-sm font-semibold tracking-wide">Memuat data poliklinik…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-sm w-full rounded-2xl border border-red-100 bg-white p-6 shadow-xl text-center">
          <p className="text-sm font-semibold text-red-600 mb-2">Error terjadi</p>
          <p className="text-sm text-gray-500 mb-5">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchPolis();
            }}
            className="w-full bg-emerald-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-lg active:scale-95"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase border border-white/10">
              <Activity className="h-3.5 w-3.5 animate-pulse text-emerald-300" />
              Pelayanan Medis
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Pemeriksaan Dokter</h1>
            <p className="text-emerald-100/90 text-sm md:text-base max-w-xl font-medium">
              Daftar pasien yang sudah dipanggil masuk poli dan siap diperiksa. Klik &quot;Mulai Periksa&quot; untuk mengisi catatan SOAP dan tanda vital.
            </p>
          </div>
        </div>

        {/* Poli Selector */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
            Pilih Poliklinik
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {polis.map((poli) => {
              const isSelected = selectedPoli === poli.kode_poli;
              return (
                <button
                  key={poli.kode_poli}
                  onClick={() => setSelectedPoli(poli.kode_poli)}
                  className={`relative p-4 rounded-2xl text-left border transition-all duration-200 ${
                    isSelected
                      ? "bg-white border-emerald-500 shadow-md ring-2 ring-emerald-50"
                      : "bg-white border-gray-200 hover:border-emerald-200 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`p-2.5 rounded-xl transition-colors ${
                        isSelected
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-gray-50 text-gray-400"
                      }`}
                    >
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 font-mono">
                      {poli.kode_poli}
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-bold text-gray-800 line-clamp-1">{poli.nama_poli}</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Poliklinik Rawat Jalan</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Antrean Pasien Siap Diperiksa */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-bold text-gray-800">
                Pasien Siap Diperiksa ({kunjunganList.length})
              </h3>
            </div>
            <span className="text-xs text-gray-400">Diurutkan berdasarkan jam masuk</span>
          </div>

          {listLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
              <div className="h-6 w-6 rounded-full border-2 border-emerald-100 border-t-emerald-600 animate-spin" />
              <span className="text-xs font-medium">Memperbarui daftar…</span>
            </div>
          ) : kunjunganList.length === 0 ? (
            <div className="py-16 text-center">
              <div className="inline-flex items-center justify-center p-4 bg-gray-50 text-gray-400 rounded-full mb-3">
                <ClipboardList className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-bold text-gray-500">Belum Ada Pasien</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                Pasien yang dipanggil masuk poli di halaman Antrian akan otomatis muncul di sini.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {kunjunganList.map((item) => (
                <div
                  key={item.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-all duration-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 shrink-0 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                      <UserCircle2 className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900">{item.nama_pasien}</h4>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                          Diperiksa
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 font-medium">
                        <span className="flex items-center gap-1 font-mono">
                          <User className="h-3.5 w-3.5" />
                          {item.no_rm}
                        </span>
                        <span>{item.jenis_kelamin === "L" ? "Laki-laki" : item.jenis_kelamin === "P" ? "Perempuan" : "-"} · {calcAge(item.tanggal_lahir)}</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTime(item.jam_masuk)}
                        </span>
                        {item.nama_dokter && <span>Dokter: {item.nama_dokter}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => openPeriksaModal(item)}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all text-white py-2 px-4 rounded-xl text-xs font-bold shadow-sm"
                    >
                      <Stethoscope className="h-3.5 w-3.5" />
                      Mulai Periksa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Form Pemeriksaan */}
      {isModalOpen && activeKunjungan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200 text-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Form Pemeriksaan Dokter</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {activeKunjungan.nama_pasien} · RM {activeKunjungan.no_rm} · {activeKunjungan.nama_poli}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Dokter pemeriksa */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">
                  Dokter Pemeriksa
                </label>
                <select
                  value={form.no_sip}
                  onChange={(e) => handleChange("no_sip", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 focus:outline-none transition-all bg-white text-gray-800"
                >
                  <option value="">Pilih Dokter</option>
                  {dokterList.map((d) => (
                    <option key={d.no_sip} value={d.no_sip}>
                      {d.nama_dokter}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vital sign */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">
                  Tanda Vital
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="flex items-center gap-1 text-[11px] text-gray-400 mb-1">
                      <HeartPulse className="h-3 w-3" /> Tekanan Darah
                    </label>
                    <input
                      type="text"
                      placeholder="120/80"
                      value={form.tekanan_darah}
                      onChange={(e) => handleChange("tekanan_darah", e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-[11px] text-gray-400 mb-1">
                      <Thermometer className="h-3 w-3" /> Suhu (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="36.5"
                      value={form.suhu}
                      onChange={(e) => handleChange("suhu", e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-[11px] text-gray-400 mb-1">
                      <Activity className="h-3 w-3" /> Nadi (/mnt)
                    </label>
                    <input
                      type="number"
                      placeholder="80"
                      value={form.nadi}
                      onChange={(e) => handleChange("nadi", e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-[11px] text-gray-400 mb-1">
                      <Wind className="h-3 w-3" /> Respirasi (/mnt)
                    </label>
                    <input
                      type="number"
                      placeholder="20"
                      value={form.respirasi}
                      onChange={(e) => handleChange("respirasi", e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-[11px] text-gray-400 mb-1">
                      <Weight className="h-3 w-3" /> Berat (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="60"
                      value={form.berat_badan}
                      onChange={(e) => handleChange("berat_badan", e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-[11px] text-gray-400 mb-1">
                      <Ruler className="h-3 w-3" /> Tinggi (cm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="165"
                      value={form.tinggi_badan}
                      onChange={(e) => handleChange("tinggi_badan", e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 focus:outline-none bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* SOAP */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase text-gray-400">
                  Catatan Pemeriksaan (SOAP)
                </label>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Subjektif (Keluhan Pasien)</label>
                  <textarea
                    rows={2}
                    value={form.subjektif}
                    onChange={(e) => handleChange("subjektif", e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 focus:outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Objektif (Hasil Pemeriksaan Fisik)</label>
                  <textarea
                    rows={2}
                    value={form.objektif}
                    onChange={(e) => handleChange("objektif", e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 focus:outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Assessment (Diagnosis)</label>
                  <textarea
                    rows={2}
                    value={form.assessment}
                    onChange={(e) => handleChange("assessment", e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 focus:outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Plan (Rencana Tindakan / Terapi)</label>
                  <textarea
                    rows={2}
                    value={form.plan}
                    onChange={(e) => handleChange("plan", e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 focus:outline-none bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Kode ICD-10</label>
                    <input
                      type="text"
                      placeholder="J06.9"
                      value={form.icd10_code}
                      onChange={(e) => handleChange("icd10_code", e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 focus:outline-none bg-white font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Deskripsi ICD-10</label>
                    <input
                      type="text"
                      placeholder="ISPA"
                      value={form.icd10_deskripsi}
                      onChange={(e) => handleChange("icd10_deskripsi", e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 focus:outline-none bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Simpan & Selesaikan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
