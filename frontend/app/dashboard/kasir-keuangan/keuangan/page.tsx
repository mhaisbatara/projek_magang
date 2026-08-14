"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, TrendingUp, TrendingDown, Wallet2, X } from "lucide-react";
import { api } from "@/lib/api";

type KasRow = {
  id: string;
  tanggal: string;
  jenis: "masuk" | "keluar";
  kategori: string;
  keterangan: string | null;
  jumlah: number;
  email_user: string | null;
};

type Ringkasan = {
  periode: { tanggal_mulai: string; tanggal_akhir: string };
  pendapatan_kasir: number;
  kas_masuk: number;
  kas_keluar: number;
  total_pemasukan: number;
  saldo_bersih: number;
  per_metode: Record<string, number>;
  grafik_harian: { tanggal: string; pemasukan: number; pengeluaran: number }[];
};

const TABS = [
  { key: "semua", label: "Semua" },
  { key: "masuk", label: "Kas Masuk" },
  { key: "keluar", label: "Kas Keluar" },
];

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    n || 0
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "emerald" | "red" | "blue";
}) {
  const toneClass = {
    emerald: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-500",
    blue: "bg-blue-50 text-blue-600",
  }[tone];

  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className={`flex h-11 w-11 items-center justify-center rounded-full ${toneClass}`}>{icon}</div>
      <div>
        <p className="text-xs font-medium text-gray-400">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default function KeuanganPage() {
  const [tab, setTab] = useState("semua");
  const [rows, setRows] = useState<KasRow[]>([]);
  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab !== "semua") params.set("jenis", tab);
      const [kasJson, ringkasanJson] = await Promise.all([
        api.get(`/keuangan/buku-kas?${params.toString()}`),
        api.get(`/keuangan/ringkasan`),
      ]);
      if (kasJson.success) setRows(kasJson.data);
      if (ringkasanJson.success) setRingkasan(ringkasanJson.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Kasir & Keuangan</p>
      <h1 className="mt-1 text-3xl font-bold text-gray-900">Keuangan</h1>
      <p className="mt-2 text-gray-500">Ringkasan pemasukan, pengeluaran, dan buku kas klinik.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Total Pemasukan (7 hari)"
          value={formatRupiah(ringkasan?.total_pemasukan || 0)}
          icon={<TrendingUp size={20} />}
          tone="emerald"
        />
        <SummaryCard
          label="Total Pengeluaran (7 hari)"
          value={formatRupiah(ringkasan?.kas_keluar || 0)}
          icon={<TrendingDown size={20} />}
          tone="red"
        />
        <SummaryCard
          label="Saldo Bersih"
          value={formatRupiah(ringkasan?.saldo_bersih || 0)}
          icon={<Wallet2 size={20} />}
          tone="blue"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                tab === t.key
                  ? "bg-emerald-600 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Plus size={16} />
          Catat Transaksi
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500">
              <th className="px-6 py-4">Tanggal</th>
              <th className="px-6 py-4">Jenis</th>
              <th className="px-6 py-4">Kategori</th>
              <th className="px-6 py-4">Keterangan</th>
              <th className="px-6 py-4 text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                  Memuat data...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                  Belum ada transaksi kas untuk filter ini.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-6 py-4 text-gray-600">{row.tanggal}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        row.jenis === "masuk"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-red-50 text-red-600 border border-red-200"
                      }`}
                    >
                      {row.jenis}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{row.kategori}</td>
                  <td className="px-6 py-4 text-gray-500">{row.keterangan || "-"}</td>
                  <td
                    className={`px-6 py-4 text-right font-semibold ${
                      row.jenis === "masuk" ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {row.jenis === "masuk" ? "+" : "-"} {formatRupiah(row.jumlah)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <FormTransaksi
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function FormTransaksi({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [jenis, setJenis] = useState<"masuk" | "keluar">("keluar");
  const [kategori, setKategori] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kategori.trim()) {
      setError("Kategori wajib diisi");
      return;
    }
    if (!jumlah || Number(jumlah) <= 0) {
      setError("Jumlah tidak valid");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const json = await api.post("/keuangan/buku-kas", {
        tanggal,
        jenis,
        kategori,
        keterangan,
        jumlah: Number(jumlah),
        email_user: "superadmin@klinik.com",
      });
      if (json.success) {
        onSaved();
      } else {
        setError(json.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan transaksi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="font-bold text-gray-800">Catat Transaksi Kas</h3>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-1 rounded-md bg-gray-100 p-1">
            {(["keluar", "masuk"] as const).map((j) => (
              <button
                type="button"
                key={j}
                onClick={() => setJenis(j)}
                className={`rounded-md py-2 text-sm font-semibold capitalize transition-colors ${
                  jenis === j ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"
                }`}
              >
                {j}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Tanggal</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Kategori</label>
            <input
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              placeholder={jenis === "keluar" ? "cth. Operasional, Gaji, Belanja Obat" : "cth. Setoran, Lain-lain"}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Keterangan</label>
            <textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Jumlah (Rp)</label>
            <input
              type="number"
              value={jumlah}
              onChange={(e) => setJumlah(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? "Menyimpan..." : "Simpan Transaksi"}
          </button>
        </form>
      </div>
    </div>
  );
}
