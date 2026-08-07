import {
  Wallet,
  Receipt,
  CreditCard,
  BookOpen,
  TrendingUp,
  FileCheck2,
  Banknote,
  History,
} from "lucide-react";
import "./Kasir.css";

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

function Kasir() {
  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Kasir & Keuangan</h1>
          <p>
            Kelola transaksi pembayaran pasien, kwitansi, buku kas, serta
            klaim BPJS.
          </p>
        </div>
      </div>

      <div className="admin-grid">
        <MenuCard
          icon={Receipt}
          title="Modul Kasir"
          description="POS billing, cetak kwitansi, serta integrasi payment gateway."
        />

        <MenuCard
          icon={BookOpen}
          title="Modul Keuangan"
          description="Buku kas harian, laporan laba-rugi, serta klaim BPJS."
        />
      </div>

      <div className="feature-section">

        <div className="feature-box">
          <div className="feature-title">
            <CreditCard size={20} />
            <span>Modul Kasir</span>
          </div>

          <ul>
            <li>POS Billing</li>
            <li>Cetak Kwitansi</li>
            <li>Payment Gateway</li>
            <li>Riwayat Transaksi</li>
          </ul>
        </div>

        <div className="feature-box">
          <div className="feature-title">
            <TrendingUp size={20} />
            <span>Modul Keuangan</span>
          </div>

          <ul>
            <li>Buku Kas</li>
            <li>Laporan Laba-Rugi</li>
            <li>Klaim BPJS</li>
            <li>Rekonsiliasi Pembayaran</li>
          </ul>
        </div>

        <div className="feature-box">
          <div className="feature-title">
            <Banknote size={20} />
            <span>Ringkasan Kas</span>
          </div>

          <ul>
            <li>Total Pendapatan Hari Ini</li>
            <li>Metode Pembayaran Terpopuler</li>
            <li>Piutang Belum Terbayar</li>
            <li>Saldo Kas Akhir</li>
          </ul>
        </div>

        <div className="feature-box">
          <div className="feature-title">
            <FileCheck2 size={20} />
            <span>Klaim & Audit</span>
          </div>

          <ul>
            <li>Status Klaim BPJS</li>
            <li>Klaim Ditolak / Pending</li>
            <li>Riwayat Pengajuan Klaim</li>
            <li>Log Perubahan Transaksi</li>
          </ul>
        </div>

      </div>
    </div>
  );
}

export default Kasir;