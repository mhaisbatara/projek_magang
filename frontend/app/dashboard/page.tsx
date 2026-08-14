"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Wallet, Clock, Activity } from "lucide-react";
import { api } from "@/lib/api";
import StatCard from "@/components/dashboard/StatCard";
import TrenKunjunganChart, {
  type TrenPoint,
} from "@/components/dashboard/TrenKunjunganChart";
import PasienPerPoliCard, {
  type PoliCount,
} from "@/components/dashboard/PasienPerPoliCard";

type Stats = {
  kunjunganHariIni: number;
  growthKunjungan: number | null;
  pendapatanHariIni: number;
  growthPendapatan: number | null;
  pasienMenunggu: number;
  okupansi: number;
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
  notation: "compact",
});

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tren, setTren] = useState<TrenPoint[]>([]);
  const [poli, setPoli] = useState<PoliCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/");
      return;
    }

    async function load() {
      try {
        const [statsRes, trenRes, poliRes] = await Promise.all([
          api.get("/dashboard/stats"),
          api.get("/dashboard/tren-kunjungan"),
          api.get("/dashboard/pasien-per-poli"),
        ]);
        setStats(statsRes.data);
        setTren(trenRes.data);
        setPoli(poliRes.data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Gagal memuat data dashboard";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[#9CA3AF]">
        Memuat data dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 font-[Inter,sans-serif]">
      {/* Kartu statistik */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Kunjungan Hari Ini"
          value={String(stats.kunjunganHariIni)}
          growth={stats.growthKunjungan}
        />
        <StatCard
          icon={Wallet}
          label="Pendapatan Hari Ini"
          value={currency.format(stats.pendapatanHariIni)}
          growth={stats.growthPendapatan}
        />
        <StatCard
          icon={Clock}
          label="Pasien Menunggu"
          value={String(stats.pasienMenunggu)}
          badge={
            stats.pasienMenunggu > 15
              ? { label: "Perlu Perhatian", tone: "warn" }
              : { label: "Normal", tone: "ok" }
          }
        />
        <StatCard
          icon={Activity}
          label="Okupansi Poli"
          value={`${stats.okupansi}%`}
          badge={
            stats.okupansi >= 70
              ? { label: "Stabil", tone: "ok" }
              : { label: "Perlu Perhatian", tone: "warn" }
          }
        />
      </div>

      {/* Chart & daftar poli */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrenKunjunganChart data={tren} />
        </div>
        <PasienPerPoliCard data={poli} />
      </div>
    </div>
  );
}