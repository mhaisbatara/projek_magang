"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

const initialForm = {
  kode_poli: "",
  nik: "",
  nama_pasien: "",
  nama_ibu_kandung: "",
  tanggal_lahir: "",
  tempat_lahir: "",
  jenis_kelamin: "",
  email: "",
  golongan_darah: "",
  agama: "",
  status_perkawinan: "",
  pekerjaan: "",
  pendidikan: "",
  kewarganegaraan: "WNI",
  provinsi: "",
  kota_kabupaten: "",
  kecamatan: "",
  kelurahan: "",
  detail_alamat: "",
  kode_pos: "",
  no_hp: "",
  kode_penjamin: "",
};

const agamaOptions = ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Khonghucu", "Lainnya"];
const statusPerkawinanOptions = ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"];
const kewarganegaraanOptions = ["WNI", "WNA"];
const golonganDarahOptions = ["A", "B", "AB", "O", "-"];

const pendidikanOptions = [
  "Tidak Sekolah",
  "SD / Sederajat",
  "SMP / Sederajat",
  "SMA / SMK / Sederajat",
  "D1 / D2 / D3",
  "D4 / S1",
  "S2",
  "S3",
];

const pekerjaanOptions = [
  "Tidak Bekerja",
  "Ibu Rumah Tangga",
  "PNS",
  "TNI / Polri",
  "Karyawan Swasta",
  "Wiraswasta",
  "Buruh Harian Lepas",
  "Petani / Nelayan",
  "Pelajar / Mahasiswa",
  "Pensiunan",
  "Lainnya",
];

const wilayahData: Record<string, Record<string, Record<string, string[]>>> = {
  "DKI Jakarta": {
    "Jakarta Selatan": {
      "Kebayoran Baru": ["Selong", "Kramat Pela", "Gandaria Utara", "Melawai", "Petogogan", "Pulo", "Cipete Utara"],
      "Kebayoran Lama": ["Kebayoran Lama Utara", "Kebayoran Lama Selatan", "Pondok Pinang", "Cipulir", "Grogol Utara"],
      "Cilandak": ["Cilandak Barat", "Lebak Bulus", "Pondok Labu", "Gandaria Selatan", "Cipete Selatan"],
      "Pasar Minggu": ["Pasar Minggu", "Pejaten Barat", "Pejaten Timur", "Ragunan", "Cilandak Timur"],
      "Tebet": ["Tebet Barat", "Tebet Timur", "Menteng Dalam", "Manggarai", "Kebon Baru"]
    },
    "Jakarta Pusat": {
      "Gambir": ["Gambir", "Kebon Kelapa", "Petojo Utara", "Petojo Selatan", "Duri Pulo", "Cideng"],
      "Menteng": ["Menteng", "Pegangsaan", "Cikini", "Gondangdia", "Kebon Sirih"],
      "Sawah Besar": ["Pasar Baru", "Gunung Sahari Utara", "Mangga Dua Selatan", "Karang Anyar"],
      "Kemayoran": ["Kemayoran", "Gunung Sahari Selatan", "Kemayoran Gempol", "Harapan Mulya"],
      "Tanah Abang": ["Kampung Bali", "Kebon Kacang", "Kebon Melati", "Petamburan", "Bendungan Hilir"]
    },
    "Jakarta Timur": {
      "Jatinegara": ["Bali Mester", "Kampung Melayu", "Bidara Cina", "Cipinang Cempedak", "Rawa Bunga"],
      "Duren Sawit": ["Duren Sawit", "Pondok Bambu", "Pondok Kelapa", "Klender", "Malaka Jaya"]
    }
  },
  "Jawa Barat": {
    "Bandung": {
      "Coblong": ["Dago", "Lebak Siliwangi", "Lebakgede", "Sadangserang", "Sekeloa"],
      "Lengkong": ["Burangrang", "Cikawao", "Cijagra", "Turangga", "Malabar"],
      "Regol": ["Balonggede", "Ciseureuh", "Pasirluyu", "Pungkur", "Ancol"]
    },
    "Bekasi": {
      "Bekasi Barat": ["Bintara", "Bintara Jaya", "Jakasampurna", "Kranji"],
      "Bekasi Selatan": ["Jakamulya", "Jakasetia", "Kayuringin Jaya", "Pekayon Jaya"],
      "Bekasi Timur": ["Aren Jaya", "Bekasi Jaya", "Duren Jaya", "Margahayu"]
    },
    "Depok": {
      "Beji": ["Beji", "Beji Timur", "Kemiri Muka", "Pondok Cina", "Tanah Baru"],
      "Pancoran Mas": ["Depok", "Depok Jaya", "Mampang", "Pancoran Mas", "Rangkapan Jaya"]
    }
  },
  "Banten": {
    "Tangerang": {
      "Tangerang": ["Sukasari", "Sukajadi", "Babakan", "Buaran Indah", "Cikokol"],
      "Karawaci": ["Karawaci", "Boone", "Cimone", "Pabuaran", "Sumur Pacing", "Nusa Jaya"],
      "Cipondoh": ["Cipondoh", "Cipondoh Indah", "Poris Plawad", "Ketapang", "Gondrong"]
    },
    "Tangerang Selatan": {
      "Serpong": ["Serpong", "Buaran", "Ciater", "Cilenggang", "Lengkong Gudang", "Lengkong Wetan"],
      "Pamulang": ["Pamulang Barat", "Pamulang Timur", "Benda Baru", "Pondok Benda", "Pondok Cabe"],
      "Pondok Aren": ["Pondok Aren", "Jurang Mangu", "Pondok Betung", "Pondok Jaya", "Pondok Kacang"]
    }
  }
};

