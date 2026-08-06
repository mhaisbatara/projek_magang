import { useState, useMemo } from "react";
import {
  Search,
  Bell,
  HelpCircle,
  LayoutDashboard,
  Users,
  Microscope,
  Wallet,
  Archive,
  BarChart3,
  Settings,
  Printer,
  Plus,
  AlertCircle,
} from "lucide-react";

const API_BASE = "http://localhost:5000/api";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Pelayanan & Antrean", icon: Users, active: true },
  { label: "Pelayanan Medis", icon: Plus },
  { label: "Penunjang Medis", icon: Microscope },
  { label: "Kasir & Keuangan", icon: Wallet },
  { label: "Logistik & Operasional", icon: Archive },
  { label: "Sistem & Pelaporan", icon: BarChart3 },
];

const POLI_OPTIONS = [
  "Pilih Poliklinik",
  "Poli Umum",
  "Poli Gigi",
  "Poli Anak",
  "Poli Kandungan",
  "Poli Mata",
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

export default function PendaftaranPasien() {
  const [tab, setTab] = useState("baru");
  const [nama, setNama] = useState("");
  const [nik, setNik] = useState("");
  const [tglLahir, setTglLahir] = useState("");
  const [gender, setGender] = useState("");
  const [telepon, setTelepon] = useState("");
  const [alamat, setAlamat] = useState("");
  const [penjamin, setPenjamin] = useState(PENJAMIN_OPTIONS[0]);
  const [poli, setPoli] = useState(POLI_OPTIONS[0]);
  const [dokter, setDokter] = useState("Tanpa Preferensi (Otomatis)");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [hasil, setHasil] = useState(null); // { no_rm, id_pasien } setelah sukses

  const poliLabel = poli === POLI_OPTIONS[0] ? "Poli Umum" : poli;
  const tanggal = useMemo(() => todayLabel(), []);

  const inputBase =
    "w-full rounded-lg border border-[--border] bg-[--surface-2] px-3.5 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent";
  const labelBase = "block text-sm text-[--text-secondary] mb-1.5";

  function resetForm() {
    setNama("");
    setNik("");
    setTglLahir("");
    setGender("");
    setTelepon("");
    setAlamat("");
    setPenjamin(PENJAMIN_OPTIONS[0]);
    setPoli(POLI_OPTIONS[0]);
    setDokter("Tanpa Preferensi (Otomatis)");
  }

  async function handleDaftar() {
    setError(null);

    if (!nik || nik.length !== 16) {
      setError("NIK harus diisi 16 digit.");
      return;
    }
    if (!nama.trim()) {
      setError("Nama lengkap wajib diisi.");
      return;
    }
    if (!tglLahir) {
      setError("Tanggal lahir wajib diisi.");
      return;
    }
    if (!gender) {
      setError("Jenis kelamin wajib dipilih.");
      return;
    }
    if (poli === POLI_OPTIONS[0]) {
      setError("Poli tujuan wajib dipilih.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/pasien`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nik,
          nama: nama.trim(),
          tgl_lahir: tglLahir,
          jk: gender,
          alamat,
          telepon,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Gagal mendaftarkan pasien.");
      }

      setHasil(data.data);
      resetForm();
    } catch (err) {
      setError(err.message || "Terjadi kesalahan, coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-[--surface-0] text-[--text-primary]">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col justify-between border-r border-[--border] bg-[--surface-2] py-5">
        <div>
          <div className="flex items-center gap-2 px-5 pb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[--border] text-blue-600">
              <Plus size={18} />
            </div>
            <div>
              <div className="text-lg font-medium leading-tight text-blue-600">SAKK Clinical</div>
              <div className="text-xs text-[--text-muted] leading-tight">Management System</div>
            </div>
          </div>

          <nav className="flex flex-col gap-1 px-3">
            {NAV_ITEMS.map(({ label, icon: Icon, active }) => (
              <button
                key={label}
                className={
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-left transition-colors " +
                  (active
                    ? "bg-teal-100 text-teal-900 font-medium"
                    : "text-[--text-secondary] hover:bg-[--surface-1]")
                }
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-1 px-3">
          <button className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[--text-secondary] hover:bg-[--surface-1]">
            <Settings size={18} />
            Pengaturan
          </button>
          <button className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[--text-secondary] hover:bg-[--surface-1]">
            <HelpCircle size={18} />
            Bantuan
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="flex items-center gap-4 border-b border-[--border] bg-[--surface-2] px-6 py-3">
          <div className="md:hidden text-lg font-medium text-blue-600">SAKK</div>
          <div className="flex-1 max-w-xl">
            <div className="flex items-center gap-2 rounded-full border border-[--border] bg-[--surface-1] px-4 py-2">
              <Search size={16} className="text-[--text-muted]" />
              <input
                placeholder="Pencarian Global SAKK..."
                className="w-full bg-transparent text-sm placeholder:text-[--text-muted] focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <Bell size={20} className="text-[--text-secondary]" />
            <HelpCircle size={20} className="text-[--text-secondary]" />
            <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-800">
              A
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-6 py-6 max-w-7xl">
          <h1 className="text-2xl font-medium">Pendaftaran Pasien</h1>
          <p className="mt-1 text-sm text-[--text-secondary]">
            Registrasi antrean untuk pelayanan poliklinik.
          </p>

          {hasil && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Pasien berhasil didaftarkan dengan No. RM <strong>{hasil.no_rm}</strong>.
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
                    onClick={() => setTab("baru")}
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
                    onClick={() => setTab("lama")}
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
                      {POLI_OPTIONS.map((o) => (
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
                  {hasil ? hasil.no_rm : "A-000"}
                </div>
                <div className="mt-1 text-sm text-[--text-secondary]">{poliLabel}</div>
              </div>

              <div className="px-5 py-4 flex flex-col gap-3 text-sm">
                <Row label="Tanggal" value={tanggal} />
                <Row label="Nama Pasien" value={nama || "-"} />
                <Row label="Penjamin" value={penjamin.split(" / ")[0]} />
              </div>

              <div className="px-5 pb-3 pt-1 text-center text-sm text-[--text-secondary]">
                Mohon tunggu panggilan di ruang tunggu poli.
              </div>

              <div className="px-5 pb-5">
                <button
                  onClick={handleDaftar}
                  disabled={submitting}
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