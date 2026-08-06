import { useState, useEffect } from "react";
import { 
  Users, 
  Volume2, 
  CheckCircle, 
  Clock, 
  Stethoscope, 
  AlertCircle, 
  ChevronRight, 
  User, 
  Building2,
  Phone
} from "lucide-react";
import Topbar from "../components/Topbar";
import api from "../services/api";
import "./PelayananMedis.css";

export default function PelayananMedis() {
  const [poliList, setPoliList] = useState([]);
  const [selectedPoli, setSelectedPoli] = useState(null);
  const [antrianList, setAntrianList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch clinics on mount
  useEffect(() => {
    async function loadPoli() {
      try {
        setLoading(true);
        const { data } = await api.get("/pendaftaran/poli");
        setPoliList(data);
        if (data && data.length > 0) {
          setSelectedPoli(data[0]); // Select first clinic by default
        }
        setError(null);
      } catch (err) {
        console.error("Gagal memuat poli:", err);
        setError("Gagal mengambil daftar poliklinik dari server.");
      } finally {
        setLoading(false);
      }
    }
    loadPoli();
  }, []);

  // Fetch queue when selected clinic changes
  const fetchAntrian = async () => {
    if (!selectedPoli) return;
    try {
      const { data } = await api.get("/pendaftaran/antrian", {
        params: { id_poli: selectedPoli.id_poli }
      });
      setAntrianList(data);
      setError(null);
    } catch (err) {
      console.error("Gagal memuat antrian:", err);
      setError("Gagal memuat data antrean dari server.");
    }
  };

  useEffect(() => {
    fetchAntrian();

    // Auto-refresh queue every 15 seconds
    const interval = setInterval(fetchAntrian, 15000);
    return () => clearInterval(interval);
  }, [selectedPoli]);

  // Audio Voice Caller (Text to Speech)
  const playSpeechCall = (noAntrian, namaPoli) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // Cancel any ongoing announcement

      // Format string to sound natural (e.g., A-001 -> A, 1)
      const parts = noAntrian.split("-");
      let readableNo = noAntrian;
      if (parts.length === 2) {
        const letter = parts[0];
        const num = parseInt(parts[1], 10);
        readableNo = `${letter}, ${num}`;
      }

      const text = `Nomor antrean ${readableNo}, silakan menuju ${namaPoli}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 0.85; // Natural speed
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Call / Recall Patient
  const handlePanggil = async (item) => {
    try {
      await api.put(`/pendaftaran/antrian/${item.id_antrian}/status`, {
        status_panggil: "dipanggil"
      });
      playSpeechCall(item.no_antrian, item.nama_poli);
      fetchAntrian();
    } catch (err) {
      console.error("Gagal memanggil pasien:", err);
      alert("Gagal melakukan panggilan pasien.");
    }
  };

  // Finish Patient Examination
  const handleSelesai = async (item) => {
    try {
      await api.put(`/pendaftaran/antrian/${item.id_antrian}/status`, {
        status_panggil: "selesai"
      });
      fetchAntrian();
    } catch (err) {
      console.error("Gagal menyelesaikan pemeriksaan:", err);
      alert("Gagal menyelesaikan pemeriksaan.");
    }
  };

  // Group queue by status
  const sedangDiperiksa = antrianList.filter(a => a.status_panggil === "dipanggil");
  const antreanMenunggu = antrianList.filter(a => a.status_panggil === "menunggu");
  const antreanSelesai = antrianList.filter(a => a.status_panggil === "selesai");

  return (
    <div className="flex flex-col h-full bg-[--bg-page] text-[--text-primary] overflow-hidden">
      <Topbar />

      <main className="flex-1 px-6 py-6 w-full overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pelayanan Medis</h1>
            <p className="mt-1 text-sm text-[--text-secondary]">
              Pemanggilan dan pemeriksaan pasien poliklinik hari ini.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[--card-bg] border border-[--border-soft] px-4 py-2 rounded-[--radius-sm] shadow-sm text-xs font-semibold text-[--text-secondary]">
            <Clock size={14} className="text-blue-500" />
            <span>
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
              })}
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-[--accent-red-soft] px-4 py-3 text-sm text-[--accent-red]">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Poli Tabs Section */}
        <div className="mt-6 flex flex-wrap gap-3">
          {loading && poliList.length === 0 ? (
            <div className="text-sm text-[--text-secondary]">Memuat poliklinik...</div>
          ) : (
            poliList.map((p) => {
              const isActive = selectedPoli?.id_poli === p.id_poli;
              return (
                <button
                  key={p.id_poli}
                  onClick={() => setSelectedPoli(p)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-[--radius-sm] text-sm font-semibold transition-all shadow-sm border ${
                    isActive
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-[--card-bg] border-[--border-soft] hover:border-blue-400 text-[--text-primary]"
                  }`}
                >
                  <Stethoscope size={16} />
                  <span>{p.nama_poli}</span>
                </button>
              );
            })
          )}
        </div>

        {selectedPoli && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 items-start">
            {/* Left Column: Active Patient Examination Panel */}
            <div className="flex flex-col gap-6">
              <div className="card-examine border-[--border-outer] bg-[--card-bg] rounded-[--radius-md] shadow-lg overflow-hidden border">
                <div className="bg-blue-50 border-b border-[--border-soft] px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                    <Volume2 size={16} />
                    Sedang Diperiksa
                  </div>
                  <span className="text-xs font-semibold text-blue-600 uppercase bg-blue-100/80 px-2 py-0.5 rounded">
                    Poli Aktif
                  </span>
                </div>

                {sedangDiperiksa.length > 0 ? (
                  // Get the most recently called patient
                  (() => {
                    const current = sedangDiperiksa[sedangDiperiksa.length - 1];
                    return (
                      <div className="p-5 text-center flex flex-col items-center">
                        <div className="text-sm text-[--text-secondary]">Nomor Antrean</div>
                        <div className="mt-2 text-5xl font-black text-blue-600 tracking-wider">
                          {current.no_antrian}
                        </div>
                        <div className="mt-3 text-lg font-bold text-[--text-primary]">
                          {current.nama_pasien}
                        </div>
                        <div className="text-xs text-[--text-secondary] mt-1">
                          No. RM {current.no_rm} • {current.nama_penjamin || "Umum"}
                        </div>

                        <div className="mt-4 border-t border-[--border-soft] w-full pt-4 flex flex-col gap-2.5 text-xs text-left">
                          <div className="flex justify-between items-center">
                            <span className="text-[--text-secondary]">Dokter Pemeriksa:</span>
                            <span className="font-semibold">{current.nama_dokter || "-"}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[--text-secondary]">Jenis Kelamin:</span>
                            <span className="font-semibold">
                              {current.jk === "L" ? "Laki-laki" : current.jk === "P" ? "Perempuan" : "-"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-6 w-full grid grid-cols-2 gap-3">
                          <button
                            onClick={() => handlePanggil(current)}
                            className="flex items-center justify-center gap-1.5 rounded-lg border border-blue-600 text-blue-600 py-2.5 text-xs font-bold hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <Volume2 size={14} />
                            Panggil Ulang
                          </button>
                          <button
                            onClick={() => handleSelesai(current)}
                            className="flex items-center justify-center gap-1.5 rounded-lg bg-green-600 text-white py-2.5 text-xs font-bold hover:bg-green-700 transition-colors cursor-pointer"
                          >
                            <CheckCircle size={14} />
                            Selesai Periksa
                          </button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="p-8 text-center text-[--text-secondary]">
                    <div className="flex justify-center mb-3">
                      <Users size={32} className="text-[--text-secondary] opacity-50" />
                    </div>
                    <p className="text-sm font-medium">Tidak ada pasien sedang diperiksa.</p>
                    <p className="text-xs text-[--text-secondary] mt-1">
                      Silakan tekan tombol panggil pada daftar antrean untuk mulai memanggil pasien.
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Info Summary */}
              <div className="bg-[--card-bg] border border-[--border-soft] rounded-[--radius-md] p-5 shadow-sm">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Building2 size={16} className="text-blue-500" />
                  Ringkasan Antrean {selectedPoli.nama_poli}
                </h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-blue-50/50 p-3 rounded-[--radius-sm] border border-blue-100">
                    <div className="text-lg font-bold text-blue-600">{antreanMenunggu.length}</div>
                    <div className="text-[10px] font-semibold text-[--text-secondary] uppercase tracking-wide mt-0.5">Menunggu</div>
                  </div>
                  <div className="bg-amber-50/50 p-3 rounded-[--radius-sm] border border-amber-100">
                    <div className="text-lg font-bold text-amber-600">{sedangDiperiksa.length}</div>
                    <div className="text-[10px] font-semibold text-[--text-secondary] uppercase tracking-wide mt-0.5">Diperiksa</div>
                  </div>
                  <div className="bg-green-50/50 p-3 rounded-[--radius-sm] border border-green-100">
                    <div className="text-lg font-bold text-green-600">{antreanSelesai.length}</div>
                    <div className="text-[10px] font-semibold text-[--text-secondary] uppercase tracking-wide mt-0.5">Selesai</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Queue Lists */}
            <div className="flex flex-col gap-6 bg-[--card-bg] border border-[--border-soft] rounded-[--radius-md] shadow-sm overflow-hidden">
              {/* Tabs / Subheaders */}
              <div className="border-b border-[--border-soft] px-5 py-4 flex items-center justify-between">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Users size={18} className="text-blue-500" />
                  Daftar Antrean Hari Ini
                </h2>
                <span className="text-xs text-[--text-secondary] font-medium">
                  Total: {antrianList.length} Pasien
                </span>
              </div>

              {/* Waiting List Section */}
              <div className="px-5 pb-5">
                <div className="flex items-center gap-1.5 mb-3 text-xs font-bold text-[--text-secondary] uppercase tracking-wide">
                  <Clock size={13} className="text-amber-500" />
                  Menunggu Panggilan ({antreanMenunggu.length})
                </div>

                {antreanMenunggu.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {antreanMenunggu.map((item) => (
                      <div 
                        key={item.id_antrian}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-[--border-soft] bg-[--bg-page]/30 hover:border-blue-300 transition-colors gap-4"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-50 text-blue-600 font-bold text-lg border border-blue-100 shrink-0">
                            {item.no_antrian}
                          </div>
                          <div>
                            <div className="font-bold text-[--text-primary] text-sm flex items-center gap-2">
                              {item.nama_pasien}
                            </div>
                            <div className="text-xs text-[--text-secondary] mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span>RM: {item.no_rm}</span>
                              <span className="text-[--border-outer]">•</span>
                              <span>PJM: {item.nama_penjamin || "Umum"}</span>
                              <span className="text-[--border-outer]">•</span>
                              <span>Dr: {item.nama_dokter || "-"}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handlePanggil(item)}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shrink-0 cursor-pointer"
                        >
                          <Volume2 size={13} />
                          Panggil
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed border-[--border-soft] rounded-xl text-[--text-secondary] text-xs">
                    Tidak ada pasien dalam daftar tunggu saat ini.
                  </div>
                )}
              </div>

              {/* Finished List Section */}
              <div className="px-5 pb-5 border-t border-[--border-soft] pt-5">
                <div className="flex items-center gap-1.5 mb-3 text-xs font-bold text-[--text-secondary] uppercase tracking-wide">
                  <CheckCircle size={13} className="text-green-500" />
                  Selesai Diperiksa ({antreanSelesai.length})
                </div>

                {antreanSelesai.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {antreanSelesai.map((item) => (
                      <div 
                        key={item.id_antrian}
                        className="flex items-center justify-between p-3.5 rounded-lg border border-green-100 bg-green-50/20 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-green-100/70 text-green-700 font-bold flex items-center justify-center shrink-0">
                            {item.no_antrian}
                          </div>
                          <div>
                            <div className="font-semibold text-[--text-primary] line-clamp-1">{item.nama_pasien}</div>
                            <div className="text-[10px] text-[--text-secondary] mt-0.5">RM: {item.no_rm}</div>
                          </div>
                        </div>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full uppercase shrink-0">
                          <CheckCircle size={10} />
                          Selesai
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-[--border-soft] rounded-xl text-[--text-secondary] text-xs">
                    Belum ada pasien yang selesai diperiksa hari ini.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
