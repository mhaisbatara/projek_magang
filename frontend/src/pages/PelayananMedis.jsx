import { useState, useEffect } from "react";
import {
  Stethoscope,
  FileText,
  Heart,
  Plus,
  Trash2,
  Volume2,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Building2,
  History,
  Info,
  Calendar,
  User,
  Shield,
  FileSpreadsheet
} from "lucide-react";
import Topbar from "../components/Topbar";
import api from "../services/api";
import { fetchObat } from "../services/logistikService";
import "./PelayananMedis.css";

// Common ICD-10 list for quick autocomplete
const COMMON_ICD10 = [
  { code: "J06", desc: "Infeksi Saluran Pernapasan Akut (ISPA)" },
  { code: "I10", desc: "Hipertensi Esensial (Darah Tinggi)" },
  { code: "E11", desc: "Diabetes Melitus Tipe 2 (Kencing Manis)" },
  { code: "A09", desc: "Diare & Gastroenteritis (Muntaber)" },
  { code: "K30", desc: "Dispepsia (Sakit Maag)" },
  { code: "M79", desc: "Mialgia (Nyeri Otot)" },
  { code: "H81", desc: "Vertigo (Pusing Berputar)" },
  { code: "J45", desc: "Asma Bronkial" },
  { code: "L23", desc: "Dermatitis Kontak Alergi" },
  { code: "K02", desc: "Karies Gigi (Gigi Berlubang)" },
];

