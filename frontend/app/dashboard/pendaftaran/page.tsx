"use client";

import { useState } from "react";
import FormPasienBaru from "@/components/pendaftaran/FormPasienBaru";
import FormPasienLama from "@/components/pendaftaran/FormPasienLama";

export default function PendaftaranPage() {
  const [tab, setTab] = useState<"baru" | "lama">("baru");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Pendaftaran Pasien</h1>
        <p className="text-sm text-gray-500">
          Pilih jenis pendaftaran: pasien baru atau pasien lama
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab("baru")}
          className={`px-4 py-2 text-sm font-medium ${
            tab === "baru"
              ? "border-b-2 border-emerald-500 text-emerald-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Pasien Baru
        </button>
        <button
          onClick={() => setTab("lama")}
          className={`px-4 py-2 text-sm font-medium ${
            tab === "lama"
              ? "border-b-2 border-emerald-500 text-emerald-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Pasien Lama
        </button>
      </div>

      {tab === "baru" ? <FormPasienBaru /> : <FormPasienLama />}
    </div>
  );
}