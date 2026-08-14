"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  Search,
  FileText,
  Activity,
  User,
  Phone,
  Droplet,
  Calendar,
  Stethoscope,
  HeartPulse,
  Thermometer,
  Wind,
  Weight,
  Ruler,
  ClipboardList,
  Loader2,
} from "lucide-react";

type PasienSearchResult = {
  no_rm: string;
  nik: string;
  nama_pasien: string;
  tanggal_lahir: string | null;
  jenis_kelamin: string | null;
  no_hp: string | null;
};

type Pasien = PasienSearchResult & {
  golongan_darah: string | null;
  agama: string | null;
  detail_alamat: string;
};

type RiwayatItem = {
  kode_kunjungan: string;
  tanggal_kunjungan: string;
  jam_masuk: string | null;
  jam_selesai: string | null;
  keluhan_awal: string | null;
  status_kunjungan: "menunggu" | "diperiksa" | "selesai" | "batal";
  nama_poli: string | null;
  nama_dokter: string | null;
  subjektif: string | null;
  objektif: string | null;
  assessment: string | null;
  plan: string | null;
  icd10_code: string | null;
  icd10_deskripsi: string | null;
  tekanan_darah: string | null;
  suhu: string | null;
  nadi: number | null;
  respirasi: number | null;
  berat_badan: string | null;
  tinggi_badan: string | null;
};

const statusStyle: Record<string, string> = {
  menunggu: "bg-gray-100 text-gray-600",
  diperiksa: "bg-amber-100 text-amber-800",
  selesai: "bg-emerald-100 text-emerald-800",
  batal: "bg-rose-100 text-rose-700",
};

