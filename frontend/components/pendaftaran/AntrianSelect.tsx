"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

type AntrianOption = { kode_antrian: string; no_antrian: string };

export default function AntrianSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [options, setOptions] = useState<AntrianOption[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/antrian-awal/terpakai`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setOptions(json.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Nomor Antrian <span className="text-red-500">*</span>
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
      >
        <option value="">-- Pilih nomor antrian --</option>
        {options.map((opt) => (
          <option key={opt.kode_antrian} value={opt.kode_antrian}>
            {opt.no_antrian} ({opt.kode_antrian})
          </option>
        ))}
      </select>
      {options.length === 0 && (
        <p className="mt-1 text-xs text-amber-600">
          Belum ada nomor antrian yang dipanggil. Panggil dulu di halaman Antrian Awal.
        </p>
      )}
    </div>
  );
}