export default function FormPasienBaru() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [polis, setPolis] = useState<{ kode_poli: string; nama_poli: string }[]>([]);
  const [useTextRegion, setUseTextRegion] = useState(false);
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleProvinsiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "Lainnya") {
      setUseTextRegion(true);
      setForm((prev) => ({
        ...prev,
        provinsi: "",
        kota_kabupaten: "",
        kecamatan: "",
        kelurahan: "",
      }));
    } else {
      setUseTextRegion(false);
      setForm((prev) => ({
        ...prev,
        provinsi: val,
        kota_kabupaten: "",
        kecamatan: "",
        kelurahan: "",
      }));
    }
  };

  const handleKotaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({
      ...prev,
      kota_kabupaten: e.target.value,
      kecamatan: "",
      kelurahan: "",
    }));
  };

  const handleKecamatanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({
      ...prev,
      kecamatan: e.target.value,
      kelurahan: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const json = await api.post("/pasien/baru", form);
      if (json.success) {
        setMessage({
          type: "success",
          text: `Pasien baru berhasil didaftarkan. No. RM: ${json.data.patient.no_rm} (Antrian Poli: ${json.data.transaction.no_antrian})`,
        });
        setForm(initialForm);
        setUseTextRegion(false);
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

  // Wilayah selections helper variables
  const kotaOptions = form.provinsi && wilayahData[form.provinsi]
    ? Object.keys(wilayahData[form.provinsi])
    : [];

  const kecOptions = form.provinsi && form.kota_kabupaten && wilayahData[form.provinsi][form.kota_kabupaten]
    ? Object.keys(wilayahData[form.provinsi][form.kota_kabupaten])
    : [];

  const kelOptions = form.provinsi && form.kota_kabupaten && form.kecamatan && wilayahData[form.provinsi][form.kota_kabupaten][form.kecamatan]
    ? wilayahData[form.provinsi][form.kota_kabupaten][form.kecamatan]
    : [];

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm text-gray-800"
    >
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

      {/* Pilihan Poli */}
      <div className="max-w-md">
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
          Poli Tujuan <span className="text-red-500">*</span>
        </label>
        <select
          name="kode_poli"
          value={form.kode_poli}
          onChange={handleChange}
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

      <div className="border-t border-gray-100 my-1" />

      {/* Grid Formulir 24 Kolom */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="NIK" name="nik" value={form.nik} onChange={handleChange} required />
        <Field
          label="Nama Pasien"
          name="nama_pasien"
          value={form.nama_pasien}
          onChange={handleChange}
          required
        />
        <Field
          label="Nama Ibu Kandung"
          name="nama_ibu_kandung"
          value={form.nama_ibu_kandung}
          onChange={handleChange}
        />
        <Field
          label="Tanggal Lahir"
          name="tanggal_lahir"
          type="date"
          value={form.tanggal_lahir}
          onChange={handleChange}
        />
        <Field
          label="Tempat Lahir"
          name="tempat_lahir"
          value={form.tempat_lahir}
          onChange={handleChange}
        />
        <SelectField
          label="Jenis Kelamin"
          name="jenis_kelamin"
          value={form.jenis_kelamin}
          onChange={handleChange}
          options={[
            { value: "L", label: "Laki-laki" },
            { value: "P", label: "Perempuan" },
          ]}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
        />
        <SelectField
          label="Golongan Darah"
          name="golongan_darah"
          value={form.golongan_darah}
          onChange={handleChange}
          options={golonganDarahOptions.map((v) => ({ value: v, label: v }))}
        />
        <SelectField
          label="Agama"
          name="agama"
          value={form.agama}
          onChange={handleChange}
          options={agamaOptions.map((v) => ({ value: v, label: v }))}
        />
        <SelectField
          label="Status Perkawinan"
          name="status_perkawinan"
          value={form.status_perkawinan}
          onChange={handleChange}
          options={statusPerkawinanOptions.map((v) => ({ value: v, label: v }))}
        />
        <SelectField
          label="Pekerjaan"
          name="pekerjaan"
          value={form.pekerjaan}
          onChange={handleChange}
          options={pekerjaanOptions.map((v) => ({ value: v, label: v }))}
        />
        <SelectField
          label="Pendidikan"
          name="pendidikan"
          value={form.pendidikan}
          onChange={handleChange}
          options={pendidikanOptions.map((v) => ({ value: v, label: v }))}
        />
        <SelectField
          label="Kewarganegaraan"
          name="kewarganegaraan"
          value={form.kewarganegaraan}
          onChange={handleChange}
          options={kewarganegaraanOptions.map((v) => ({ value: v, label: v }))}
        />

        {/* PROVINSI */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Provinsi</label>
          <select
            name="provinsi"
            value={useTextRegion ? "Lainnya" : form.provinsi}
            onChange={handleProvinsiChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none bg-white text-gray-800"
          >
            <option value="">-- Pilih Provinsi --</option>
            {Object.keys(wilayahData).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            <option value="Lainnya">Lainnya (Ketik Manual)</option>
          </select>
        </div>

        {/* KOTA / KABUPATEN */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Kota / Kabupaten</label>
          {useTextRegion ? (
            <input
              type="text"
              name="kota_kabupaten"
              value={form.kota_kabupaten}
              onChange={handleChange}
              placeholder="Masukkan kota/kabupaten..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none bg-white text-gray-800"
            />
          ) : (
            <select
              name="kota_kabupaten"
              value={form.kota_kabupaten}
              onChange={handleKotaChange}
              disabled={!form.provinsi}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-gray-50 bg-white text-gray-800"
            >
              <option value="">-- Pilih Kota/Kabupaten --</option>
              {kotaOptions.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* KECAMATAN */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Kecamatan</label>
          {useTextRegion ? (
            <input
              type="text"
              name="kecamatan"
              value={form.kecamatan}
              onChange={handleChange}
              placeholder="Masukkan kecamatan..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none bg-white text-gray-800"
            />
          ) : (
            <select
              name="kecamatan"
              value={form.kecamatan}
              onChange={handleKecamatanChange}
              disabled={!form.kota_kabupaten}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-gray-50 bg-white text-gray-800"
            >
              <option value="">-- Pilih Kecamatan --</option>
              {kecOptions.map((kc) => (
                <option key={kc} value={kc}>
                  {kc}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* KELURAHAN */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Kelurahan</label>
          {useTextRegion ? (
            <input
              type="text"
              name="kelurahan"
              value={form.kelurahan}
              onChange={handleChange}
              placeholder="Masukkan kelurahan..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none bg-white text-gray-800"
            />
          ) : (
            <select
              name="kelurahan"
              value={form.kelurahan}
              onChange={handleChange}
              disabled={!form.kecamatan}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-gray-50 bg-white text-gray-800"
            >
              <option value="">-- Pilih Kelurahan --</option>
              {kelOptions.map((kl) => (
                <option key={kl} value={kl}>
                  {kl}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Text region inputs for fallback manual province */}
        {useTextRegion && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nama Provinsi</label>
            <input
              type="text"
              name="provinsi"
              value={form.provinsi}
              onChange={handleChange}
              placeholder="Ketik nama provinsi..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none bg-white text-gray-800"
            />
          </div>
        )}

        <Field label="Kode Pos" name="kode_pos" value={form.kode_pos} onChange={handleChange} />
        <Field label="No. HP" name="no_hp" value={form.no_hp} onChange={handleChange} />
        <Field
          label="Kode Penjamin"
          name="kode_penjamin"
          value={form.kode_penjamin}
          onChange={handleChange}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Detail Alamat <span className="text-red-500">*</span>
        </label>
        <textarea
          name="detail_alamat"
          value={form.detail_alamat}
          onChange={handleChange}
          required
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none bg-white text-gray-800"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-md bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-all shadow-sm active:scale-95 disabled:opacity-50"
      >
        {submitting ? "Menyimpan..." : "Daftarkan Pasien Baru"}
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  ...props
}: {
  label: string;
  name: string;
  value: string;
  required?: boolean;
  type?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        {...props}
        type={props.type || "text"}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none bg-white text-gray-800"
      />
    </div>
  );
}

function SelectField({
  label,
  options,
  ...props
}: {
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <select
        {...props}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none bg-white text-gray-800"
      >
        <option value="">-- Pilih --</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}