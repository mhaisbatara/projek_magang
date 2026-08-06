import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// =======================
// REGISTER
// =======================
export const register = async (req, res) => {
  try {
    const { nama, username, password } = req.body;

    if (!nama || !username || !password) {
      return res.status(400).json({
        success: false,
        message: "Semua field wajib diisi",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password minimal 6 karakter",
      });
    }

    // Cek username
    const [cek] = await pool.query(
      "SELECT * FROM user_staff WHERE username = ?",
      [username]
    );

    if (cek.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Username sudah digunakan",
      });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Ambil id_user terakhir
    const [lastUser] = await pool.query(
      "SELECT id_user FROM user_staff ORDER BY id_user DESC LIMIT 1"
    );

    let idUser = "USR0001";

    if (lastUser.length > 0) {
      const nomor =
        parseInt(lastUser[0].id_user.replace("USR", "")) + 1;

      idUser = "USR" + nomor.toString().padStart(4, "0");
    }

    // Simpan user baru
    await pool.query(
      `INSERT INTO user_staff
      (id_user, id_role, nama, username, password)
      VALUES (?, ?, ?, ?, ?)`,
      [
        idUser,
        "ROL0007",
        nama,
        username,
        hash,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Register berhasil",
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// =======================
// LOGIN
// =======================
export const login = async (req, res) => {
  try {

    const { username, password } = req.body;

    const [rows] = await pool.query(
      "SELECT * FROM user_staff WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Username tidak ditemukan",
      });
    }

    const user = rows[0];

    const cocok = await bcrypt.compare(
      password,
      user.password
    );

    if (!cocok) {
      return res.status(401).json({
        success: false,
        message: "Password salah",
      });
    }

    const token = jwt.sign(
      {
        id: user.id_user,
        nama: user.nama,
        role: user.id_role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.json({
      success: true,
      message: "Login berhasil",
      token,
      user: {
        id: user.id_user,
        nama: user.nama,
        username: user.username,
        role: user.id_role,
      },
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });

  }
};