"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  Volume2,
  CheckCircle2,
  Users2,
  RotateCcw,
  Stethoscope,
  Activity,
  User,
  CreditCard,
  Clock,
  ChevronRight,
  UserCheck,
  Pencil,
  Trash2,
  Plus,
  X
} from "lucide-react";

type QueueItem = {
  id: string;
  no_antrian: string;
  no_rm: string;
  kode_poli: string;
  kode_penjamin: string | null;
  tanggal: string;
  status_panggil: "menunggu" | "dipanggil" | "selesai";
  created_at: string;
  nama_pasien: string;
  jenis_kelamin: string | null;
  tanggal_lahir: string | null;
  nama_poli: string;
};

type Poliklinik = {
  id: string;
  kode_poli: string;
  nama_poli: string;
};

export default function AntrianPoliPage() {
  const [polis, setPolis] = useState<Poliklinik[]>([]);
  const [selectedPoli, setSelectedPoli] = useState<string>("");
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [queuesLoading, setQueuesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Poliklinik CRUD state
  const [isPoliModalOpen, setIsPoliModalOpen] = useState(false);
  const [poliModalMode, setPoliModalMode] = useState<"add" | "edit">("add");
  const [kodePoliInput, setKodePoliInput] = useState("");
  const [namaPoliInput, setNamaPoliInput] = useState("");
  const [editTargetPoliKode, setEditTargetPoliKode] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleOpenAddPoliModal = () => {
    setPoliModalMode("add");
    setKodePoliInput("");
    setNamaPoliInput("");
    setEditTargetPoliKode(null);
    setIsPoliModalOpen(true);
  };

  const handleOpenEditPoliModal = (poli: Poliklinik, e: React.MouseEvent) => {
    e.stopPropagation();
    setPoliModalMode("edit");
    setKodePoliInput(poli.kode_poli);
    setNamaPoliInput(poli.nama_poli);
    setEditTargetPoliKode(poli.kode_poli);
    setIsPoliModalOpen(true);
  };

  const handleDeletePoli = async (poli: Poliklinik, e: React.MouseEvent) => {
    e.stopPropagation();
    const konfirmasi = confirm(`Hapus poliklinik ${poli.nama_poli} (${poli.kode_poli})? Tindakan ini permanen.`);
    if (!konfirmasi) return;

    setLoading(true);
    try {
      const json = await api.delete(`/pasien/poli/${poli.kode_poli}`);
      if (json.success) {
        alert(json.message || "Poliklinik berhasil dihapus");
        if (selectedPoli === poli.kode_poli) {
          const remaining = polis.filter((p) => p.kode_poli !== poli.kode_poli);
          if (remaining.length > 0) {
            setSelectedPoli(remaining[0].kode_poli);
          } else {
            setSelectedPoli("");
            setQueues([]);
          }
        }
        await fetchPolis();
      } else {
        alert(json.message || "Gagal menghapus poliklinik");
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handlePoliModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const namaPoliClean = namaPoliInput.trim();
    const kodePoliClean = kodePoliInput.trim().toUpperCase();

    if (!namaPoliClean) {
      alert("Nama poliklinik wajib diisi");
      return;
    }

    setLoading(true);
    setIsPoliModalOpen(false);

    try {
      if (poliModalMode === "add") {
        const json = await api.post("/pasien/poli", {
          kode_poli: kodePoliClean || undefined,
          nama_poli: namaPoliClean,
        });
        if (json.success) {
          alert(json.message || "Poliklinik berhasil ditambahkan");
          await fetchPolis();
          if (json.data && json.data.kode_poli) {
            setSelectedPoli(json.data.kode_poli);
          }
        } else {
          alert(json.message || "Gagal menambahkan poliklinik");
        }
      } else if (poliModalMode === "edit" && editTargetPoliKode) {
        const json = await api.put(`/pasien/poli/${editTargetPoliKode}`, {
          nama_poli: namaPoliClean,
        });
        if (json.success) {
          alert(json.message || "Poliklinik berhasil diperbarui");
          await fetchPolis();
        } else {
          alert(json.message || "Gagal memperbarui poliklinik");
        }
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all clinics
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

  // Fetch queues for selected clinic
  const fetchQueues = async (kodePoli: string) => {
    if (!kodePoli) return;
    setQueuesLoading(true);
    try {
      const json = await api.get(`/antrian-poli?kode_poli=${kodePoli}`);
      if (json.success && Array.isArray(json.data)) {
        setQueues(json.data);
      } else {
        throw new Error("Format response antrean tidak sesuai");
      }
    } catch (err) {
      console.error("Fetch queues error:", err);
    } finally {
      setQueuesLoading(false);
    }
  };

  useEffect(() => {
    fetchPolis();
  }, []);

  useEffect(() => {
    if (selectedPoli) {
      fetchQueues(selectedPoli);
    }
  }, [selectedPoli]);

  // Voice Announcement triggering logic
  const speakAnnouncement = (noAntrian: string, namaPoli: string) => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.onended = () => {
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const text = `Nomor antrian ${noAntrian.split("").join(" ")}, silakan menuju ke ${namaPoli}`;
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = "id-ID";

          const voices = window.speechSynthesis.getVoices();
          const idVoice = voices.find((v) =>
            v.lang.toLowerCase().includes("id")
          );
          if (idVoice) {
            utterance.voice = idVoice;
          }
          window.speechSynthesis.speak(utterance);
        }
      };

      audioRef.current.play().catch((err) => {
        console.error("Audio playback error, falling back to speech:", err);
        // Fallback speak immediately
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const text = `Nomor antrian ${noAntrian.split("").join(" ")}, silakan menuju ke ${namaPoli}`;
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = "id-ID";
          window.speechSynthesis.speak(utterance);
        }
      });
    } else {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const text = `Nomor antrian ${noAntrian.split("").join(" ")}, silakan menuju ke ${namaPoli}`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "id-ID";
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const handlePanggil = async (item: QueueItem) => {
    setActionLoading(item.id);
    speakAnnouncement(item.no_antrian, item.nama_poli);
    try {
      const json = await api.patch(`/antrian-poli/${item.id}/panggil`);
      if (!json.success) {
        alert(json.message || "Gagal memanggil antrean");
        return;
      }
      await fetchQueues(selectedPoli);
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat memanggil antrean");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSelesai = async (item: QueueItem) => {
    setActionLoading(item.id);
    try {
      const json = await api.patch(`/antrian-poli/${item.id}/selesai`);
      if (!json.success) {
        alert(json.message || "Gagal menyelesaikan antrean");
        return;
      }
      await fetchQueues(selectedPoli);
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat memproses antrean selesai");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReset = async () => {
    const konfirmasi = confirm(
      "Reset semua antrean poli hari ini kembali ke status 'menunggu'? Aksi ini tidak dapat dibatalkan."
    );
    if (!konfirmasi) return;

    setQueuesLoading(true);
    try {
      const json = await api.patch("/antrian-poli/reset");
      if (json.success) {
        await fetchQueues(selectedPoli);
      } else {
        alert(json.message || "Gagal mereset antrean");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat mereset antrean");
    } finally {
      setQueuesLoading(false);
    }
  };

  // Grouping queues
  const activeQueues = queues.filter((q) => q.status_panggil !== "selesai");
  const completedQueues = queues.filter((q) => q.status_panggil === "selesai");
  const currentCalling = queues.find((q) => q.status_panggil === "dipanggil");

  // Format date helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return "";
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
      <audio ref={audioRef} src="/sounds/bell.mp3" preload="auto" />

      {/* Screen Reader announcer */}
      <div aria-live="polite" className="sr-only">
        {currentCalling
          ? `Antrean ${currentCalling.no_antrian} sedang dipanggil di ${currentCalling.nama_poli}`
          : ""}
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase border border-white/10">
              <Activity className="h-3.5 w-3.5 animate-pulse text-emerald-300" />
              Sistem Manajemen Antrean
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Antrean Poliklinik</h1>
            <p className="text-emerald-100/90 text-sm md:text-base max-w-xl font-medium">
              Kelola panggilan antrean pasien ke masing-masing poli klinik tujuan. Nyalakan speaker Anda untuk mendengar suara pemanggilan.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/20 active:scale-95 transition-all text-white px-5 py-3 rounded-2xl text-sm font-bold border border-white/10 shadow-inner"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Antrean Hari Ini
            </button>
          </div>
        </div>

        {/* Poli Selector Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Pilih Poliklinik
            </h2>
            <button
              onClick={handleOpenAddPoliModal}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1.5 rounded-xl transition-all active:scale-95 shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Poli
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {polis.map((poli) => {
              const isSelected = selectedPoli === poli.kode_poli;
              return (
                <button
                  key={poli.kode_poli}
                  onClick={() => setSelectedPoli(poli.kode_poli)}
                  className={`relative p-4 rounded-2xl text-left border transition-all duration-200 group/poli ${
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
                          : "bg-gray-50 text-gray-400 group-hover/poli:bg-emerald-50"
                      }`}
                    >
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 font-mono">
                        {poli.kode_poli}
                      </span>
                      {/* Action buttons for Poli CRUD */}
                      <div className="flex items-center gap-1 opacity-0 group-hover/poli:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleOpenEditPoliModal(poli, e)}
                          className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title="Edit Poli"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => handleDeletePoli(poli, e)}
                          className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Hapus Poli"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-bold text-gray-800 line-clamp-1">
                      {poli.nama_poli}
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Poliklinik Rawat Jalan</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Poli detail board */}
        {selectedPoli && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Big Caller & Active list */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Big Caller Screen */}
              <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm overflow-hidden relative">
                <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-0 opacity-40 pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                      Panggilan Aktif Saat Ini
                    </p>
                    {currentCalling ? (
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 leading-tight">
                          {currentCalling.nama_pasien}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                          No. RM: <span className="font-semibold font-mono text-gray-600">{currentCalling.no_rm}</span> · Poli: {currentCalling.nama_poli}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-lg font-bold text-gray-400 leading-tight">
                          Belum ada antrean dipanggil
                        </h3>
                        <p className="text-sm text-gray-400 mt-0.5">
                          Silakan tekan tombol panggil pada pasien di daftar tunggu.
                        </p>
                      </div>
                    )}
                  </div>

                  {currentCalling ? (
                    <div className="flex items-center gap-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 min-w-[200px] justify-center md:justify-start">
                      <div className="font-mono text-5xl font-extrabold text-emerald-600 tracking-tight tabular-nums">
                        {currentCalling.no_antrian}
                      </div>
                      <div className="border-l border-emerald-200 pl-3">
                        <button
                          onClick={() => handlePanggil(currentCalling)}
                          disabled={actionLoading === currentCalling.id}
                          className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                          Panggil Ulang
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="font-mono text-5xl font-extrabold text-gray-200 tracking-tight text-center md:text-left">
                      000
                    </div>
                  )}
                </div>
              </div>

              {/* Waiting Queues (Daftar Tunggu) */}
              <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    <h3 className="text-sm font-bold text-gray-800">
                      Daftar Tunggu Pasien ({activeQueues.length})
                    </h3>
                  </div>
                  <span className="text-xs text-gray-400">
                    Urutan berdasarkan nomor antrean
                  </span>
                </div>

                {queuesLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
                    <div className="h-6 w-6 rounded-full border-2 border-emerald-100 border-t-emerald-600 animate-spin" />
                    <span className="text-xs font-medium">Memperbarui antrean…</span>
                  </div>
                ) : activeQueues.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="inline-flex items-center justify-center p-4 bg-gray-50 text-gray-400 rounded-full mb-3">
                      <Users2 className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-bold text-gray-500">Antrean Kosong</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                      Belum ada pasien yang didaftarkan ke poli ini untuk hari ini.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {activeQueues.map((item) => {
                      const isCalling = item.status_panggil === "dipanggil";
                      const isItemLoading = actionLoading === item.id;
                      
                      return (
                        <div
                          key={item.id}
                          className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 hover:bg-gray-50/50 ${
                            isCalling ? "bg-amber-50/40 ring-1 ring-inset ring-amber-100" : ""
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Queue Number Tag */}
                            <div
                              className={`h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center font-mono text-xl font-black tabular-nums border tracking-wide transition-colors ${
                                isCalling
                                  ? "bg-amber-500 text-white border-amber-600"
                                  : "bg-gray-50 text-gray-800 border-gray-200"
                              }`}
                            >
                              {item.no_antrian}
                            </div>
                            
                            {/* Patient Info */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-gray-900 hover:text-emerald-600 transition-colors">
                                  {item.nama_pasien}
                                </h4>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                    isCalling
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {isCalling ? "Dipanggil" : "Menunggu"}
                                </span>
                              </div>
                              
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 font-medium">
                                <span className="flex items-center gap-1 font-mono">
                                  <User className="h-3.5 w-3.5" />
                                  {item.no_rm}
                                </span>
                                {item.kode_penjamin && (
                                  <span className="flex items-center gap-1 uppercase">
                                    <CreditCard className="h-3.5 w-3.5" />
                                    {item.kode_penjamin}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 font-mono">
                                  <Clock className="h-3.5 w-3.5" />
                                  {formatTime(item.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Controls */}
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              onClick={() => handlePanggil(item)}
                              disabled={isItemLoading}
                              className={`inline-flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                                isCalling
                                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                              }`}
                            >
                              <Volume2 className="h-3.5 w-3.5" />
                              {isCalling ? "Panggil Lagi" : "Panggil"}
                            </button>
                            <button
                              onClick={() => handleSelesai(item)}
                              disabled={isItemLoading}
                              className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 py-2 px-4 rounded-xl text-xs font-bold transition-all active:scale-95"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Selesai
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Completed List (Selesai) */}
            <div className="space-y-6">
              
              <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4.5 w-4.5 text-emerald-600" />
                    <h3 className="text-sm font-bold text-gray-800">
                      Selesai Diperiksa ({completedQueues.length})
                    </h3>
                  </div>
                </div>

                {queuesLoading ? (
                  <div className="py-8 flex items-center justify-center">
                    <div className="h-5 w-5 rounded-full border-2 border-emerald-100 border-t-emerald-600 animate-spin" />
                  </div>
                ) : completedQueues.length === 0 ? (
                  <div className="py-12 text-center text-gray-400">
                    <p className="text-xs font-medium">Belum ada pasien selesai diperiksa hari ini.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                    {completedQueues.map((item) => (
                      <div key={item.id} className="p-4 flex items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-mono text-sm font-black border border-emerald-100">
                            {item.no_antrian}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-gray-800 line-clamp-1">{item.nama_pasien}</h4>
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">RM: {item.no_rm}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md text-[10px] font-bold">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Selesai
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </div>

      {/* Modal CRUD Poliklinik */}
      {isPoliModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200 text-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {poliModalMode === "add" ? "Tambah Poliklinik Baru" : "Edit Nama Poliklinik"}
              </h3>
              <button
                onClick={() => setIsPoliModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePoliModalSubmit}>
              {poliModalMode === "add" && (
                <div className="mb-4">
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">
                    Kode Poli (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: POL06 (Kosongkan untuk auto)"
                    value={kodePoliInput}
                    onChange={(e) => setKodePoliInput(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 focus:outline-none transition-all font-mono uppercase bg-white text-gray-800"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Jika dikosongkan, sistem akan membuat kode POLxx otomatis.
                  </p>
                </div>
              )}

              <div className="mb-5">
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">
                  Nama Poliklinik
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Poli Mata, Poli Saraf"
                  value={namaPoliInput}
                  onChange={(e) => setNamaPoliInput(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 focus:outline-none transition-all bg-white text-gray-800 font-medium"
                  required
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPoliModalOpen(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
