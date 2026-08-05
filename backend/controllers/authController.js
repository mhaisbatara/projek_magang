import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { JWT_SECRET } from "../middleware/auth.js";

// --- REGISTER (Pendaftaran User Baru) ---
async function register(req, res) {
  const { username, password } = req.body;

  // 1. Validasi input: Pastikan username dan password diisi
  if (!username || !password) {
    return res.status(400).json({ message: "Username dan password wajib diisi" });
  }

  try {
    // 2. Cek apakah username sudah terdaftar di database
    const [existing] = await pool.query("SELECT id FROM user WHERE username = ?", [username]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Username sudah dipakai" });
    }

    // 3. Enkripsi (Hash) password menggunakan bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Simpan user baru ke database
    await pool.query(
      "INSERT INTO user (username, password) VALUES (?, ?)",
      [username, hashedPassword]
    );

    return res.status(201).json({ message: "Registrasi berhasil, silakan login" });
  } catch (err) {
    console.error("Register Error:", err);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
}

// --- LOGIN (Masuk Akun & Dapatkan Token JWT) ---
async function login(req, res) {
  const { username, password } = req.body;

  // 1. Validasi input
  if (!username || !password) {
    return res.status(400).json({ message: "Username dan password wajib diisi" });
  }

  try {
    // 2. Cari user berdasarkan username
    const [rows] = await pool.query("SELECT * FROM user WHERE username = ?", [username]);
    const user = rows[0];

    // Jika user tidak ditemukan, atau password salah (dicek menggunakan bcrypt.compare)
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Username atau password salah" });
    }

    // 3. Buat JWT Token yang valid selama 1 hari (1d)
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 4. Kirim respon login sukses dengan tokennya
    return res.json({
      message: "Login berhasil",
      token,
      user: { id: user.id, username: user.username },
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
}

export { register, login };