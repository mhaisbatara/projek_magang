"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dna, Pill, Plus, User, Eye, EyeOff } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function LoginPage() {
  const router = useRouter();

  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!userName || !password) {
      setError("Username dan password wajib diisi");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Timestamp": String(Math.floor(Date.now() / 1000)),
        },
        body: JSON.stringify({
          user_name: userName,
          password,
          remember_me: rememberMe ? "1" : "0",
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status !== "SUKSES") {
        setError(result.message || "Login gagal, coba lagi");
        return;
      }

      localStorage.setItem("access_token", result.data.access_token);
      localStorage.setItem("refresh_token", result.data.refresh_token);
      localStorage.setItem("user_info", JSON.stringify(result.data.user_info));

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server. Pastikan backend berjalan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-800 px-4 py-10">
      {/* Blob dekoratif besar */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-6rem] left-1/4 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />

      {/* Bubble ikon dekoratif */}
      <div className="pointer-events-none absolute left-[8%] top-[18%] hidden h-20 w-20 items-center justify-center rounded-full border border-white/25 bg-white/10 backdrop-blur-sm sm:flex">
        <Dna className="h-8 w-8 text-white/70" />
      </div>
      <div className="pointer-events-none absolute right-[10%] top-[55%] hidden h-24 w-24 items-center justify-center rounded-full border border-white/25 bg-white/10 backdrop-blur-sm sm:flex">
        <Pill className="h-9 w-9 text-white/70" />
      </div>
      <div className="pointer-events-none absolute bottom-[8%] left-[14%] hidden h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-sm md:flex" />

      {/* Garis pulse dekoratif di bagian bawah */}
      <svg
        className="pointer-events-none absolute bottom-10 left-0 w-full opacity-25"
        height="50"
        viewBox="0 0 800 50"
        preserveAspectRatio="none"
      >
        <polyline
          points="0,25 120,25 150,10 180,40 210,25 320,25 350,5 380,45 410,25 800,25"
          fill="none"
          stroke="white"
          strokeWidth="2"
        />
      </svg>

      {/* Badge label bahasa (dekoratif) */}
      <div className="absolute right-6 top-6 flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
        Sistem Klinik
      </div>

      {/* Kartu login */}
      <div className="relative z-10 w-full max-w-md">
        <div className="relative rounded-2xl bg-white/95 p-8 pt-12 shadow-2xl backdrop-blur-sm">
          <div className="absolute -top-8 left-1/2 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
            <Plus className="h-8 w-8" strokeWidth={3} />
          </div>

          <div className="mb-6 text-center">
            <h1 className="font-[Space_Grotesk,sans-serif] text-2xl font-bold text-slate-900">
              Selamat Datang Kembali!
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Masuk untuk mengelola Sistem Klinik
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="user_name"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Username
              </label>
              <div className="relative">
                <input
                  id="user_name"
                  type="text"
                  autoComplete="username"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pr-11 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
                <User className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <span
                  className="cursor-not-allowed text-xs font-medium text-teal-600/60"
                  title="Fitur belum tersedia"
                >
                  Lupa Password?
                </span>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pr-11 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-teal-600"
              />
              Ingat saya
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 py-2.5 text-sm font-semibold text-white shadow transition hover:from-teal-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Memproses..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Demo: username{" "}
            <span className="font-mono font-semibold text-slate-500">
              superadmin
            </span>{" "}
            • password{" "}
            <span className="font-mono font-semibold text-slate-500">
              admin123
            </span>
          </p>
        </div>
      </div>
    </main>
  );
}
