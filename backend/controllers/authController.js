import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Helper to generate id (e.g., USR01) inside transaction
async function generateIdUser(conn) {
  const [rows] = await conn.query(
    "SELECT id FROM mst_user ORDER BY id DESC LIMIT 1 FOR UPDATE"
  );
  if (rows.length === 0) return "USR01";
  const lastNumber = parseInt(rows[0].id.replace("USR", ""), 10);
  return "USR" + String(lastNumber + 1).padStart(2, "0");
}

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

    // Cek email
    const [cek] = await pool.query(
      "SELECT * FROM mst_user WHERE email = ?",
      [username]
    );

    if (cek.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email sudah digunakan",
      });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const idUser = await generateIdUser(conn);

      // Simpan user baru (role default: ROL01 / Super Admin)
      await conn.query(
        `INSERT INTO mst_user
        (id, kode_role, email, password)
        VALUES (?, ?, ?, ?)`,
        [
          idUser,
          "ROL01",
          username,
          hash,
        ]
      );

      await conn.commit();

      res.status(201).json({
        success: true,
        message: "Register berhasil",
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
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
      "SELECT * FROM mst_user WHERE email = ?",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Email tidak ditemukan",
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
        id: user.id,
        nama: user.email,
        role: user.kode_role,
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
        id: user.id,
        nama: user.email,
        username: user.email,
        role: user.kode_role,
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
