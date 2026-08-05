import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  // --- STATE FORM ---
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth(); // Mengambil fungsi registrasi global dari Context
  const navigate = useNavigate();

  // --- SUBMIT HANDLER ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // 1. Panggil API registrasi di backend
      await register(username, password);
      setSuccess("Registrasi berhasil, mengalihkan ke halaman login...");
      
      // 2. Alihkan otomatis ke halaman login setelah 1,2 detik
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal mendaftar. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Kolom Kiri: Branding info */}
      <div className="auth-brand">
        <span className="auth-brand-eyebrow">Inventaris · Magang</span>
        <h1>Satu akun, semua data barang.</h1>
        <p>Buat akun untuk mulai mencatat inventaris dan mengelola data barang gudang.</p>
      </div>

      {/* Kolom Rapat: Form input */}
      <div className="auth-panel">
        <form onSubmit={handleSubmit} className="auth-card">
          <h2>Buat akun baru</h2>
          
          {error && <p className="error-text">{error}</p>}
          {success && <p className="success-text">{success}</p>}

          <div className="form-field">
            <label>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
            />
          </div>

          <div className="form-field">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              minLength={6} 
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Memproses..." : "Daftar"}
          </button>

          <p className="switch-text">
            Sudah punya akun? <Link to="/login">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}