export default function RekamMedisPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PasienSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [pasien, setPasien] = useState<Pasien | null>(null);
  const [riwayat, setRiwayat] = useState<RiwayatItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [expanded, setExpanded] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived value: dropdown otomatis kosong saat query terlalu pendek,
  // tanpa perlu memanggil setState di dalam effect.
  const displayResults = query.trim().length < 2 ? [] : results;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const json = await api.get(`/pelayanan-medis/rekam-medis/search?q=${encodeURIComponent(query)}`);
        if (json.success && Array.isArray(json.data)) {
          setResults(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const openPasien = async (no_rm: string) => {
    setDetailLoading(true);
    setResults([]);
    setQuery("");
    try {
      const json = await api.get(`/pelayanan-medis/rekam-medis/${no_rm}`);
      if (json.success) {
        setPasien(json.data.pasien);
        setRiwayat(json.data.riwayat);
      } else {
        alert(json.message || "Gagal memuat rekam medis");
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setDetailLoading(false);
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
    return `${age} tahun`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 rounded-3xl p-6 md:p-8 text-white shadow-xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase border border-white/10">
              <Activity className="h-3.5 w-3.5 animate-pulse text-emerald-300" />
              Pelayanan Medis
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Rekam Medis Pasien</h1>
            <p className="text-emerald-100/90 text-sm md:text-base max-w-xl font-medium">
              Cari pasien berdasarkan No. RM, NIK, atau nama untuk melihat riwayat kunjungan dan hasil pemeriksaan.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm flex items-center px-4 py-3 gap-3">
            <Search className="h-4.5 w-4.5 text-gray-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari No. RM, NIK, atau nama pasien…"
              className="w-full text-sm outline-none placeholder:text-gray-400 text-gray-800"
            />
            {searching && <Loader2 className="h-4 w-4 text-emerald-500 animate-spin shrink-0" />}
          </div>

          {displayResults.length > 0 && (
            <div className="absolute z-20 mt-2 w-full bg-white rounded-2xl border border-gray-200/80 shadow-xl overflow-hidden">
              {displayResults.map((r) => (
                <button
                  key={r.no_rm}
                  onClick={() => openPasien(r.no_rm)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50/50 transition-colors text-left border-b border-gray-50 last:border-0"
                >
                  <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{r.nama_pasien}</p>
                    <p className="text-[11px] text-gray-400 font-mono">RM: {r.no_rm} · NIK: {r.nik}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {detailLoading && (
          <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
            <div className="h-6 w-6 rounded-full border-2 border-emerald-100 border-t-emerald-600 animate-spin" />
            <span className="text-xs font-medium">Memuat rekam medis…</span>
          </div>
        )}

        {!detailLoading && !pasien && (
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm py-20 text-center">
            <div className="inline-flex items-center justify-center p-4 bg-gray-50 text-gray-400 rounded-full mb-3">
              <FileText className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-bold text-gray-500">Belum ada pasien dipilih</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              Gunakan kolom pencarian di atas untuk menemukan data pasien.
            </p>
          </div>
        )}

        {!detailLoading && pasien && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Patient Bio */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-6 space-y-4 sticky top-6">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <User className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{pasien.nama_pasien}</h3>
                    <p className="text-xs text-gray-400 font-mono">No. RM: {pasien.no_rm}</p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-gray-100 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Usia</span>
                    <span className="font-semibold text-gray-700">{calcAge(pasien.tanggal_lahir)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Jenis Kelamin</span>
                    <span className="font-semibold text-gray-700">
                      {pasien.jenis_kelamin === "L" ? "Laki-laki" : pasien.jenis_kelamin === "P" ? "Perempuan" : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-1.5"><Droplet className="h-3.5 w-3.5" /> Gol. Darah</span>
                    <span className="font-semibold text-gray-700">{pasien.golongan_darah || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> No. HP</span>
                    <span className="font-semibold text-gray-700">{pasien.no_hp || "-"}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-[11px] font-bold uppercase text-gray-400 mb-1">Alamat</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{pasien.detail_alamat || "-"}</p>
                </div>
              </div>
            </div>

            {/* Riwayat kunjungan */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
                Riwayat Kunjungan ({riwayat.length})
              </h2>

              {riwayat.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm py-16 text-center">
                  <ClipboardList className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-500">Belum ada riwayat kunjungan</p>
                </div>
              ) : (
                riwayat.map((item) => {
                  const isOpen = expanded === item.kode_kunjungan;
                  return (
                    <div
                      key={item.kode_kunjungan}
                      className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden"
                    >
                      <button
                        onClick={() => setExpanded(isOpen ? null : item.kode_kunjungan)}
                        className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                            <Stethoscope className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">
                              {formatDate(item.tanggal_kunjungan)} · {item.nama_poli || "-"}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {item.nama_dokter ? `dr. ${item.nama_dokter}` : "Dokter belum ditentukan"} · {item.keluhan_awal || "Tanpa keluhan awal tercatat"}
                            </p>
                          </div>
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded-md ${statusStyle[item.status_kunjungan]}`}>
                          {item.status_kunjungan}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-5 pt-1 border-t border-gray-100 space-y-4">
                          {/* Vitals */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3">
                            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                              <HeartPulse className="h-4 w-4 text-rose-500 shrink-0" />
                              <div>
                                <p className="text-[10px] text-gray-400">Tekanan Darah</p>
                                <p className="text-xs font-bold text-gray-700">{item.tekanan_darah || "-"}</p>
                              </div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                              <Thermometer className="h-4 w-4 text-amber-500 shrink-0" />
                              <div>
                                <p className="text-[10px] text-gray-400">Suhu</p>
                                <p className="text-xs font-bold text-gray-700">{item.suhu ? `${item.suhu} °C` : "-"}</p>
                              </div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                              <Activity className="h-4 w-4 text-emerald-500 shrink-0" />
                              <div>
                                <p className="text-[10px] text-gray-400">Nadi</p>
                                <p className="text-xs font-bold text-gray-700">{item.nadi ? `${item.nadi} /mnt` : "-"}</p>
                              </div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                              <Wind className="h-4 w-4 text-sky-500 shrink-0" />
                              <div>
                                <p className="text-[10px] text-gray-400">Respirasi</p>
                                <p className="text-xs font-bold text-gray-700">{item.respirasi ? `${item.respirasi} /mnt` : "-"}</p>
                              </div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                              <Weight className="h-4 w-4 text-violet-500 shrink-0" />
                              <div>
                                <p className="text-[10px] text-gray-400">Berat Badan</p>
                                <p className="text-xs font-bold text-gray-700">{item.berat_badan ? `${item.berat_badan} kg` : "-"}</p>
                              </div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                              <Ruler className="h-4 w-4 text-teal-500 shrink-0" />
                              <div>
                                <p className="text-[10px] text-gray-400">Tinggi Badan</p>
                                <p className="text-xs font-bold text-gray-700">{item.tinggi_badan ? `${item.tinggi_badan} cm` : "-"}</p>
                              </div>
                            </div>
                          </div>

                          {/* SOAP */}
                          <div className="space-y-2.5 text-sm">
                            <div>
                              <p className="text-[11px] font-bold uppercase text-gray-400">Subjektif</p>
                              <p className="text-gray-700">{item.subjektif || "-"}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold uppercase text-gray-400">Objektif</p>
                              <p className="text-gray-700">{item.objektif || "-"}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold uppercase text-gray-400">Assessment</p>
                              <p className="text-gray-700">
                                {item.assessment || "-"}
                                {item.icd10_code && (
                                  <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-mono">
                                    {item.icd10_code} {item.icd10_deskripsi ? `· ${item.icd10_deskripsi}` : ""}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold uppercase text-gray-400">Plan</p>
                              <p className="text-gray-700">{item.plan || "-"}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
