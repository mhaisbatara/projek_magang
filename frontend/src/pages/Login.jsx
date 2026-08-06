import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  // --- STATE FORM ---
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth(); // Mengambil fungsi login global dari Context
  const navigate = useNavigate();

  // --- SUBMIT HANDLER ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Panggil fungsi login yang menyimpan token ke localStorage
      await login(username, password);
      // 2. Alihkan ke halaman dashboard
      navigate("/dashboard");
    } catch (err) {
      // Tangkap pesan error dari server backend jika ada
      setError(err.response?.data?.message || "Gagal masuk. Silakan cek akun Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Kolom Kiri: Branding info */}
      <div className="auth-brand">
        <span className="auth-brand-eyebrow">Inventaris · Magang</span>
        <h1>Kelola stok barang tanpa ribet.</h1>
        <p>Masuk untuk mencatat, mengubah, dan memantau barang gudang secara real-time.</p>
      </div>

      {/* Kolom Kanan: Form input */}
      <div className="auth-panel">
        <form onSubmit={handleSubmit} className="auth-card">
          <h2>Masuk ke akun</h2>
          
          {error && <p className="error-text">{error}</p>}

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
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Memproses..." : "Login"}
          </button>

          <p className="switch-text">
            Belum punya akun? <Link to="/register">Daftar</Link>
          </p>
        </form>
      </div>
    </div>
  );
}