import {
  FileBarChart,
  Users,
  Settings,
  ShieldCheck,
  FileSpreadsheet,
  UserCog,
  Printer,
  Activity,
} from "lucide-react";
import "./Administration.css";

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

function Administration() {
  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Sistem & Pelaporan</h1>
          <p>
            Kelola laporan, akun pengguna, pengaturan sistem serta audit
            aktivitas klinik.
          </p>
        </div>
      </div>

      <div className="admin-grid">
        <MenuCard
          icon={FileBarChart}
          title="Modul Laporan"
          description="Rekapitulasi kunjungan pasien, laporan RL Kemenkes, serta export PDF dan Excel."
        />

        <MenuCard
          icon={Users}
          title="Manajemen User"
          description="Kelola akun staf, role pengguna, serta hak akses (RBAC 9 Role Access)."
        />

        <MenuCard
          icon={Settings}
          title="Pengaturan Klinik"
          description="Profil klinik, header slip pembayaran, printer thermal, dan backup database."
        />

        <MenuCard
          icon={ShieldCheck}
          title="Integrasi & Audit Log"
          description="Bridging BPJS PCare, SATUSEHAT, sinkronisasi data, dan riwayat aktivitas pengguna."
        />
      </div>

      <div className="feature-section">

        <div className="feature-box">
          <div className="feature-title">
            <FileSpreadsheet size={20} />
            <span>Modul Laporan</span>
          </div>

          <ul>
            <li>Rekapitulasi Kunjungan</li>
            <li>Laporan RL Kemenkes</li>
            <li>Export PDF</li>
            <li>Export Excel</li>
          </ul>
        </div>

        <div className="feature-box">
          <div className="feature-title">
            <UserCog size={20} />
            <span>Manajemen User</span>
          </div>

          <ul>
            <li>Data Akun Staf</li>
            <li>RBAC 9 Role Access</li>
            <li>Reset Password</li>
            <li>Status Akun</li>
          </ul>
        </div>

        <div className="feature-box">
          <div className="feature-title">
            <Printer size={20} />
            <span>Pengaturan</span>
          </div>

          <ul>
            <li>Profil Klinik</li>
            <li>Header Slip</li>
            <li>Printer Thermal</li>
            <li>Backup Database</li>
          </ul>
        </div>

        <div className="feature-box">
          <div className="feature-title">
            <Activity size={20} />
            <span>Integrasi & Audit</span>
          </div>

          <ul>
            <li>Bridging BPJS PCare</li>
            <li>Bridging SATUSEHAT</li>
            <li>Status Sinkronisasi</li>
            <li>Audit Log Aktivitas</li>
          </ul>
        </div>

      </div>
    </div>
  );
}

export default Administration;