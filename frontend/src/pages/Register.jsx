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

<div className="register-container">

<div className="register-box">

<div className="register-right">

<img src={hero} alt="" />

</div>

<div className="register-left">

<h1>Sistem Klinik</h1>

<p>Buat akun baru</p>

{error &&

<div className="error">

{error}

</div>

}

<form onSubmit={submit}>

<input
name="nama"
placeholder="Nama Lengkap"
value={form.nama}
onChange={handleChange}
required
/>

<input
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

<label className="remember">

<input
type="checkbox"
onChange={() => setShow(!show)}
/>

Lihat Password

</label>

<button>

{loading ? "Loading..." : "DAFTAR"}

</button>

</form>

<div className="register-link">

Sudah punya akun?

<Link to="/login">

Login

</Link>

</div>

</div>

</div>

</div>

  );
}