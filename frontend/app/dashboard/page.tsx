"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type UserInfo = {
  id: string;
  user_name: string;
  email: string;
  role: string;
  kode_role: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user] = useState<UserInfo | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("user_info");
    return raw ? (JSON.parse(raw) as UserInfo) : null;
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      router.replace("/");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_info");
    router.push("/");
  };

  const initial = user?.user_name?.charAt(0).toUpperCase() ?? "?";

  return (
    <main className="min-h-screen bg-[#FAF9F6] font-[Inter,sans-serif]">
      {/* Header navy dengan aksen garis mirip barcode */}
      <header className="relative overflow-hidden bg-[#101826] px-6 py-5 sm:px-10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(232,163,61,0.12) 0px, rgba(232,163,61,0.12) 2px, transparent 2px, transparent 14px)",
            maskImage: "linear-gradient(90deg, black, transparent 60%)",
          }}
        />
        <div className="relative mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#E8A33D]">
              Sistem Klinik
            </p>
            <h1 className="mt-0.5 text-lg font-bold tracking-tight text-[#FAF9F6]">
              Dashboard
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="rounded border border-[#3A4658] px-4 py-2 text-xs font-semibold text-[#FAF9F6] transition-colors hover:border-[#E8A33D]"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* Konten */}
      <section className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-10">
        <div className="overflow-hidden rounded border border-[#E5E1D8] bg-white shadow-sm">
          {/* Garis aksen atas */}
          <div
            className="h-1"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, #E8A33D 0px, #E8A33D 10px, #101826 10px, #101826 20px)",
            }}
          />

          <div className="p-8 sm:p-10">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#101826] font-[Space_Grotesk,sans-serif] text-xl font-bold text-[#E8A33D]">
                {initial}
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-[#101826]">
                  Selamat datang{user ? `, ${user.user_name}` : ""}
                </h2>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Anda masuk sebagai {user?.role ?? "pengguna"} pada Sistem Klinik.
                </p>
              </div>
            </div>

            {user && (
              <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded border border-[#E5E1D8] bg-[#E5E1D8] sm:grid-cols-2">
                <InfoField label="Username" value={user.user_name} />
                <InfoField label="Role" value={user.role} />
                <InfoField label="Email" value={user.email} mono />
                <InfoField label="ID User" value={user.id} mono />
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center font-mono text-[11px] text-[#9CA3AF]">
          Kode akses tersimpan secara lokal di perangkat ini
        </p>
      </section>
    </main>
  );
}

function InfoField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-white p-5">
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-[#9CA3AF]">
        {label}
      </p>
      <p
        className={`mt-1.5 font-semibold text-[#101826] ${
          mono ? "font-mono text-sm" : "text-base"
        }`}
      >
        {value}
      </p>
    </div>
  );
}