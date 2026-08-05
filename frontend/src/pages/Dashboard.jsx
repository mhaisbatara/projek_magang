import { useEffect, useState } from "react";
import { UserPlus, Megaphone, FileText, Users, Wallet, ClipboardList, Building2 } from "lucide-react";
import Topbar from "../components/Topbar";
import KpiCard from "../components/KpiCard";
import VisitTrendChart from "../components/VisitTrendChart";
import PoliDistribution from "../components/PoliDistribution";
import { fetchDashboardSummary } from "../services/dashboardService";
import "./Dashboard.css";

function formatRupiah(value) {
  if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `Rp ${(value / 1000).toFixed(0)}rb`;
  return `Rp ${value}`;
}

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    fetchDashboardSummary()
      .then((result) => {
        if (isMounted) setData(result);
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setError("Gagal memuat data dashboard dari server.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="dashboard">
      <Topbar />

      <div className="dashboard-body">
        <div className="dashboard-heading">
          <div>
            <h1>Ringkasan Hari Ini</h1>
            <p>Pantau aktivitas operasional klinik secara real-time.</p>
          </div>
          <div className="dashboard-actions">
            <button type="button" className="btn btn-primary">
              <UserPlus size={16} /> Daftar Pasien Baru
            </button>
            <button type="button" className="btn btn-outline-teal">
              <Megaphone size={16} /> Panggil Antrean
            </button>
            <button type="button" className="btn btn-outline">
              <FileText size={16} /> Lihat Laporan
            </button>
          </div>
        </div>

        {error && <p className="dashboard-error">{error}</p>}

        <div className="kpi-grid">
          <KpiCard
            icon={Users}
            iconColor="blue"
            label="Kunjungan Hari Ini"
            value={loading ? "..." : data?.kpi.kunjunganHariIni ?? 0}
          />
          <KpiCard
            icon={Wallet}
            iconColor="teal"
            label="Pendapatan Hari Ini"
            value={loading ? "..." : formatRupiah(data?.kpi.pendapatanHariIni ?? 0)}
          />
          <KpiCard
            icon={ClipboardList}
            iconColor="red"
            badgeText={!loading && data?.kpi.pasienMenunggu > 0 ? "Perlu Perhatian" : undefined}
            badgeTone="warning"
            label="Pasien Menunggu"
            value={loading ? "..." : data?.kpi.pasienMenunggu ?? 0}
          />
          <KpiCard
            icon={Building2}
            iconColor="orange"
            badgeText="Stabil"
            badgeTone="neutral"
            label="Okupansi Poli"
            value={loading ? "..." : `${data?.kpi.okupansiPoli ?? 0}%`}
          />
        </div>

        <div className="dashboard-panels">
          <VisitTrendChart data={data?.visitTrend ?? []} loading={loading} />
          <PoliDistribution data={data?.poliDistribution ?? []} loading={loading} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
