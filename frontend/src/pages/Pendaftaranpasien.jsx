import { useState, useMemo, useEffect } from "react";
import { 
  Printer, 
  AlertCircle, 
  Search, 
  UserCheck, 
  X, 
  Phone, 
  MapPin, 
  Calendar, 
  IdCard, 
  Stethoscope,
  Loader2,
  Users,
  Volume2,
  CheckCircle,
  Clock,
  Building2,
  UserPlus
} from "lucide-react";
import Topbar from "../components/Topbar";
import api from "../services/api";
import "./PelayananMedis.css";


// Default fallback options for poliklinik
const DEFAULT_POLI_OPTIONS = [
  "Pilih Poliklinik",
  "Poli Umum",
  "Poli Gigi",
  "Poli Anak",
  "Poli KIA",
  "Poli Penyakit Dalam",
];

const PENJAMIN_OPTIONS = ["Umum / Pribadi", "BPJS Kesehatan", "Asuransi Swasta"];

function todayLabel() {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function hitungUmur(tgl) {
  if (!tgl) return "-";
  const lahir = new Date(tgl);
  const now = new Date();
  let umur = now.getFullYear() - lahir.getFullYear();
  const m = now.getMonth() - lahir.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < lahir.getDate())) umur--;
  return `${umur} th`;
}

