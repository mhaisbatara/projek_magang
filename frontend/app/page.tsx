"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-600 via-cyan-700 to-sky-900 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-3xl font-bold text-white">
              +
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Sistem Klinik</h1>
            <p className="mt-1 text-sm text-slate-500">
              Silakan masuk untuk melanjutkan
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
              <input
                id="user_name"
                type="text"
                autoComplete="username"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Masukkan username"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pr-12 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-xs font-semibold text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? "TUTUP" : "LIHAT"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-teal-600"
                />
                Ingat saya
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 py-2.5 text-sm font-semibold text-white shadow transition hover:from-teal-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Memproses..." : "Masuk"}
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
