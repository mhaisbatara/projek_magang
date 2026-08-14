"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Pencil, Trash2, Plus, X, Volume2, RotateCcw, CheckCircle2 } from "lucide-react";

type Antrian = {
  kode_antrian: string;
  no_antrian: string;
  status: "tersedia" | "terpakai" | "dipanggil" | "selesai";
};

export default function AntrianAwalPage() {
  const [antrianList, setAntrianList] = useState<Antrian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal CRUD state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [noAntrianInput, setNoAntrianInput] = useState("");
  const [editTargetKode, setEditTargetKode] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchAntrian = async () => {
    try {
      const json = await api.get("/antrian-awal");

      if (!json.success || !Array.isArray(json.data)) {
        throw new Error("Format response tidak sesuai");
      }

      setAntrianList(json.data);
      setError(null);
    } catch (err) {
      console.error("Fetch antrian error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat data antrian. Pastikan backend sudah jalan."
      );
      setAntrianList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAntrian();
  }, []);

  const handleAmbil = async (kode: string) => {
    setActionLoading(kode);
    try {
      const json = await api.patch(`/antrian-awal/${kode}/ambil`);
      if (!json.success) {
        alert(json.message || "Gagal mengambil antrian");
        return;
      }
      await fetchAntrian();
    } catch (err) {
      console.error("Ambil antrian error:", err);
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePanggil = async (kode: string, noAntrian: string) => {
    setActionLoading(kode);

    // Bypassing browser autoplay restrictions by triggering the play immediately on user gesture
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.onended = () => {
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(
            `Nomor antrian ${noAntrian}, silakan menuju ke loket pendaftaran`
          );
          utterance.lang = "id-ID";

          // Find Indonesian voice if available
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
        // Fallback: speak immediately
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(
            `Nomor antrian ${noAntrian}, silakan menuju ke loket pendaftaran`
          );
          utterance.lang = "id-ID";
          window.speechSynthesis.speak(utterance);
        }
      });
    } else {
      // Fallback: speak immediately
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(
          `Nomor antrian ${noAntrian}, silakan menuju ke loket pendaftaran`
        );
        utterance.lang = "id-ID";
        window.speechSynthesis.speak(utterance);
      }
    }

    try {
      const json = await api.patch(`/antrian-awal/${kode}/panggil`);
      if (!json.success) {
        alert(json.message || "Gagal memanggil antrian");
        return;
      }
      await fetchAntrian();
    } catch (err) {
      console.error("Panggil antrian error:", err);
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSelesai = async (kode: string) => {
    setActionLoading(kode);
    try {
      const json = await api.patch(`/antrian-awal/${kode}/selesai`);
      if (!json.success) {
        alert(json.message || "Gagal menyelesaikan antrian");
        return;
      }
      await fetchAntrian();
    } catch (err) {
      console.error("Selesai antrian error:", err);
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReset = async () => {
    const konfirmasi = confirm(
      "Reset semua antrian ke status 'tersedia'? Aksi ini biasanya dilakukan di akhir hari."
    );
    if (!konfirmasi) return;

    setLoading(true);
    try {
      const json = await api.patch("/antrian-awal/reset");
      if (!json.success) {
        alert(json.message || "Gagal reset antrian");
      }
      await fetchAntrian();
    } catch (err) {
      console.error("Reset antrian error:", err);
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
      setLoading(false);
    }
  };

  // CRUD handlers
  const handleOpenAddModal = () => {
    setModalMode("add");
    setNoAntrianInput("");
    setEditTargetKode(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Antrian) => {
    setModalMode("edit");
    setNoAntrianInput(item.no_antrian);
    setEditTargetKode(item.kode_antrian);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNo = noAntrianInput.trim();
    if (!cleanNo) {
      alert("Nomor antrian tidak boleh kosong");
      return;
    }
    if (cleanNo.length > 2) {
      alert("Nomor antrian maksimal 2 karakter");
      return;
    }

    setLoading(true);
    setIsModalOpen(false);

    try {
      if (modalMode === "add") {
        const json = await api.post("/antrian-awal", { no_antrian: cleanNo });
        if (!json.success) {
          alert(json.message || "Gagal menambahkan antrian");
        }
      } else if (modalMode === "edit" && editTargetKode) {
        const json = await api.put(`/antrian-awal/${editTargetKode}`, {
          no_antrian: cleanNo,
        });
        if (!json.success) {
          alert(json.message || "Gagal memperbarui antrian");
        }
      }
      await fetchAntrian();
    } catch (err) {
      console.error("Submit antrian error:", err);
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
      setLoading(false);
    }
  };

  const handleDelete = async (kode: string, noAntrian: string) => {
    const konfirmasi = confirm(`Hapus nomor antrian ${noAntrian}? Tindakan ini permanen.`);
    if (!konfirmasi) return;

    setLoading(true);
    try {
      const json = await api.delete(`/antrian-awal/${kode}`);
      if (!json.success) {
        alert(json.message || "Gagal menghapus antrian");
      }
      await fetchAntrian();
    } catch (err) {
      console.error("Hapus antrian error:", err);
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
      setLoading(false);
    }
  };

  const statusLabel: Record<Antrian["status"], string> = {
    tersedia: "Tersedia",
    terpakai: "Menunggu",
    dipanggil: "Dipanggil",
    selesai: "Selesai",
  };

  // ---------- Loading state ----------
  if (loading && antrianList.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-emerald-600 animate-spin" />
          <p className="text-sm font-medium">Memuat data antrian…</p>
        </div>
      </div>
    );
  }

  // ---------- Error state ----------
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="max-w-sm w-full rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-700 mb-1">
            Antrian tidak bisa dimuat
          </p>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchAntrian();
            }}
            className="w-full bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <audio ref={audioRef} src="/sounds/bell.mp3" preload="auto" />

      {/* aria-live announcer for screen readers when a number is called */}
      <div aria-live="polite" className="sr-only">
        {antrianList.find((a) => a.status === "dipanggil")?.no_antrian
          ? `Nomor antrian ${antrianList.find((a) => a.status === "dipanggil")?.no_antrian} sedang dipanggil`
          : ""}
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-5 border-b border-gray-200">
          <div>
            <p className="text-xs font-semibold uppercase text-emerald-600 mb-1">
              Loket Pendaftaran
            </p>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Antrian Awal
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-md">
              Tekan <span className="font-semibold text-gray-700">Ambil</span> saat pasien datang,
              lanjutkan <span className="font-semibold text-gray-700">Panggil</span>, lalu selesaikan antrian.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-all shadow-sm active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Tambah Antrian
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors shadow-sm"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Semua
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-5 text-xs text-gray-500">
          <LegendDot className="bg-white border border-gray-300" label="Tersedia" />
          <LegendDot className="bg-amber-400" label="Menunggu dipanggil" />
          <LegendDot className="bg-rose-500 animate-pulse" label="Sedang dipanggil" />
          <LegendDot className="bg-emerald-500" label="Selesai" />
        </div>

        {/* Empty state */}
        {antrianList.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white py-16 text-center">
            <p className="text-sm text-gray-500">Belum ada data antrian untuk hari ini.</p>
            <button
              onClick={handleOpenAddModal}
              className="mt-3 inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" /> Tambah Antrian Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {antrianList.map((item) => (
              <TicketCard
                key={item.kode_antrian}
                item={item}
                statusLabel={statusLabel[item.status]}
                isLoading={actionLoading === item.kode_antrian}
                onAmbil={() => handleAmbil(item.kode_antrian)}
                onPanggil={() => handlePanggil(item.kode_antrian, item.no_antrian)}
                onSelesai={() => handleSelesai(item.kode_antrian)}
                onEdit={() => handleOpenEditModal(item)}
                onDelete={() => handleDelete(item.kode_antrian, item.no_antrian)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal Tambah/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {modalMode === "add" ? "Tambah Antrian Baru" : "Edit Nomor Antrian"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit}>
              <div className="mb-5">
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">
                  Nomor Antrian
                </label>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="Contoh: 26, A1"
                  value={noAntrianInput}
                  onChange={(e) => setNoAntrianInput(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 focus:outline-none transition-all font-mono uppercase"
                  autoFocus
                />
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Maksimal 2 karakter huruf atau angka.
                </p>
              </div>

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      <span>{label}</span>
    </div>
  );
}

function TicketCard({
  item,
  statusLabel,
  isLoading,
  onAmbil,
  onPanggil,
  onSelesai,
  onEdit,
  onDelete,
}: {
  item: Antrian;
  statusLabel: string;
  isLoading: boolean;
  onAmbil: () => void;
  onPanggil: () => void;
  onSelesai: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isCalled = item.status === "dipanggil";
  const isWaiting = item.status === "terpakai";
  const isDone = item.status === "selesai";

  const bandColor = isCalled
    ? "bg-rose-500"
    : isWaiting
    ? "bg-amber-400"
    : isDone
    ? "bg-emerald-500"
    : "bg-gray-200";

  const cardBorder = isCalled
    ? "border-rose-300"
    : isWaiting
    ? "border-amber-200"
    : isDone
    ? "border-emerald-300"
    : "border-gray-200";

  const ring = isCalled ? "ring-2 ring-rose-300 animate-pulse" : "";

  return (
    // FIX: overflow-hidden dipindahkan hanya ke wrapper band warna atas
    // (bukan lagi di kartu utama), jadi tidak ada elemen yang kepotong
    // dan menimbulkan "celah" aneh di kiri-kanan kartu.
    // Notch bulat ala tiket sobek juga dihapus karena selalu terlihat
    // terpotong pada grid yang rapat — solusi paling rapi & konsisten
    // di semua ukuran layar.
    <div
      className={`relative rounded-xl bg-white border ${cardBorder} shadow-sm group hover:shadow-md transition-all ${ring}`}
    >
      {/* top color band = status */}
      <div className={`h-1.5 w-full rounded-t-xl ${bandColor}`} />

      {/* Action buttons (Visible on hover on desktop, always visible on mobile) */}
      <div className="absolute right-2.5 top-2.5 flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          disabled={isLoading}
          className="p-1 text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors disabled:opacity-50"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          disabled={isLoading}
          className="p-1 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-50"
          title="Hapus"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-3 pt-6 pb-3 text-center">
        <p className="font-mono text-3xl font-bold tabular-nums text-gray-900 tracking-wide uppercase">
          {item.no_antrian}
        </p>
        <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-400 mt-0.5 mb-3">
          {statusLabel}
        </p>

        {/* dashed tear line (dekorasi tetap, tanpa notch samping) */}
        <div className="border-t border-dashed border-gray-200 mb-3" />

        {item.status === "tersedia" && (
          <button
            onClick={onAmbil}
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 shadow-sm"
          >
            {isLoading ? "…" : "Ambil"}
          </button>
        )}

        {item.status === "terpakai" && (
          <button
            onClick={onPanggil}
            disabled={isLoading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white py-1.5 rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 shadow-sm"
          >
            {isLoading ? "…" : "Panggil"}
          </button>
        )}

        {item.status === "dipanggil" && (
          <div className="flex flex-col gap-1.5">
            <button
              onClick={onSelesai}
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 shadow-sm"
            >
              {isLoading ? "…" : "Selesai"}
            </button>
            <button
              onClick={onPanggil}
              disabled={isLoading}
              className="w-full border border-rose-200 text-rose-600 hover:bg-rose-50 py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? "…" : (
                <>
                  <Volume2 className="h-3.5 w-3.5" />
                  Panggil lagi
                </>
              )}
            </button>
          </div>
        )}

        {item.status === "selesai" && (
          <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-semibold py-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Selesai
          </span>
        )}
      </div>
    </div>
  );
}