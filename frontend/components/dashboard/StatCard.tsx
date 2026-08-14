import { type LucideIcon } from "lucide-react";

type Badge = { label: string; tone: "ok" | "warn" | "neutral" };

export default function StatCard({
  icon: Icon,
  label,
  value,
  growth,
  badge,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  growth?: number | null;
  badge?: Badge;
}) {
  return (
    <div className="rounded border border-[#E5E1D8] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#101826]">
          <Icon className="h-4 w-4 text-[#E8A33D]" />
        </div>

        {typeof growth === "number" && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              growth >= 0
                ? "bg-emerald-50 text-emerald-600"
                : "bg-red-50 text-red-600"
            }`}
          >
            {growth >= 0 ? "▲" : "▼"} {Math.abs(growth)}%
          </span>
        )}

        {badge && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              badge.tone === "ok"
                ? "bg-emerald-50 text-emerald-600"
                : badge.tone === "warn"
                ? "bg-red-50 text-red-600"
                : "bg-[#FAF9F6] text-[#6B7280]"
            }`}
          >
            {badge.label}
          </span>
        )}
      </div>

      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-[#9CA3AF]">
        {label}
      </p>
      <p className="mt-1 font-[Space_Grotesk,sans-serif] text-2xl font-bold text-[#101826]">
        {value}
      </p>
    </div>
  );
}
