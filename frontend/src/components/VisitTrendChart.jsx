import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./VisitTrendChart.css";

function VisitTrendChart({ data = [], loading = false }) {
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <h3>Tren Kunjungan (7 Hari)</h3>
      </div>
      {loading ? (
        <p className="chart-loading">Memuat data...</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="visitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3266f0" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#3266f0" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#eceafa" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#868c9c" }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#868c9c" }} />
            <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #ecebf5", fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="kunjungan"
              stroke="#3266f0"
              strokeWidth={2.5}
              fill="url(#visitGradient)"
              dot={{ r: 4, fill: "#3266f0", strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default VisitTrendChart;