export default function PelayananMedis() {
  const [poliList, setPoliList] = useState([]);
  const [selectedPoli, setSelectedPoli] = useState(null);
  const [antrianList, setAntrianList] = useState([]);
  const [activePatient, setActivePatient] = useState(null);
  const [obatList, setObatList] = useState([]);
  const [riwayatList, setRiwayatList] = useState([]);
  
  // Loading & error states
  const [loadingPoli, setLoadingPoli] = useState(true);
  const [loadingAntrian, setLoadingAntrian] = useState(false);
  const [loadingRiwayat, setLoadingRiwayat] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form States
  const [subjektif, setSubjektif] = useState("");
  const [objektif, setObjektif] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [icd10Input, setIcd10Input] = useState("");
  const [selectedIcd, setSelectedIcd] = useState(null);
  const [showIcdSuggestions, setShowIcdSuggestions] = useState(false);

  // Vital Signs Form
  const [tekananDarah, setTekananDarah] = useState("");
  const [suhu, setSuhu] = useState("");
  const [nadi, setNadi] = useState("");
  const [respirasi, setRespirasi] = useState("");
  const [beratBadan, setBeratBadan] = useState("");
  const [tinggiBadan, setTinggiBadan] = useState("");

  // Prescription State
  const [resep, setResep] = useState([]);

  // Fetch initial data (Poli list & Medicines)
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        setLoadingPoli(true);
        const [poliData, obatData] = await Promise.all([
          api.get("/pendaftaran/poli").then((r) => r.data),
          fetchObat().catch(() => []) // Fallback to empty array if fail
        ]);
        
        if (isMounted) {
          setPoliList(poliData);
          setObatList(obatData);
          if (poliData.length > 0) {
            setSelectedPoli(poliData[0]);
          }
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setError("Gagal mengambil data inisialisasi.");
      } finally {
        if (isMounted) setLoadingPoli(false);
      }
    };

    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch queue when poli selection changes
  useEffect(() => {
    if (!selectedPoli) return;

    let isMounted = true;
    const fetchQueue = async () => {
      try {
        setLoadingAntrian(true);
        const { data } = await api.get(`/pendaftaran/antrian?id_poli=${selectedPoli.id_poli}`);
        if (isMounted) {
          // Filter out completed ones, keep only 'menunggu' and 'dipanggil' for examination
          const filtered = data.filter(a => a.status_panggil !== "selesai");
          setAntrianList(filtered);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoadingAntrian(false);
      }
    };

    fetchQueue();
    const interval = setInterval(fetchQueue, 10000); // Auto-refresh queue every 10s

    return () => {
      clearInterval(interval);
      isMounted = false;
    };
  }, [selectedPoli]);

  // Fetch history when active patient changes
  useEffect(() => {
    if (!activePatient) return;

    let isMounted = true;
    const fetchHistory = async () => {
      try {
        setLoadingRiwayat(true);
        const { data } = await api.get(`/medis/riwayat/${activePatient.no_rm}`);
        if (isMounted) {
          setRiwayatList(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoadingRiwayat(false);
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [activePatient]);

  // Speech synthesis queue call
  const playSpeechCall = (noAntrian, namaPoli) => {
    if ("speechSynthesis" in window) {
      const parts = noAntrian.split("-");
      let readableNo = noAntrian;
      if (parts.length === 2) {
        readableNo = `${parts[0]} ${parseInt(parts[1], 10)}`;
      }
      const text = `Nomor antrean, ${readableNo}, silakan masuk ke ruang, ${namaPoli}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Select patient & update status to 'dipanggil' if 'menunggu'
  const handleSelectPatient = async (patient) => {
    setError(null);
    setSuccessMsg(null);
    setActivePatient(patient);

    // Reset Form
    setSubjektif("");
    setObjektif("");
    setAssessment("");
    setPlan("");
    setIcd10Input("");
    setSelectedIcd(null);
    setTekananDarah("");
    setSuhu("");
    setNadi("");
    setRespirasi("");
    setBeratBadan("");
    setTinggiBadan("");
    setResep([]);
    setRiwayatList([]);

    if (patient.status_panggil === "menunggu") {
      try {
        await api.put(`/pendaftaran/antrian/${patient.id_antrian}/status`, {
          status_panggil: "dipanggil",
        });
        playSpeechCall(patient.no_antrian, patient.nama_poli);
      } catch (err) {
        console.error("Gagal mengubah status antrean:", err);
      }
    }
  };

  // Call repeat
  const handlePanggilUlang = () => {
    if (activePatient) {
      playSpeechCall(activePatient.no_antrian, activePatient.nama_poli);
    }
  };

  // Autocomplete ICD-10 suggestions handler
  const handleIcdChange = (e) => {
    const value = e.target.value;
    setIcd10Input(value);
    setSelectedIcd(null);
    if (value.trim().length > 0) {
      setShowIcdSuggestions(true);
    } else {
      setShowIcdSuggestions(false);
    }
  };

  const selectIcdSuggestion = (item) => {
    setSelectedIcd(item);
    setIcd10Input(`${item.code} - ${item.desc}`);
    setShowIcdSuggestions(false);
  };

  // Prescription / Resep row modifiers
  const handleAddResepRow = () => {
    setResep([
      ...resep,
      { id_obat: "", dosis: "3x1", jumlah: 10, aturan_pakai: "Sesudah makan" },
    ]);
  };

  const handleRemoveResepRow = (idx) => {
    setResep(resep.filter((_, i) => i !== idx));
  };

  const handleResepFieldChange = (idx, field, value) => {
    const updated = [...resep];
    updated[idx][field] = value;
    setResep(updated);
  };

  // Submit Examination
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activePatient) return;

    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    const checkupData = {
      id_antrian: activePatient.id_antrian,
      subjektif,
      objektif,
      assessment,
      plan,
      icd10_code: selectedIcd ? selectedIcd.code : icd10Input ? icd10Input.split(" - ")[0].trim() : null,
      icd10_deskripsi: selectedIcd ? selectedIcd.desc : icd10Input ? icd10Input.split(" - ").slice(1).join(" - ").trim() : null,
      tekanan_darah: tekananDarah,
      suhu,
      nadi,
      respirasi,
      berat_badan: beratBadan,
      tinggi_badan: tinggiBadan,
      resep: resep.filter((r) => r.id_obat !== ""), // Filter out rows without medicine
    };

    try {
      await api.post("/medis/periksa", checkupData);
      setSuccessMsg(`Pemeriksaan pasien ${activePatient.nama_pasien} berhasil disimpan.`);
      setActivePatient(null);
      
      // Refresh Queue
      const { data } = await api.get(`/pendaftaran/antrian?id_poli=${selectedPoli.id_poli}`);
      setAntrianList(data.filter(a => a.status_panggil !== "selesai"));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Gagal menyimpan pemeriksaan medis.");
    } finally {
      setSubmitting(false);
    }
  };

  const hitungUmur = (tglLahir) => {
    if (!tglLahir) return "-";
    const birth = new Date(tglLahir);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return `${age} tahun`;
  };

  return (
    <div className="flex flex-col h-full bg-surface-0 text-text-primary overflow-hidden">
      <Topbar />

      <main className="flex-1 px-6 py-6 w-full overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pelayanan Medis (Dokter)</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Pemeriksaan pasien poliklinik, rekam catatan medis SOAP, serta pembuatan resep obat.
            </p>
          </div>
        </div>

        {/* Poliklinik tabs */}
        <div className="mt-6 flex flex-wrap gap-2">
          {loadingPoli ? (
            <div className="text-sm text-text-secondary">Memuat poliklinik...</div>
          ) : (
            poliList.map((p) => {
              const isActive = selectedPoli?.id_poli === p.id_poli;
              return (
                <button
                  key={p.id_poli}
                  onClick={() => {
                    setSelectedPoli(p);
                    setActivePatient(null);
                  }}
                  className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition-all border cursor-pointer ${
                    isActive
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                      : "bg-card-bg border-border-soft hover:border-blue-400 text-text-primary"
                  }`}
                >
                  <Building2 size={16} />
                  <span>{p.nama_poli}</span>
                </button>
              );
            })
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-accent-red-soft px-4 py-3 text-sm text-accent-red">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <CheckCircle size={16} />
            {successMsg}
          </div>
        )}

        {selectedPoli && (
          <div className="mt-6 medis-layout">
            
            {/* Left Sidebar: Patient List */}
            <div className="medis-sidebar flex flex-col">
              <div className="bg-surface-1/40 border-b border-border-soft px-5 py-4 flex items-center justify-between">
                <span className="text-sm font-bold flex items-center gap-2 text-text-primary">
                  <Clock size={16} className="text-blue-500" />
                  Antrean Hari Ini
                </span>
                <span className="text-xs text-text-secondary bg-surface-1 px-2 py-0.5 rounded-full font-bold">
                  {antrianList.length} Pasien
                </span>
              </div>

              <div className="p-4 flex-1 overflow-y-auto max-h-[600px] flex flex-col gap-2.5">
                {loadingAntrian && antrianList.length === 0 ? (
                  <div className="text-center py-6 text-xs text-text-secondary">
                    Memuat antrean...
                  </div>
                ) : antrianList.length > 0 ? (
                  antrianList.map((item) => {
                    const isSelected = activePatient?.id_antrian === item.id_antrian;
                    const isCalling = item.status_panggil === "dipanggil";

                    return (
                      <div
                        key={item.id_antrian}
                        onClick={() => handleSelectPatient(item)}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer antrian-item ${
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-600 hover:text-white"
                            : isCalling
                            ? "bg-blue-50/70 border-blue-200"
                            : "bg-surface-2 border-border-soft"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 border ${
                            isSelected 
                              ? "bg-white/20 text-white border-white/10" 
                              : isCalling
                              ? "bg-blue-100 text-blue-600 border-blue-200 pulse-active"
                              : "bg-blue-50 text-blue-600 border-blue-100"
                          }`}>
                            {item.no_antrian}
                          </div>
                          <div>
                            <div className="font-bold text-sm line-clamp-1">{item.nama_pasien}</div>
                            <div className={`text-xs mt-0.5 font-medium ${isSelected ? "text-white/80" : "text-text-secondary"}`}>
                              RM: {item.no_rm} • {item.nama_penjamin || "Umum"}
                            </div>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 border ${
                          isSelected
                            ? "bg-white/20 text-white border-white/20"
                            : isCalling
                            ? "bg-blue-100 text-blue-700 border-blue-200"
                            : "bg-amber-100 text-amber-700 border-amber-200"
                        }`}>
                          {item.status_panggil}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 text-xs text-text-secondary">
                    Tidak ada pasien dalam antrean poliklinik saat ini.
                  </div>
                )}
              </div>
            </div>

            {/* Right Main Panel: Patient Examination */}
            <div className="flex flex-col gap-6">
              {activePatient ? (
                <form onSubmit={handleSubmit} className="medis-form-card">
                  
                  {/* Patient Info Header */}
                  <div className="bg-accent-blue-soft/50 border border-blue-100 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                        <User size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-lg text-text-primary">{activePatient.nama_pasien}</span>
                          <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                            Antrean {activePatient.no_antrian}
                          </span>
                        </div>
                        <div className="text-xs text-text-secondary mt-1 flex flex-wrap gap-x-4 gap-y-1 font-semibold">
                          <span className="flex items-center gap-1"><Info size={12} /> RM: {activePatient.no_rm}</span>
                          <span className="flex items-center gap-1"><Calendar size={12} /> {hitungUmur(activePatient.tanggal_lahir)}</span>
                          <span className="flex items-center gap-1"><User size={12} /> {activePatient.jk === "L" ? "Laki-laki" : "Perempuan"}</span>
                          <span className="flex items-center gap-1"><Shield size={12} /> {activePatient.nama_penjamin || "Umum"}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={handlePanggilUlang}
                      className="flex items-center gap-1.5 rounded-lg border border-blue-600 text-blue-600 px-4 py-2 text-xs font-bold hover:bg-blue-50 transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
                    >
                      <Volume2 size={14} /> Panggil Ulang
                    </button>
                  </div>

                  {/* Vitals Section */}
                  <h3 className="medis-section-title">
                    <Heart size={16} className="text-red-500" /> Vital Signs & Pemeriksaan Fisik
                  </h3>
                  <div className="vitals-grid">
                    <div className="vitals-input-wrapper">
                      <label className="block text-sm text-text-secondary">Tensi</label>
                      <input
                        type="text"
                        placeholder="120/80"
                        value={tekananDarah}
                        onChange={(e) => setTekananDarah(e.target.value)}
                        className="w-full rounded-lg border border-border"
                      />
                      <span className="vitals-unit">mmHg</span>
                    </div>
                    <div className="vitals-input-wrapper">
                      <label className="block text-sm text-text-secondary">Suhu</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="36.5"
                        value={suhu}
                        onChange={(e) => setSuhu(e.target.value)}
                        className="w-full rounded-lg border border-border"
                      />
                      <span className="vitals-unit">°C</span>
                    </div>
                    <div className="vitals-input-wrapper">
                      <label className="block text-sm text-text-secondary">Nadi</label>
                      <input
                        type="number"
                        placeholder="80"
                        value={nadi}
                        onChange={(e) => setNadi(e.target.value)}
                        className="w-full rounded-lg border border-border"
                      />
                      <span className="vitals-unit">bpm</span>
                    </div>
                    <div className="vitals-input-wrapper">
                      <label className="block text-sm text-text-secondary">Napas</label>
                      <input
                        type="number"
                        placeholder="20"
                        value={respirasi}
                        onChange={(e) => setRespirasi(e.target.value)}
                        className="w-full rounded-lg border border-border"
                      />
                      <span className="vitals-unit">/m</span>
                    </div>
                    <div className="vitals-input-wrapper">
                      <label className="block text-sm text-text-secondary">Berat</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="60"
                        value={beratBadan}
                        onChange={(e) => setBeratBadan(e.target.value)}
                        className="w-full rounded-lg border border-border"
                      />
                      <span className="vitals-unit">kg</span>
                    </div>
                    <div className="vitals-input-wrapper">
                      <label className="block text-sm text-text-secondary">Tinggi</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="165"
                        value={tinggiBadan}
                        onChange={(e) => setTinggiBadan(e.target.value)}
                        className="w-full rounded-lg border border-border"
                      />
                      <span className="vitals-unit">cm</span>
                    </div>
                  </div>

                  {/* SOAP Section */}
                  <h3 className="medis-section-title">
                    <FileText size={16} className="text-blue-500" /> Catatan Rekam Medis (SOAP)
                  </h3>
                  <div className="soap-grid">
                    <div>
                      <label className="block text-sm text-text-secondary">Subjektif (Keluhan Utama & Anamnesis)</label>
                      <textarea
                        rows={3}
                        placeholder="Pasien mengeluhkan demam sejak 3 hari yang lalu disertai batuk..."
                        value={subjektif}
                        onChange={(e) => setSubjektif(e.target.value)}
                        className="w-full rounded-lg border border-border resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary">Objektif (Pemeriksaan Fisik & Penunjang)</label>
                      <textarea
                        rows={3}
                        placeholder="Suhu 38.2 C, faring hiperemis, ronkhi (-)..."
                        value={objektif}
                        onChange={(e) => setObjektif(e.target.value)}
                        className="w-full rounded-lg border border-border resize-none"
                      />
                    </div>
                  </div>

                  {/* Diagnosis / Assessment Section */}
                  <div className="soap-grid">
                    <div className="relative">
                      <label className="block text-sm text-text-secondary">Assessment / Diagnosis</label>
                      <textarea
                        rows={2}
                        placeholder="Diagnosis klinis dokter..."
                        value={assessment}
                        onChange={(e) => setAssessment(e.target.value)}
                        className="w-full rounded-lg border border-border resize-none"
                      />
                    </div>
                    <div className="relative">
                      <label className="block text-sm text-text-secondary">Diagnosis ICD-10 (Opsional)</label>
                      <input
                        type="text"
                        placeholder="Ketik kode atau nama penyakit (misal: J06 / ISPA)..."
                        value={icd10Input}
                        onChange={handleIcdChange}
                        onFocus={() => setShowIcdSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowIcdSuggestions(false), 200)}
                        className="w-full rounded-lg border border-border"
                      />
                      {showIcdSuggestions && (
                        <div className="icd-suggestions">
                          {COMMON_ICD10.filter(
                            (item) =>
                              item.code.toLowerCase().includes(icd10Input.toLowerCase()) ||
                              item.desc.toLowerCase().includes(icd10Input.toLowerCase())
                          ).map((item) => (
                            <div
                              key={item.code}
                              onMouseDown={() => selectIcdSuggestion(item)}
                              className="icd-item"
                            >
                              <strong>{item.code}</strong> - {item.desc}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-sm text-text-secondary">Plan / Rencana Tindakan & Terapi</label>
                    <textarea
                      rows={2}
                      placeholder="Edukasi istirahat cukup, kompres air hangat, resep obat..."
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                      className="w-full rounded-lg border border-border resize-none"
                    />
                  </div>

                  {/* Resep Section */}
                  <div className="flex justify-between items-center mt-6 mb-2">
                    <h3 className="medis-section-title !my-0 border-b-0 !pb-0">
                      <FileSpreadsheet size={16} className="text-teal-600" /> Preskripsi Resep Obat
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddResepRow}
                      className="flex items-center gap-1 rounded-lg bg-teal-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-teal-700 transition-colors cursor-pointer"
                    >
                      <Plus size={13} /> Tambah Obat
                    </button>
                  </div>

                  {resep.length > 0 ? (
                    <table className="resep-table">
                      <thead>
                        <tr>
                          <th className="w-[40%]">Nama Obat</th>
                          <th>Jumlah</th>
                          <th>Dosis</th>
                          <th>Aturan Pakai</th>
                          <th className="w-[50px]"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {resep.map((r, idx) => (
                          <tr key={idx} className="animate-fade-in">
                            <td>
                              <select
                                value={r.id_obat}
                                onChange={(e) => handleResepFieldChange(idx, "id_obat", e.target.value)}
                                className="w-full rounded-lg border border-border !p-1.5"
                                required
                              >
                                <option value="">-- Pilih Obat --</option>
                                {obatList.map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.nama_obat} (Stok: {o.stok} {o.satuan})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                value={r.jumlah}
                                onChange={(e) => handleResepFieldChange(idx, "jumlah", parseInt(e.target.value, 10))}
                                className="w-full rounded-lg border border-border !p-1.5"
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                placeholder="3x1"
                                value={r.dosis}
                                onChange={(e) => handleResepFieldChange(idx, "dosis", e.target.value)}
                                className="w-full rounded-lg border border-border !p-1.5"
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                placeholder="Sesudah makan"
                                value={r.aturan_pakai}
                                onChange={(e) => handleResepFieldChange(idx, "aturan_pakai", e.target.value)}
                                className="w-full rounded-lg border border-border !p-1.5"
                                required
                              />
                            </td>
                            <td className="text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveResepRow(idx)}
                                className="text-text-muted hover:text-red-500 cursor-pointer p-1"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-4 border border-dashed border-border-soft rounded-lg text-xs text-text-secondary">
                      Belum ada obat yang dimasukkan ke resep.
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="mt-8 flex justify-end gap-3 border-t border-border-soft pt-5">
                    <button
                      type="button"
                      onClick={() => setActivePatient(null)}
                      className="px-5 py-2.5 rounded-lg border border-border-soft hover:bg-surface-1/40 text-text-primary text-sm font-semibold transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 text-white px-6 py-2.5 text-sm font-bold hover:bg-blue-700 transition-colors cursor-pointer shadow-xs active:scale-[0.98] disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={15} className="animate-spin" /> Menyimpan...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={15} /> Simpan & Selesai
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="medis-form-card flex flex-col items-center justify-center text-center py-20">
                  <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-400 flex items-center justify-center mb-5">
                    <Stethoscope size={36} />
                  </div>
                  <h2 className="text-lg font-bold text-text-primary">Tidak Ada Pasien Aktif</h2>
                  <p className="text-sm text-text-secondary mt-1.5 max-w-sm leading-relaxed">
                    Pilih salah satu pasien di sebelah kiri untuk melakukan pemeriksaan vital signs, mengisi SOAP, dan memberikan resep.
                  </p>
                </div>
              )}

              {/* History Section (Timeline) */}
              {activePatient && (
                <div className="medis-form-card mt-2">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-text-primary">
                    <History size={16} className="text-blue-500" />
                    Riwayat Pemeriksaan Sebelumnya ({riwayatList.length})
                  </h3>
                  
                  <div className="mt-4 flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-2">
                    {loadingRiwayat ? (
                      <div className="text-center py-6 text-xs text-text-secondary">
                        Memuat riwayat medis...
                      </div>
                    ) : riwayatList.length > 0 ? (
                      riwayatList.map((h, i) => (
                        <div key={i} className="history-item">
                          <div className="history-date">
                            {new Date(h.tanggal_kunjungan).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric"
                            })}
                          </div>
                          <div className="history-doc">Diperiksa oleh: {h.nama_dokter || "-"}</div>
                          
                          <div className="history-soap">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                              <div><strong>S:</strong> {h.subjektif || "-"}</div>
                              <div><strong>O:</strong> {h.objektif || "-"}</div>
                              <div><strong>A:</strong> {h.assessment || "-"}</div>
                              <div><strong>P:</strong> {h.plan || "-"}</div>
                              {h.icd10_code && (
                                <div className="col-span-2 mt-1">
                                  <strong>ICD-10:</strong> <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold text-[10px]">{h.icd10_code}</span> - {h.icd10_deskripsi}
                                </div>
                              )}
                              {(h.tekanan_darah || h.suhu || h.nadi) && (
                                <div className="col-span-2 border-t border-dashed border-border-soft pt-1.5 mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-text-secondary">
                                  {h.tekanan_darah && <span>Tensi: {h.tekanan_darah} mmHg</span>}
                                  {h.suhu && <span>Suhu: {h.suhu} °C</span>}
                                  {h.nadi && <span>Nadi: {h.nadi} bpm</span>}
                                  {h.respirasi && <span>Napas: {h.respirasi} /m</span>}
                                  {h.berat_badan && <span>BB: {h.berat_badan} kg</span>}
                                  {h.tinggi_badan && <span>TB: {h.tinggi_badan} cm</span>}
                                </div>
                              )}
                            </div>

                            {h.resep_obat && h.resep_obat.length > 0 && (
                              <div className="mt-2 border-t border-dashed border-border-soft pt-1.5">
                                <div className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-1">Resep Obat:</div>
                                <ul className="list-disc list-inside text-xs text-text-primary pl-1 flex flex-col gap-0.5">
                                  {h.resep_obat.map((o, idx) => (
                                    <li key={idx} className="marker:text-teal-500">
                                      {o.nama_obat} - {o.jumlah} {o.satuan} ({o.dosis} • {o.aturan_pakai})
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-xs text-text-secondary">
                        Tidak ada riwayat pemeriksaan medis sebelumnya untuk pasien ini.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
