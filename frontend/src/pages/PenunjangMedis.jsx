import {
  FlaskConical,
  Pill,
  Microscope,
  ClipboardList,
  FileText,
  PackageCheck,
  TestTube,
  AlertCircle,
} from "lucide-react";
import "./PenunjangMedis.css";

function MenuCard({ icon: Icon, title, description }) {
  return (
    <div className="menu-card">
      <div className="menu-icon">
        <Icon size={28} />
      </div>

      <div className="menu-content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

function PenunjangMedis() {
  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Penunjang Medis</h1>
          <p>
            Kelola dispensing resep farmasi serta input dan cetak hasil
            pemeriksaan laboratorium.
          </p>
        </div>
      </div>

      <div className="admin-grid">
        <MenuCard
          icon={Pill}
          title="Modul Farmasi"
          description="Dispensing e-resep, peracikan obat, serta pengecekan stok obat pasien."
        />

        <MenuCard
          icon={Microscope}
          title="Modul Laboratorium"
          description="Input hasil pemeriksaan lab medis serta cetak hasil untuk pasien."
        />
      </div>

      <div className="feature-section">

        <div className="feature-box">
          <div className="feature-title">
            <ClipboardList size={20} />
            <span>Modul Farmasi</span>
          </div>

          <ul>
            <li>Dispensing E-Resep</li>
            <li>Peracikan Obat</li>
            <li>Cek Interaksi Obat</li>
            <li>Riwayat Resep Pasien</li>
          </ul>
        </div>

        <div className="feature-box">
          <div className="feature-title">
            <TestTube size={20} />
            <span>Modul Laboratorium</span>
          </div>

          <ul>
            <li>Input Hasil Lab</li>
            <li>Cetak Hasil Lab</li>
            <li>Permintaan Pemeriksaan</li>
            <li>Riwayat Lab Pasien</li>
          </ul>
        </div>

        <div className="feature-box">
          <div className="feature-title">
            <PackageCheck size={20} />
            <span>Status Farmasi</span>
          </div>

          <ul>
            <li>Resep Menunggu Diracik</li>
            <li>Resep Siap Diambil</li>
            <li>Stok Obat Menipis</li>
            <li>Obat Mendekati Kadaluarsa</li>
          </ul>
        </div>

        <div className="feature-box">
          <div className="feature-title">
            <AlertCircle size={20} />
            <span>Status Laboratorium</span>
          </div>

          <ul>
            <li>Pemeriksaan Menunggu</li>
            <li>Hasil Belum Diverifikasi</li>
            <li>Hasil Kritis / Abnormal</li>
            <li>Sampel Ditolak</li>
          </ul>
        </div>

      </div>
    </div>
  );
}

export default PenunjangMedis;