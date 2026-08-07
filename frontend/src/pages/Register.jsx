import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import hero from "../assets/hero.png";
import "./Register.css";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nama: "",
    username: "",
    password: "",
  });

  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const submit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      await register(
        form.nama,
        form.username,
        form.password
      );

      alert("Register berhasil");
      navigate("/login");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Register gagal"
      );
    }

    setLoading(false);
  };

  return (
    <div className="login-container">

      {/* FORM DI KIRI */}
      <div className="login-right">

        <div className="login-card">

          <h1>Daftar Akun</h1>

          <p>
            Silakan isi data berikut untuk membuat akun.
          </p>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form
            className="login-form"
            onSubmit={submit}
          >

            <input
              type="text"
              name="nama"
              placeholder="Nama Lengkap"
              value={form.nama}
              onChange={handleChange}
              required
            />

            <input
              type="text"
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              required
            />

            <input
              type={show ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
            />

            <label className="password-option">
              <input
                type="checkbox"
                checked={show}
                onChange={() => setShow(!show)}
              />
              Lihat Password
            </label>

            <button
              className="login-btn"
              disabled={loading}
            >
              {loading ? "Loading..." : "DAFTAR"}
            </button>

          </form>

          <div className="register-link">
            Sudah punya akun?{" "}
            <Link to="/login">
              Login
            </Link>
          </div>

        </div>

      </div>

      {/* HERO DI KANAN */}
      <div className="login-left">

        <img
          src={hero}
          alt="Hero"
          className="hero-image"
        />

        <div className="overlay"></div>

        <div className="hero-content">

          <div className="logo">
            🏥 SAKK Clinical
          </div>

          <div className="hero-text">
            <h1>Daftar Akun Baru</h1>

            <p>
              Bergabunglah bersama sistem klinik untuk
              mengelola data pasien, pelayanan,
              dan administrasi dengan lebih mudah.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}