export default function PendaftaranPasien() {
  const [activeMenu, setActiveMenu] = useState("pendaftaran"); // "pendaftaran" | "antrean"
  const [tab, setTab] = useState("baru");

  // form pasien baru
  const [nama, setNama] = useState("");
  const [nik, setNik] = useState("");
  const [tglLahir, setTglLahir] = useState("");
  const [gender, setGender] = useState("");
  const [telepon, setTelepon] = useState("");
  const [alamat, setAlamat] = useState("");

  // shared
  const [poliOptions, setPoliOptions] = useState(DEFAULT_POLI_OPTIONS);
  const [penjamin, setPenjamin] = useState(PENJAMIN_OPTIONS[0]);
  const [poli, setPoli] = useState(DEFAULT_POLI_OPTIONS[0]);
  const [dokter, setDokter] = useState("Tanpa Preferensi (Otomatis)");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [hasil, setHasil] = useState(null);

  // pasien lama: pencarian
  const [query, setQuery] = useState("");
  const [hasilCari, setHasilCari] = useState([]);
  const [mencari, setMencari] = useState(false);
  const [sudahCari, setSudahCari] = useState(false);
  const [pasienTerpilih, setPasienTerpilih] = useState(null);

  // states for queue (antrean)
  const [poliList, setPoliList] = useState([]);
  const [selectedPoli, setSelectedPoli] = useState(null);
  const [antrianList, setAntrianList] = useState([]);
  const [loadingAntrian, setLoadingAntrian] = useState(false);
  const [errorAntrian, setErrorAntrian] = useState(null);

  const poliLabel = poli === poliOptions[0] ? "Poli Umum" : poli;
  const tanggal = useMemo(() => todayLabel(), []);

  // Fetch poliklinik list from database
  useEffect(() => {
    async function loadPoli() {
      try {
        setLoadingAntrian(true);
        const { data } = await api.get("/pendaftaran/poli");
        if (data && data.length > 0) {
          const list = ["Pilih Poliklinik", ...data.map(p => p.nama_poli)];
          setPoliOptions(list);
          setPoli(list[0]);

          // Set queue states too
          setPoliList(data);
          setSelectedPoli(data[0]);
        }
        setErrorAntrian(null);
      } catch (err) {
        console.error("Gagal memuat poli:", err);
        setErrorAntrian("Gagal mengambil daftar poliklinik dari server.");
      } finally {
        setLoadingAntrian(false);
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
      setErrorAntrian(null);
    } catch (err) {
      console.error("Gagal memuat antrian:", err);
      setErrorAntrian("Gagal memuat data antrean dari server.");
    }
  };

  useEffect(() => {
    if (activeMenu !== "antrean" || !selectedPoli) return;
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await api.get("/pendaftaran/antrian", {
          params: { id_poli: selectedPoli.id_poli }
        });
        if (mounted) {
          setAntrianList(data);
          setErrorAntrian(null);
        }
      } catch (err) {
        console.error("Gagal memuat antrian:", err);
        if (mounted) setErrorAntrian("Gagal memuat data antrean dari server.");
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => { mounted = false; clearInterval(interval); };
  }, [selectedPoli, activeMenu]);

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

  const inputBase =
    "w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent";
  const labelBase = "block text-sm text-text-secondary mb-1.5";

  // nama pasien untuk preview (baru / lama)
  const namaPreview = tab === "lama" ? pasienTerpilih?.nama || "-" : nama || "-";
  const ticketQueueNumber = hasil?.no_antrian || "A-000";

  // debounce pencarian pasien lama
  useEffect(() => {
    if (tab !== "lama") return;
    const term = query.trim();
    if (term.length < 2) return;
    const t = setTimeout(async () => {
      setMencari(true);
      try {
        const { data } = await api.get("/pasien/cari", { params: { q: term } });
        setHasilCari(data);
        setError(null);
      } catch (err) {
        setHasilCari([]);
        setError(err.response?.data?.message || "Gagal mencari pasien.");
      } finally {
        setMencari(false);
        setSudahCari(true);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query, tab]);

  function onQueryChange(e) {
    const val = e.target.value;
    setQuery(val);
    if (val.trim().length < 2) {
      setHasilCari([]);
      setSudahCari(false);
    }
  }

  function resetFormBaru() {
    setNama("");
    setNik("");
    setTglLahir("");
    setGender("");
    setTelepon("");
    setAlamat("");
    setPenjamin(PENJAMIN_OPTIONS[0]);
    setPoli(poliOptions[0]);
    setDokter("Tanpa Preferensi (Otomatis)");
  }

  function resetPasienLama() {
    setQuery("");
    setHasilCari([]);
    setPasienTerpilih(null);
    setSudahCari(false);
  }

  function gantiTab(t) {
    setTab(t);
    setError(null);
    setHasil(null);
    if (t === "lama") resetFormBaru();
    else resetPasienLama();
  }

  async function handleDaftarBaru() {
    setError(null);
    if (!nik || nik.length !== 16) return setError("NIK harus diisi 16 digit.");
    if (!nama.trim()) return setError("Nama lengkap wajib diisi.");
    if (!tglLahir) return setError("Tanggal lahir wajib diisi.");
    if (!gender) return setError("Jenis kelamin wajib dipilih.");
    if (poli === poliOptions[0]) return setError("Poli tujuan wajib dipilih.");

    setSubmitting(true);
    try {
      const { data } = await api.post("/pasien", {
        nik,
        nama: nama.trim(),
        tgl_lahir: tglLahir,
        jk: gender,
        alamat,
        telepon,
        poli: poli === poliOptions[0] ? null : poli,
        penjamin,
        dokter
      });
      setHasil(data.data);
      resetFormBaru();
      cetakAntrean(data.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Terjadi kesalahan, coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDaftarLama() {
    setError(null);
    if (!pasienTerpilih) return setError("Pilih pasien terlebih dahulu.");
    if (poli === poliOptions[0]) return setError("Poli tujuan wajib dipilih.");

    setSubmitting(true);
    try {
      const { data } = await api.post("/pendaftaran", {
        id_pasien: pasienTerpilih.id_pasien,
        poli,
        penjamin,
        dokter
      });
      setHasil({
        id_pasien: pasienTerpilih.id_pasien,
        nama: pasienTerpilih.nama,
        no_rm: pasienTerpilih.no_rm,
        no_antrian: data.data.no_antrian,
        no_urut: data.data.no_urut,
        nama_poli: data.data.nama_poli
      });
      resetPasienLama();
      cetakAntrean({
        nama: pasienTerpilih.nama,
        no_rm: pasienTerpilih.no_rm,
        no_antrian: data.data.no_antrian,
        no_urut: data.data.no_urut,
        nama_poli: data.data.nama_poli
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Terjadi kesalahan, coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  function cetakAntrean(data) {
    const tanggalStr = new Date().toLocaleDateString("id-ID", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
    const waktuStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const win = window.open("", "_blank", "width=420,height=620");
    win.document.write(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Tiket Antrean - ${data.no_antrian || ""}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; padding: 24px; color: #1f2430; }
          .ticket { border: 2px dashed #cabdf7; border-radius: 14px; padding: 28px 20px; text-align: center; }
          .clinic-name { font-size: 18px; font-weight: 700; }
          .clinic-sub { font-size: 12px; color: #868c9c; margin-top: 2px; }
          .divider { border: none; border-top: 1px solid #ecebf5; margin: 18px 0; }
          .label { font-size: 12px; color: #868c9c; text-transform: uppercase; letter-spacing: 0.5px; }
          .queue-num { font-size: 56px; font-weight: 800; color: #3266f0; margin: 8px 0; line-height: 1; }
          .poli-name { font-size: 16px; font-weight: 600; margin-top: 4px; }
          .info { display: flex; justify-content: space-between; margin-top: 6px; font-size: 13px; }
          .info span:first-child { color: #868c9c; }
          .info span:last-child { font-weight: 600; }
          .footer { margin-top: 18px; font-size: 11px; color: #b0b4c0; text-align: center; }
          @media print { body { padding: 0; } .ticket { border: 1px solid #ccc; } }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="clinic-name">SAKK Clinical</div>
          <div class="clinic-sub">Management System</div>
          <hr class="divider">
          <div class="label">Nomor Antrean</div>
          <div class="queue-num">${data.no_antrian || "-"}</div>
          <div class="poli-name">${data.nama_poli || "-"}</div>
          <hr class="divider">
          <div class="info"><span>Nama Pasien</span><span>${data.nama || "-"}</span></div>
          <div class="info"><span>No. Rekam Medis</span><span>${data.no_rm || "-"}</span></div>
          <div class="info"><span>Tanggal</span><span>${tanggalStr}</span></div>
          <div class="info"><span>Pukul</span><span>${waktuStr}</span></div>
          <div class="footer">Mohon tunggu panggilan di ruang tunggu poli.<br>Tiket ini harap dibawa saat pemeriksaan.</div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    win.document.close();
  }

  const bisaSubmit = tab === "baru" ? true : !!pasienTerpilih;

  // Group queue by status
  const sedangDiperiksa = antrianList.filter(a => a.status_panggil === "dipanggil");
  const antreanMenunggu = antrianList.filter(a => a.status_panggil === "menunggu");
  const antreanSelesai = antrianList.filter(a => a.status_panggil === "selesai");

  return (
    <div className="flex flex-col h-full bg-surface-0 text-text-primary overflow-hidden">
      <Topbar />

      <main className="flex-1 px-6 py-6 w-full overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {activeMenu === "pendaftaran" ? "Pendaftaran Pasien" : "Antrean Poliklinik"}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {activeMenu === "pendaftaran"
                ? "Registrasi antrean untuk pelayanan poliklinik."
                : "Pemanggilan dan pemeriksaan pasien poliklinik hari ini."}
            </p>
          </div>
          {activeMenu === "antrean" && (
            <div className="flex items-center gap-2 bg-surface-2 border border-border px-4 py-2 rounded-sm shadow-sm text-xs font-semibold text-text-secondary">
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
          )}
        </div>

        {/* Tab switcher at the top */}
        <div className="mt-5 mb-6 flex gap-1.5 p-1 bg-surface-1 rounded-xl w-fit border border-border shadow-xs">
          <button
            type="button"
            onClick={() => setActiveMenu("pendaftaran")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeMenu === "pendaftaran"
                ? "bg-surface-2 text-blue-600 shadow-sm font-bold"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-2/40"
            }`}
          >
            <UserPlus size={16} />
            <span>Pendaftaran Pasien</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu("antrean")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeMenu === "antrean"
                ? "bg-surface-2 text-blue-600 shadow-sm font-bold"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-2/40"
            }`}
          >
            <Users size={16} />
            <span>Antrean Poliklinik</span>
          </button>
        </div>

        {activeMenu === "pendaftaran" ? (
          <>
            {hasil && (
              <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                <div className="flex items-center gap-2">
                  <UserCheck size={16} />
                  <span>
                    Pasien <strong>{hasil.nama || ""}</strong> terdaftar dengan No. RM{" "}
                    <strong>{hasil.no_rm}</strong>. Antrean: <strong>{hasil.no_antrian || "-"}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => cetakAntrean(hasil)}
                  className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors shrink-0 cursor-pointer"
                >
                  <Printer size={14} /> Cetak Ulang
                </button>
              </div>
            )}

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
              {/* Left column */}
              <div className="flex flex-col gap-6">
                {/* Data pribadi card */}
                <div className="rounded-xl border border-border bg-surface-2 p-6 shadow-sm">
                  <div className="inline-flex rounded-lg bg-surface-1 p-1 text-sm">
                    <button
                      onClick={() => gantiTab("baru")}
                      className={
                        "px-4 py-1.5 rounded-md font-semibold transition-all cursor-pointer " +
                        (tab === "baru"
                          ? "bg-surface-2 text-blue-600 shadow-sm"
                          : "text-text-secondary hover:text-text-primary")
                      }
                    >
                      Pasien Baru
                    </button>
                    <button
                      onClick={() => gantiTab("lama")}
                      className={
                        "px-4 py-1.5 rounded-md font-semibold transition-all cursor-pointer " +
                        (tab === "lama"
                          ? "bg-surface-2 text-blue-600 shadow-sm"
                          : "text-text-secondary hover:text-text-primary")
                      }
                    >
                      Pasien Lama
                    </button>
                  </div>

                  {tab === "baru" ? (
                    <>
                      <h2 className="mt-5 text-lg font-bold">Data Pribadi</h2>
                      <div className="mt-2 border-b border-border" />

                      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                        <div>
                          <label className={labelBase}>Nomor Induk Kependudukan (NIK)</label>
                          <input
                            className={inputBase}
                            placeholder="16 digit NIK"
                            value={nik}
                            maxLength={16}
                            onChange={(e) => setNik(e.target.value.replace(/\D/g, ""))}
                          />
                        </div>
                        <div>
                          <label className={labelBase}>Nama Lengkap</label>
                          <input
                            className={inputBase}
                            placeholder="Sesuai KTP"
                            value={nama}
                            onChange={(e) => setNama(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className={labelBase}>Tanggal Lahir</label>
                          <input
                            type="date"
                            className={inputBase}
                            value={tglLahir}
                            onChange={(e) => setTglLahir(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className={labelBase}>Jenis Kelamin</label>
                          <select
                            className={inputBase}
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                          >
                            <option value="">Pilih</option>
                            <option value="L">Laki-laki</option>
                            <option value="P">Perempuan</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelBase}>No. Telepon / WhatsApp</label>
                          <input
                            className={inputBase}
                            placeholder="08xx..."
                            value={telepon}
                            onChange={(e) => setTelepon(e.target.value.replace(/[^\d]/g, ""))}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelBase}>Alamat Lengkap</label>
                          <textarea
                            rows={3}
                            className={inputBase + " resize-none"}
                            placeholder="Alamat domisili saat ini"
                            value={alamat}
                            onChange={(e) => setAlamat(e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="mt-5 text-lg font-bold">Cari Pasien Terdaftar</h2>
                      <div className="mt-2 border-b border-border" />
                      <p className="mt-3 text-sm text-text-secondary">
                        Cari berdasarkan NIK, No. Rekam Medis, atau Nama pasien.
                      </p>

                      {/* search box */}
                      <div className="relative mt-4">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          className={inputBase + " pl-11"}
                          placeholder="Ketik NIK / No. RM / Nama..."
                          value={query}
                          onChange={onQueryChange}
                        />
                        {query && (
                          <button
                            type="button"
                            onClick={() => { setQuery(""); setPasienTerpilih(null); setHasilCari([]); setSudahCari(false); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
                            aria-label="Hapus pencarian"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>

                      {/* hasil pencarian / pasien terpilih */}
                      {pasienTerpilih ? (
                        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/60 p-4 animate-fade-in">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                              <UserCheck size={16} />
                              Pasien Terpilih
                            </div>
                            <button
                              type="button"
                              onClick={() => setPasienTerpilih(null)}
                              className="text-text-muted hover:text-red-500 cursor-pointer"
                              aria-label="Batal pilih"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                            <InfoItem icon={IdCard} label="No. RM" value={pasienTerpilih.no_rm} />
                            <InfoItem icon={IdCard} label="NIK" value={pasienTerpilih.nik} />
                            <InfoItem icon={UserCheck} label="Nama" value={pasienTerpilih.nama} />
                            <InfoItem icon={Calendar} label="Umur" value={hitungUmur(pasienTerpilih.tgl_lahir)} />
                            <InfoItem icon={UserCheck} label="Jenis Kelamin" value={pasienTerpilih.jk === "L" ? "Laki-laki" : pasienTerpilih.jk === "P" ? "Perempuan" : "-"} />
                            <InfoItem icon={Stethoscope} label="Poli" value={pasienTerpilih.nama_poli || pasienTerpilih.id_poli || "-"} />
                            <InfoItem icon={Phone} label="Telepon" value={pasienTerpilih.telepon || "-"} />
                            <div className="sm:col-span-2">
                              <InfoItem icon={MapPin} label="Alamat" value={pasienTerpilih.alamat || "-"} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 flex flex-col gap-2">
                          {mencari ? (
                            <div className="flex items-center justify-center gap-2 text-sm text-text-secondary py-6 text-center">
                              <Loader2 size={15} className="animate-spin" />
                              Mencari pasien...
                            </div>
                          ) : hasilCari.length > 0 ? (
                            hasilCari.map((p) => (
                              <button
                                key={p.id_pasien}
                                type="button"
                                onClick={() => setPasienTerpilih(p)}
                                className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-4 py-3 text-left hover:border-blue-400 hover:bg-blue-50/40 transition-colors cursor-pointer shadow-xs"
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold text-text-primary">{p.nama}</span>
                                  <span className="text-xs text-text-secondary mt-0.5">
                                    No. RM {p.no_rm} • NIK {p.nik}
                                  </span>
                                </div>
                                <span className="text-xs text-text-secondary font-medium">
                                  {p.jk === "L" ? "L" : p.jk === "P" ? "P" : "-"} • {hitungUmur(p.tgl_lahir)}
                                </span>
                              </button>
                            ))
                          ) : sudahCari ? (
                            <div className="text-sm text-text-secondary py-6 text-center rounded-lg border border-dashed border-border">
                              Tidak ada pasien ditemukan untuk “{query}”.
                            </div>
                          ) : (
                            <div className="text-sm text-text-muted py-6 text-center rounded-lg border border-dashed border-border">
                              Ketik minimal 2 karakter untuk mulai mencari.
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Informasi layanan card */}
                <div className="rounded-xl border border-border bg-surface-2 p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Informasi Layanan</h2>
                  <div className="mt-2 border-b border-border" />

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    <div>
                      <label className={labelBase}>Penjamin / Cara Bayar</label>
                      <select
                        className={inputBase}
                        value={penjamin}
                        onChange={(e) => setPenjamin(e.target.value)}
                      >
                        {PENJAMIN_OPTIONS.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelBase}>
                        Poli Tujuan <span className="text-red-500">*</span>
                      </label>
                      <select
                        className={inputBase}
                        value={poli}
                        onChange={(e) => setPoli(e.target.value)}
                      >
                        {poliOptions.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelBase}>Dokter (Opsional)</label>
                      <select
                        className={inputBase}
                        value={dokter}
                        onChange={(e) => setDokter(e.target.value)}
                      >
                        <option>Tanpa Preferensi (Otomatis)</option>
                        <option>dr. Andi Prasetyo</option>
                        <option>dr. Ratna Sari</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column: preview */}
              <div className="rounded-xl border border-border bg-surface-2 overflow-hidden lg:sticky lg:top-6 shadow-md">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-5 pt-6 pb-6 text-center shadow-inner">
                  <span className="inline-block rounded-full bg-white/20 backdrop-blur-sm px-3.5 py-1 text-xs font-semibold text-white">
                    Pratinjau Antrean
                  </span>
                  <div className="mt-4 text-xs text-blue-100 uppercase tracking-widest font-semibold">Nomor Antrean Anda</div>
                  <div className="mt-1 text-5xl font-black text-white tracking-tight drop-shadow-sm">
                    {ticketQueueNumber}
                  </div>
                  <div className="mt-2 text-sm font-bold text-white bg-white/10 rounded-lg px-3 py-1 inline-block">{poliLabel}</div>
                </div>

                <div className="px-5 py-5 flex flex-col gap-3 text-sm">
                  <Row label="Tanggal" value={tanggal} />
                  <Row label="Nama Pasien" value={namaPreview} />
                  <Row label="Penjamin" value={penjamin.split(" / ")[0]} />
                </div>

                <div className="px-5 pb-3 pt-1 text-center text-xs text-text-secondary leading-relaxed">
                  Mohon tunggu panggilan di ruang tunggu poli.
                </div>

                <div className="px-5 pb-5">
                  <button
                    onClick={tab === "baru" ? handleDaftarBaru : handleDaftarLama}
                    disabled={submitting || !bisaSubmit}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                  >
                    <Printer size={16} />
                    {submitting ? "Menyimpan..." : "Daftar & Cetak Antrean"}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {errorAntrian && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-accent-red-soft px-4 py-3 text-sm text-accent-red">
                <AlertCircle size={16} />
                {errorAntrian}
              </div>
            )}

            {/* Poli Tabs Section */}
            <div className="mt-6 flex flex-wrap gap-3">
              {loadingAntrian && poliList.length === 0 ? (
                <div className="text-sm text-text-secondary">Memuat poliklinik...</div>
              ) : (
                poliList.map((p) => {
                  const isActive = selectedPoli?.id_poli === p.id_poli;
                  return (
                    <button
                      key={p.id_poli}
                      onClick={() => setSelectedPoli(p)}
                      className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition-all shadow-xs border cursor-pointer ${
                        isActive
                          ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                          : "bg-card-bg border-border-soft hover:border-blue-400 text-text-primary"
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
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 items-start pb-10">
                {/* Left Column: Active Patient Examination Panel */}
                <div className="flex flex-col gap-6">
                  <div className="card-examine border-border-soft bg-card-bg rounded-xl shadow-sm overflow-hidden border">
                    <div className="bg-blue-50/50 border-b border-border-soft px-5 py-4 flex items-center justify-between">
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
                          <div className="p-6 text-center flex flex-col items-center">
                            <div className="text-xs text-text-secondary uppercase tracking-widest font-semibold">Nomor Antrean</div>
                            <div className="mt-2 text-5xl font-black text-blue-600 queue-active-num">
                              {current.no_antrian}
                            </div>
                            <div className="mt-4 text-xl font-bold text-text-primary">
                              {current.nama_pasien}
                            </div>
                            <div className="text-xs text-text-secondary mt-1 font-medium font-semibold">
                              No. RM {current.no_rm} • {current.nama_penjamin || "Umum"}
                            </div>

                            <div className="mt-5 border-t border-border-soft w-full pt-4 flex flex-col gap-2.5 text-xs text-left">
                              <div className="flex justify-between items-center">
                                <span className="text-text-secondary">Dokter Pemeriksa:</span>
                                <span className="font-semibold text-text-primary">{current.nama_dokter || "-"}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-text-secondary">Jenis Kelamin:</span>
                                <span className="font-semibold text-text-primary">
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
                      <div className="p-10 text-center">
                        <div className="flex justify-center mb-4">
                          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                            <Users size={28} className="text-blue-300" />
                          </div>
                        </div>
                        <p className="text-sm font-bold text-text-primary">Tidak ada pasien sedang diperiksa</p>
                        <p className="text-xs text-text-secondary mt-1.5 max-w-xs mx-auto leading-relaxed">
                          Panggil pasien dari daftar antrean untuk memulai pemeriksaan.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Quick Info Summary */}
                  <div className="bg-card-bg border border-border-soft rounded-xl p-5 shadow-sm">
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-text-primary">
                      <Building2 size={16} className="text-blue-500" />
                      Ringkasan Antrean {selectedPoli.nama_poli}
                    </h3>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                        <div className="text-xl font-bold text-blue-600">{antreanMenunggu.length}</div>
                        <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mt-1">Menunggu</div>
                      </div>
                      <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                        <div className="text-xl font-bold text-amber-600">{sedangDiperiksa.length}</div>
                        <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mt-1">Diperiksa</div>
                      </div>
                      <div className="bg-green-50/50 p-3 rounded-lg border border-green-100">
                        <div className="text-xl font-bold text-green-600">{antreanSelesai.length}</div>
                        <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mt-1">Selesai</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Queue Lists */}
                <div className="flex flex-col gap-6 bg-card-bg border border-border-soft rounded-xl shadow-sm overflow-hidden animate-fade-in">
                  {/* Tabs / Subheaders */}
                  <div className="border-b border-border-soft px-5 py-4 flex items-center justify-between bg-surface-0/30">
                    <h2 className="text-sm font-bold flex items-center gap-2 text-text-primary">
                      <Users size={18} className="text-blue-500" />
                      Daftar Antrean Hari Ini
                    </h2>
                    <span className="text-xs text-text-secondary font-semibold bg-surface-1 px-2.5 py-1 rounded-full">
                      Total: {antrianList.length} Pasien
                    </span>
                  </div>

                  {/* Waiting List Section */}
                  <div className="px-5 pb-5">
                    <div className="flex items-center gap-1.5 mb-3 text-xs font-bold text-text-secondary uppercase tracking-wider">
                      <Clock size={13} className="text-amber-500" />
                      Menunggu Panggilan ({antreanMenunggu.length})
                    </div>

                    {antreanMenunggu.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {antreanMenunggu.map((item) => (
                          <div 
                            key={item.id_antrian}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border-soft bg-surface-1/30 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-xs transition-all gap-4 antrian-item"
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-50 text-blue-600 font-bold text-lg border border-blue-100 shrink-0">
                                {item.no_antrian}
                              </div>
                              <div>
                                <div className="font-bold text-text-primary text-sm flex items-center gap-2">
                                  {item.nama_pasien}
                                </div>
                                <div className="text-xs text-text-secondary mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-medium">
                                  <span>RM: {item.no_rm}</span>
                                  <span className="text-border-outer">•</span>
                                  <span>PJM: {item.nama_penjamin || "Umum"}</span>
                                  <span className="text-border-outer">•</span>
                                  <span>Dr: {item.nama_dokter || "-"}</span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handlePanggil(item)}
                              className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shrink-0 cursor-pointer shadow-xs"
                            >
                              <Volume2 size={13} />
                              Panggil
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 border border-dashed border-border-soft rounded-xl text-text-secondary">
                        <Clock size={22} className="mx-auto mb-2 opacity-40" />
                        <p className="text-xs">Tidak ada pasien dalam daftar tunggu saat ini.</p>
                      </div>
                    )}
                  </div>

                  {/* Finished List Section */}
                  <div className="px-5 pb-5 border-t border-border-soft pt-5">
                    <div className="flex items-center gap-1.5 mb-3 text-xs font-bold text-text-secondary uppercase tracking-wider">
                      <CheckCircle size={13} className="text-green-500" />
                      Selesai Diperiksa ({antreanSelesai.length})
                    </div>

                    {antreanSelesai.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                        {antreanSelesai.map((item) => (
                          <div 
                            key={item.id_antrian}
                            className="flex items-center justify-between p-3.5 rounded-xl border border-green-100 bg-green-50/20 text-xs antrian-item"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-green-100/70 text-green-700 font-bold flex items-center justify-center shrink-0">
                                {item.no_antrian}
                              </div>
                              <div>
                                <div className="font-bold text-text-primary line-clamp-1">{item.nama_pasien}</div>
                                <div className="text-[10px] text-text-secondary mt-0.5 font-medium">RM: {item.no_rm}</div>
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
                      <div className="text-center py-8 border border-dashed border-border-soft rounded-xl text-text-secondary">
                        <CheckCircle size={22} className="mx-auto mb-2 opacity-40" />
                        <p className="text-xs">Belum ada pasien yang selesai diperiksa hari ini.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
      <span className="text-text-secondary">{label}</span>
      <span className="font-semibold text-text-primary">{value}</span>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={15} className="text-text-secondary shrink-0" />
      <span className="text-text-secondary font-medium">{label}:</span>
      <span className="font-semibold text-text-primary break-all">{value}</span>
    </div>
  );
}
