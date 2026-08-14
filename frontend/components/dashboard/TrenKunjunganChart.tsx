"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export type TrenPoint = { hari: string; total: number };

export default function TrenKunjunganChart({ data }: { data: TrenPoint[] }) {
  return (
    <div className="rounded border border-[#E5E1D8] bg-white p-5 shadow-sm">
      <h3 className="font-[Space_Grotesk,sans-serif] text-sm font-bold text-[#101826]">
        Tren Kunjungan (7 Hari)
      </h3>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="trenFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E8A33D" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#E8A33D" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#E5E1D8" vertical={false} />
            <XAxis
              dataKey="hari"
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              axisLine={{ stroke: "#E5E1D8" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 6,
                border: "1px solid #E5E1D8",
                fontSize: 12,
              }}
              labelStyle={{ color: "#101826", fontWeight: 600 }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#101826"
              strokeWidth={2}
              fill="url(#trenFill)"
              dot={{ r: 4, fill: "#101826", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#E8A33D" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
