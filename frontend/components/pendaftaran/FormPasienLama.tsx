"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { api } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

type PasienResult = {
  no_rm: string;
  nik: string;
  nama_pasien: string;
  tanggal_lahir: string | null;
  jenis_kelamin: string | null;
  no_hp: string | null;
  kode_penjamin: string | null;
};

export default function FormPasienLama() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PasienResult[]>([]);
  const [selected, setSelected] = useState<PasienResult | null>(null);
  const [kodePoli, setKodePoli] = useState("");
  const [kodePenjamin, setKodePenjamin] = useState("");
  const [polis, setPolis] = useState<{ kode_poli: string; nama_poli: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  useEffect(() => {
    const fetchPolis = async () => {
      try {
        const json = await api.get("/pasien/poli");
        if (json.success) {
          setPolis(json.data);
        }
      } catch (err) {
        console.error("Gagal mengambil daftar poli", err);
      }
    };
    fetchPolis();
  }, []);

  const handleSearch = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    try {
      const json = await api.get(`/pasien/search?q=${encodeURIComponent(query)}`);
      if (json.success) setResults(json.data);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Tidak dapat terhubung ke server",
      });
    } finally {
      setSearching(false);
    }
  };

  const pilihPasien = (p: PasienResult) => {
    setSelected(p);
    setKodePenjamin(p.kode_penjamin || "");
    setResults([]);
    setQuery(`${p.nama_pasien} (${p.no_rm})`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      setMessage({ type: "error", text: "Pilih data pasien terlebih dahulu" });
      return;
    }
    if (!kodePoli) {
      setMessage({ type: "error", text: "Pilih poli tujuan terlebih dahulu" });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const json = await api.post("/pasien/lama", {
        no_rm: selected.no_rm,
        kode_poli: kodePoli,
        kode_penjamin: kodePenjamin,
      });
      if (json.success) {
        setMessage({
          type: "success",
          text: `Kunjungan pasien lama berhasil didaftarkan. Antrian Poli: ${json.data.transaction.no_antrian}`,
        });
        setSelected(null);
        setQuery("");
        setKodePoli("");
        setKodePenjamin("");
      } else {
        setMessage({ type: "error", text: json.message });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Tidak dapat terhubung ke server",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm text-gray-800">
      {message && (
        <div
          className={`rounded-md px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-600 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
          Cari Pasien (No. RM / NIK / Nama)
        </label>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Masukkan No. RM, NIK, atau nama pasien..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none bg-white text-gray-800"
          />
          <button
            type="button"
            onClick={handleSearch}
            className="flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200 text-gray-800"
          >
            <Search size={16} />
            {searching ? "Mencari..." : "Cari"}
          </button>
        </div>

        {results.length > 0 && (
          <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-gray-200 shadow-inner bg-white">
            {results.map((p) => (
              <button
                key={p.no_rm}
                type="button"
                onClick={() => pilihPasien(p)}
                className="flex w-full flex-col items-start border-b border-gray-100 px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-emerald-50/50 bg-white text-gray-800 transition-colors"
              >
                <span className="font-semibold text-gray-800">{p.nama_pasien}</span>
                <span className="text-xs text-gray-400 mt-0.5">
                  No. RM: {p.no_rm} · NIK: {p.nik}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl bg-gray-50 border border-gray-100 p-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
            Data Pasien Terpilih
          </h4>
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 border-b border-gray-200/60 pb-4 text-gray-800">
            <p>
              <span className="text-gray-400 font-medium">No. RM:</span>{" "}
              <span className="font-semibold text-gray-800">{selected.no_rm}</span>
            </p>
            <p>
              <span className="text-gray-400 font-medium">NIK:</span>{" "}
              <span className="font-semibold text-gray-800">{selected.nik}</span>
            </p>
            <p>
              <span className="text-gray-400 font-medium">Nama:</span>{" "}
              <span className="font-semibold text-gray-800">{selected.nama_pasien}</span>
            </p>
            <p>
              <span className="text-gray-400 font-medium">Jenis Kelamin:</span>{" "}
              <span className="font-semibold text-gray-800">
                {selected.jenis_kelamin === "L" ? "Laki-laki" : selected.jenis_kelamin === "P" ? "Perempuan" : "-"}
              </span>
            </p>
            <p>
              <span className="text-gray-400 font-medium">Tanggal Lahir:</span>{" "}
              <span className="font-semibold text-gray-800">{selected.tanggal_lahir || "-"}</span>
            </p>
            <p>
              <span className="text-gray-400 font-medium">No. HP:</span>{" "}
              <span className="font-semibold text-gray-800">{selected.no_hp || "-"}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Dropdown Pilihan Poli */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Poli Tujuan <span className="text-red-500">*</span>
              </label>
              <select
                value={kodePoli}
                onChange={(e) => setKodePoli(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none bg-white text-gray-800 font-medium"
              >
                <option value="">-- Pilih Poli --</option>
                {polis.map((p) => (
                  <option key={p.kode_poli} value={p.kode_poli}>
                    {p.nama_poli} ({p.kode_poli})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Kode Penjamin
              </label>
              <input
                value={kodePenjamin}
                onChange={(e) => setKodePenjamin(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none bg-white text-gray-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="self-start mt-2 rounded-md bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
          >
            {submitting ? "Menyimpan..." : "Daftarkan Kunjungan"}
          </button>
        </form>
      )}
    </div>
  );
}