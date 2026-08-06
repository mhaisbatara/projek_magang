import { useState, useMemo, useEffect } from "react";
import { Printer, AlertCircle, Search, UserCheck, X, Phone, MapPin, Calendar, IdCard, Stethoscope } from "lucide-react";
import Topbar from "../components/Topbar";
import api from "../services/api";


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

  const poliLabel = poli === poliOptions[0] ? "Poli Umum" : poli;
  const tanggal = useMemo(() => todayLabel(), []);

  // Fetch poliklinik list from database
  useEffect(() => {
    async function loadPoli() {
      try {
        const { data } = await api.get("/pendaftaran/poli");
        if (data && data.length > 0) {
          const list = ["Pilih Poliklinik", ...data.map(p => p.nama_poli)];
          setPoliOptions(list);
          setPoli(list[0]);
        }
      } catch (err) {
        console.error("Gagal memuat poli:", err);
      }
    }
    loadPoli();
  }, []);

  const inputBase =
    "w-full rounded-lg border border-[--border] bg-[--surface-2] px-3.5 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent";
  const labelBase = "block text-sm text-[--text-secondary] mb-1.5";

  // nama pasien untuk preview (baru / lama)
  const namaPreview = tab === "lama" ? pasienTerpilih?.nama || "-" : nama || "-";
  const noRmPreview = tab === "lama" ? pasienTerpilih?.no_rm : hasil?.no_rm;
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
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Terjadi kesalahan, coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  const bisaSubmit = tab === "baru" ? true : !!pasienTerpilih;

  return (
    <div className="flex flex-col h-full bg-[--surface-0] text-[--text-primary] overflow-hidden">
      <Topbar />

      <main className="flex-1 px-6 py-6 w-full overflow-y-auto">
        <h1 className="text-2xl font-medium">Pendaftaran Pasien</h1>
        <p className="mt-1 text-sm text-[--text-secondary]">
          Registrasi antrean untuk pelayanan poliklinik.
        </p>

        {hasil && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <UserCheck size={16} />
            <span>
              Pasien <strong>{hasil.nama || ""}</strong> terdaftar dengan No. RM{" "}
              <strong>{hasil.no_rm}</strong>.
            </span>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
          {/* Left column */}
          <div className="flex flex-col gap-5">
            {/* Data pribadi card */}
            <div className="rounded-xl border border-[--border] bg-[--surface-2] p-5">
              <div className="inline-flex rounded-lg bg-[--surface-1] p-1 text-sm">
                <button
                  onClick={() => gantiTab("baru")}
                  className={
                    "px-4 py-1.5 rounded-md font-medium transition-colors " +
                    (tab === "baru"
                      ? "bg-[--surface-2] text-blue-600 shadow-sm"
                      : "text-[--text-secondary]")
                  }
                >
                  Pasien Baru
                </button>
                <button
                  onClick={() => gantiTab("lama")}
                  className={
                    "px-4 py-1.5 rounded-md font-medium transition-colors " +
                    (tab === "lama"
                      ? "bg-[--surface-2] text-blue-600 shadow-sm"
                      : "text-[--text-secondary]")
                  }
                >
                  Pasien Lama
                </button>
              </div>

              {tab === "baru" ? (
                <>
                  <h2 className="mt-5 text-lg font-medium">Data Pribadi</h2>
                  <div className="mt-2 border-b border-[--border]" />

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
                  <h2 className="mt-5 text-lg font-medium">Cari Pasien Terdaftar</h2>
                  <div className="mt-2 border-b border-[--border]" />
                  <p className="mt-3 text-sm text-[--text-secondary]">
                    Cari berdasarkan NIK, No. Rekam Medis, atau Nama pasien.
                  </p>

                  {/* search box */}
                  <div className="relative mt-4">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-muted]" />
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-muted] hover:text-[--text-primary]"
                        aria-label="Hapus pencarian"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {/* hasil pencarian / pasien terpilih */}
                  {pasienTerpilih ? (
                    <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/60 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                          <UserCheck size={16} />
                          Pasien Terpilih
                        </div>
                        <button
                          type="button"
                          onClick={() => setPasienTerpilih(null)}
                          className="text-[--text-muted] hover:text-red-500"
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
                        <div className="text-sm text-[--text-secondary] py-6 text-center">
                          Mencari pasien...
                        </div>
                      ) : hasilCari.length > 0 ? (
                        hasilCari.map((p) => (
                          <button
                            key={p.id_pasien}
                            type="button"
                            onClick={() => setPasienTerpilih(p)}
                            className="flex items-center justify-between rounded-lg border border-[--border] bg-[--surface-2] px-4 py-3 text-left hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-[--text-primary]">{p.nama}</span>
                              <span className="text-xs text-[--text-secondary]">
                                No. RM {p.no_rm} • NIK {p.nik}
                              </span>
                            </div>
                            <span className="text-xs text-[--text-secondary]">
                              {p.jk === "L" ? "L" : p.jk === "P" ? "P" : "-"} • {hitungUmur(p.tgl_lahir)}
                            </span>
                          </button>
                        ))
                      ) : sudahCari ? (
                        <div className="text-sm text-[--text-secondary] py-6 text-center rounded-lg border border-dashed border-[--border]">
                          Tidak ada pasien ditemukan untuk “{query}”.
                        </div>
                      ) : (
                        <div className="text-sm text-[--text-muted] py-6 text-center rounded-lg border border-dashed border-[--border]">
                          Ketik minimal 2 karakter untuk mulai mencari.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Informasi layanan card */}
            <div className="rounded-xl border border-[--border] bg-[--surface-2] p-5">
              <h2 className="text-lg font-medium">Informasi Layanan</h2>
              <div className="mt-2 border-b border-[--border]" />

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
                <div />

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
          <div className="rounded-xl border border-[--border] bg-[--surface-2] overflow-hidden lg:sticky lg:top-6">
            <div className="bg-blue-50 px-5 pt-5 pb-6 text-center">
              <span className="inline-block rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white">
                Pratinjau Antrean
              </span>
              <div className="mt-4 text-sm text-[--text-secondary]">Nomor Antrean Anda</div>
              <div className="mt-1 text-3xl font-medium text-blue-600">
                {ticketQueueNumber}
              </div>
              <div className="mt-1 text-sm text-[--text-secondary]">{poliLabel}</div>
            </div>

            <div className="px-5 py-4 flex flex-col gap-3 text-sm">
              <Row label="Tanggal" value={tanggal} />
              <Row label="Nama Pasien" value={namaPreview} />
              <Row label="Penjamin" value={penjamin.split(" / ")[0]} />
            </div>

            <div className="px-5 pb-3 pt-1 text-center text-sm text-[--text-secondary]">
              Mohon tunggu panggilan di ruang tunggu poli.
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={tab === "baru" ? handleDaftarBaru : handleDaftarLama}
                disabled={submitting || !bisaSubmit}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                <Printer size={16} />
                {submitting ? "Menyimpan..." : "Daftar & Cetak Antrean"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-[--border] pb-3 last:border-0 last:pb-0">
      <span className="text-[--text-secondary]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={15} className="text-[--text-secondary] shrink-0" />
      <span className="text-[--text-secondary]">{label}:</span>
      <span className="font-medium text-[--text-primary] break-all">{value}</span>
    </div>
  );
}
