import db from '../config/db.js';

async function generateNoRm() {
  const [rows] = await db.query("SELECT no_rm FROM pasien ORDER BY no_rm DESC LIMIT 1");
  if (rows.length === 0) return "RM0001";
  const lastNumber = parseInt(rows[0].no_rm.replace("RM", ""), 10);
  return "RM" + String(lastNumber + 1).padStart(4, "0");
}

async function generateIdPasien() {
  const [rows] = await db.query("SELECT id_pasien FROM pasien ORDER BY id_pasien DESC LIMIT 1");
  if (rows.length === 0) return "PSN0001";
  const lastNumber = parseInt(rows[0].id_pasien.replace("PSN", ""), 10);
  return "PSN" + String(lastNumber + 1).padStart(4, "0");
}

export const createPasien = async (req, res) => {
  try {
    const { nik, nama, tgl_lahir, jk, alamat, telepon } = req.body;

    if (!nik || !nama || !tgl_lahir || !jk) {
      return res.status(400).json({ message: "NIK, nama, tanggal lahir, dan jenis kelamin wajib diisi" });
    }

    const [existing] = await db.query("SELECT id_pasien FROM pasien WHERE nik = ?", [nik]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "NIK sudah terdaftar" });
    }

    const id_pasien = await generateIdPasien();
    const no_rm = await generateNoRm();

    await db.query(
      "INSERT INTO pasien (id_pasien, no_rm, nik, nama, tgl_lahir, jk, alamat, telepon) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id_pasien, no_rm, nik, nama, tgl_lahir, jk, alamat, telepon]
    );

    return res.status(201).json({
      message: "Pasien berhasil didaftarkan",
      data: { id_pasien, no_rm, nik, nama, tgl_lahir, jk, alamat, telepon },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

export const getAllPasien = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM pasien ORDER BY id_pasien DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};