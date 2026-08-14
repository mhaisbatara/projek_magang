"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Receipt, X, Wallet } from "lucide-react";
import { api } from "@/lib/api";

type Tagihan = {
  id: string;
  kode_tagihan: string;
  kode_kunjungan: string | null;
  no_rm: string;
  kode_penjamin: string | null;
  total_tagihan: number;
  status_pembayaran: "belum_bayar" | "sebagian" | "lunas";
  tanggal: string;
  nama_pasien: string | null;
  nama_poli: string | null;
};

type TagihanDetail = Tagihan & {
  nik?: string;
  nama_penjamin?: string;
  items: {
    id: string;
    jenis_item: string;
    nama_item: string;
    qty: number;
    harga_satuan: number;
    subtotal: number;
  }[];
  pembayaran: {
    id: string;
    metode_pembayaran: string;
    jumlah_bayar: number;
    tanggal_bayar: string;
    email_kasir: string | null;
  }[];
  total_dibayar: number;
  sisa_tagihan: number;
};

const TABS: { key: string; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "belum_bayar", label: "Belum Bayar" },
  { key: "sebagian", label: "Sebagian" },
  { key: "lunas", label: "Lunas" },
];

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    n || 0
  );
}

function StatusBadge({ status }: { status: string }) {
  const style: Record<string, string> = {
    belum_bayar: "bg-red-50 text-red-600 border border-red-200",
    sebagian: "bg-amber-50 text-amber-600 border border-amber-200",
    lunas: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  };
  const label: Record<string, string> = {
    belum_bayar: "belum bayar",
    sebagian: "sebagian",
    lunas: "lunas",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style[status] || ""}`}>
      {label[status] || status}
    </span>
  );
}

export default function KasirPage() {
  const [tab, setTab] = useState("semua");
  const [q, setQ] = useState("");
  const [data, setData] = useState<Tagihan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TagihanDetail | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab !== "semua") params.set("status", tab);
      if (q.trim()) params.set("q", q.trim());
      const json = await api.get(`/kasir/tagihan?${params.toString()}`);
      if (json.success) setData(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tab, q]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openDetail = async (kode_tagihan: string) => {
    setModalLoading(true);
    try {
      const json = await api.get(`/kasir/tagihan/${kode_tagihan}`);
      if (json.success) setSelected(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Kasir & Keuangan</p>
      <h1 className="mt-1 text-3xl font-bold text-gray-900">Kasir</h1>
      <p className="mt-2 text-gray-500">Kelola tagihan pasien dan proses pembayaran.</p>

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

        <div className="relative w-full max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari kode tagihan / nama pasien..."
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500">
              <th className="px-6 py-4">Kode Tagihan</th>
              <th className="px-6 py-4">Pasien</th>
              <th className="px-6 py-4">Poli</th>
              <th className="px-6 py-4">Tanggal</th>
              <th className="px-6 py-4">Total</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                  Memuat data...
                </td>
              </tr>
            )}
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                  Belum ada tagihan untuk status ini.
                </td>
              </tr>
            )}
            {!loading &&
              data.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-6 py-4 font-semibold text-gray-800">{row.kode_tagihan}</td>
                  <td className="px-6 py-4 text-gray-700">
                    {row.nama_pasien || "-"}
                    <div className="text-xs text-gray-400">{row.no_rm}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{row.nama_poli || "-"}</td>
                  <td className="px-6 py-4 text-gray-600">{row.tanggal}</td>
                  <td className="px-6 py-4 font-semibold text-gray-800">{formatRupiah(row.total_tagihan)}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={row.status_pembayaran} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    {row.status_pembayaran === "lunas" ? (
                      <button
                        onClick={() => openDetail(row.kode_tagihan)}
                        className="text-sm font-semibold text-emerald-700 hover:underline"
                      >
                        Lihat Detail
                      </button>
                    ) : (
                      <button
                        onClick={() => openDetail(row.kode_tagihan)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        <Wallet size={14} />
                        Bayar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {(selected || modalLoading) && (
        <DetailModal
          data={selected}
          loading={modalLoading}
          onClose={() => setSelected(null)}
          onPaid={() => {
            setSelected(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function DetailModal({
  data,
  loading,
  onClose,
  onPaid,
}: {
  data: TagihanDetail | null;
  loading: boolean;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [metode, setMetode] = useState("tunai");
  const [jumlah, setJumlah] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (data) setJumlah(String(data.sisa_tagihan || 0));
  }, [data]);

  const handleBayar = async () => {
    if (!data) return;
    if (!jumlah || Number(jumlah) <= 0) {
      setError("Jumlah bayar tidak valid");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const json = await api.post(`/kasir/tagihan/${data.kode_tagihan}/bayar`, {
        metode_pembayaran: metode,
        jumlah_bayar: Number(jumlah),
        email_kasir: "superadmin@klinik.com",
      });
      if (json.success) {
        onPaid();
      } else {
        setError(json.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses pembayaran");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-emerald-600" />
            <h3 className="font-bold text-gray-800">Detail Tagihan</h3>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
          {loading || !data ? (
            <p className="py-10 text-center text-sm text-gray-400">Memuat detail...</p>
          ) : (
            <div className="flex flex-col gap-4 text-sm">
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-4">
                <p>
                  <span className="text-gray-400">Kode Tagihan</span>
                  <br />
                  <span className="font-semibold text-gray-800">{data.kode_tagihan}</span>
                </p>
                <p>
                  <span className="text-gray-400">Pasien</span>
                  <br />
                  <span className="font-semibold text-gray-800">{data.nama_pasien || "-"}</span>
                </p>
                <p>
                  <span className="text-gray-400">Penjamin</span>
                  <br />
                  <span className="font-semibold text-gray-800">{data.nama_penjamin || "-"}</span>
                </p>
                <p>
                  <span className="text-gray-400">Tanggal</span>
                  <br />
                  <span className="font-semibold text-gray-800">{data.tanggal}</span>
                </p>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Rincian Biaya</h4>
                <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                  {data.items.length === 0 && (
                    <p className="px-3 py-3 text-gray-400">Tidak ada rincian item.</p>
                  )}
                  {data.items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between px-3 py-2">
                      <div>
                        <p className="font-medium text-gray-800">{it.nama_item}</p>
                        <p className="text-xs text-gray-400">
                          {it.qty} x {formatRupiah(it.harga_satuan)} · {it.jenis_item}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-800">{formatRupiah(it.subtotal)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-base">
                <span className="font-semibold text-gray-600">Total Tagihan</span>
                <span className="font-bold text-gray-900">{formatRupiah(data.total_tagihan)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Sudah Dibayar</span>
                <span className="font-semibold text-emerald-600">{formatRupiah(data.total_dibayar)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Sisa Tagihan</span>
                <span className="font-semibold text-red-500">{formatRupiah(data.sisa_tagihan)}</span>
              </div>

              {data.status_pembayaran !== "lunas" ? (
                <div className="mt-2 flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Proses Pembayaran</h4>
                  {error && <p className="text-xs font-medium text-red-600">{error}</p>}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">Metode</label>
                      <select
                        value={metode}
                        onChange={(e) => setMetode(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="tunai">Tunai</option>
                        <option value="qris">QRIS</option>
                        <option value="transfer">Transfer</option>
                        <option value="bpjs">BPJS</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">Jumlah Bayar</label>
                      <input
                        type="number"
                        value={jumlah}
                        onChange={(e) => setJumlah(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleBayar}
                    disabled={submitting}
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {submitting ? "Memproses..." : "Konfirmasi Pembayaran"}
                  </button>
                </div>
              ) : (
                <div className="mt-2">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Riwayat Pembayaran</h4>
                  <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                    {data.pembayaran.map((p) => (
                      <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium capitalize text-gray-800">{p.metode_pembayaran}</p>
                          <p className="text-xs text-gray-400">{p.tanggal_bayar}</p>
                        </div>
                        <p className="font-semibold text-emerald-600">{formatRupiah(p.jumlah_bayar)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
