import React from "react";
import {
  LayoutGrid, Users, Stethoscope, Microscope, Wallet, Archive,
  BarChart3, Settings, HelpCircle, Search, Bell, UserPlus,
  Megaphone, FileText, TrendingUp, MoreVertical,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import "./AdminDashboard.css";

const navItems = [
  { icon: LayoutGrid, label: "Dashboard", active: true },
  { icon: Users, label: "Pelayanan & Antrean" },
  { icon: Stethoscope, label: "Pelayanan Medis" },
  { icon: Microscope, label: "Penunjang Medis" },
  { icon: Wallet, label: "Kasir & Keuangan" },
  { icon: Archive, label: "Logistik & Operasional" },
  { icon: BarChart3, label: "Sistem & Pelaporan" },
];

const kpiData = [
  { icon: Users, iconBg: "kpi-icon-blue", label: "Kunjungan Hari Ini", value: "142", badge: "+12%", badgeType: "up" },
  { icon: Wallet, iconBg: "kpi-icon-teal", label: "Pendapatan Hari Ini", value: "Rp 12.4M", badge: "+5%", badgeType: "up" },
  { icon: FileText, iconBg: "kpi-icon-red", label: "Pasien Menunggu", value: "24", badge: "Perlu Perhatian", badgeType: "warn" },
  { icon: Archive, iconBg: "kpi-icon-orange", label: "Okupansi Poli", value: "78%", badge: "Stabil", badgeType: "neutral" },
];

const chartData = [
  { hari: "Sen", kunjungan: 42 },
  { hari: "Sel", kunjungan: 58 },
  { hari: "Rab", kunjungan: 52 },
  { hari: "Kam", kunjungan: 98 },
  { hari: "Jum", kunjungan: 88 },
  { hari: "Sab", kunjungan: 128 },
  { hari: "Min", kunjungan: 118 },
];

const poliData = [
  { nama: "Umum", jumlah: 80, color: "#2563eb" },
  { nama: "Gigi", jumlah: 45, color: "#0f766e" },
  { nama: "Anak", jumlah: 60, color: "#c2410c" },
  { nama: "Mata", jumlah: 25, color: "#1d4ed8" },
  { nama: "Kandungan", jumlah: 35, color: "#0d9488" },
];

const maxPoli = Math.max(...poliData.map((p) => p.jumlah));

export default function AdminDashboard() {
  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-icon">+</div>
          <div>
            <div className="admin-brand-title">SAKK Clinical</div>
            <div className="admin-brand-subtitle">Management System</div>
          </div>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`admin-nav-item ${item.active ? "active" : ""}`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button className="admin-nav-item">
            <Settings size={18} />
            <span>Pengaturan</span>
          </button>
          <button className="admin-nav-item">
            <HelpCircle size={18} />
            <span>Bantuan</span>
          </button>
          <div className="admin-user">
            <div className="admin-avatar" />
            <div>
              <div className="admin-user-name">Dr. Budi Santoso</div>
              <div className="admin-user-role">Administrator</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-search">
            <Search size={16} />
            <input placeholder="Cari Pasien, Rekam Medis, atau Jadwal..." />
          </div>
          <div className="admin-topbar-actions">
            <button className="icon-btn"><Bell size={18} /></button>
            <button className="icon-btn"><HelpCircle size={18} /></button>
          </div>
        </header>

        <div className="admin-page-head">
          <div>
            <h1>Ringkasan Hari Ini</h1>
            <p>Pantau aktivitas operasional klinik secara real-time.</p>
          </div>
          <div className="admin-page-actions">
            <button className="btn-fill-primary"><UserPlus size={16} /> Daftar Pasien Baru</button>
            <button className="btn-fill-accent"><Megaphone size={16} /> Panggil Antrean</button>
            <button className="btn-outline"><FileText size={16} /> Lihat Laporan</button>
          </div>
        </div>

        <section className="kpi-grid">
          {kpiData.map((kpi) => (
            <div className="kpi-card" key={kpi.label}>
              <div className="kpi-card-top">
                <div className={`kpi-icon ${kpi.iconBg}`}><kpi.icon size={18} /></div>
                <span className={`kpi-badge kpi-badge-${kpi.badgeType}`}>
                  {kpi.badgeType === "up" && <TrendingUp size={12} />}
                  {kpi.badge}
                </span>
              </div>
              <div className="kpi-label">{kpi.label}</div>
              <div className="kpi-value">{kpi.value}</div>
            </div>
          ))}
        </section>

        <section className="admin-content-grid">
          <div className="chart-card">
            <div className="chart-card-head">
              <h3>Tren Kunjungan (7 Hari)</h3>
              <button className="icon-btn"><MoreVertical size={18} /></button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillKunjungan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#eef0f3" />
                <XAxis dataKey="hari" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="kunjungan"
                  stroke="#2563eb"
                  strokeWidth={3}
                  fill="url(#fillKunjungan)"
                  dot={{ r: 5, fill: "#2563eb", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="poli-card">
            <h3>Pasien per Poli</h3>
            <div className="poli-list">
              {poliData.map((poli) => (
                <div className="poli-row" key={poli.nama}>
                  <span className="poli-name">{poli.nama}</span>
                  <div className="poli-bar-track">
                    <div
                      className="poli-bar-fill"
                      style={{ width: `${(poli.jumlah / maxPoli) * 100}%`, background: poli.color }}
                    />
                  </div>
                  <span className="poli-count">{poli.jumlah}</span>
                </div>
              ))}
            </div>
            <button className="poli-detail-btn">Lihat Detail Poli</button>
          </div>
        </section>
      </main>
    </div>
  );
}