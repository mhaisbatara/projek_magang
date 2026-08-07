import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import hero from "../assets/hero.png";
import "./Login.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      await login(username, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login gagal");
    }

    setLoading(false);
  };

  return (
    <div className="login-container">

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

            <h1>SAKK Clinical</h1>

            <p>
                Sistem manajemen klinik modern yang
                mengutamakan ketepatan, kepercayaan,
                dan kenyamanan operasional.
            </p>

        </div>

    </div>

</div>

      <div className="login-right">

        <div className="login-card">

          <h1>Selamat Datang</h1>

          <p>Silakan login untuk masuk ke sistem.</p>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={submit}>

            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <input
              type={show ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              {loading ? "Loading..." : "LOGIN"}
            </button>

          </form>

          <div className="register-link">

            Belum punya akun?

            {" "}

            <Link to="/register">
              Daftar
            </Link>

          </div>

        </div>

      </div>

    </div>
  );
}