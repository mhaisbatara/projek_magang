import db from "../config/db.js";

// GET /pendaftaran/antrian-awal
export const getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT kode_antrian, no_antrian, status FROM nomor_antrian_awal ORDER BY no_antrian ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error("Gagal mengambil data antrean awal:", err);
    res.status(500).json({ message: "Gagal mengambil data antrean awal." });
  }
};

// PUT /pendaftaran/antrian-awal/:kode/status
// body: { status: "tersedia" | "terpakai" }
export const updateStatus = async (req, res) => {
  const { kode } = req.params;
  const { status } = req.body;

  if (!["tersedia", "terpakai"].includes(status)) {
    return res.status(400).json({ message: "Status tidak valid." });
  }

  try {
    const [result] = await db.query(
      "UPDATE nomor_antrian_awal SET status = ? WHERE kode_antrian = ?",
      [status, kode]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Nomor antrean awal tidak ditemukan." });
    }
    res.json({ message: "Status diperbarui." });
  } catch (err) {
    console.error("Gagal memperbarui status antrean awal:", err);
    res.status(500).json({ message: "Gagal memperbarui status." });
  }
};

// PUT /pendaftaran/antrian-awal/reset
// Reset semua nomor kembali ke "tersedia" (dipakai manual tiap awal hari kerja,
// karena tabel ini tidak punya kolom tanggal).
export const resetAll = async (req, res) => {
  try {
    await db.query("UPDATE nomor_antrian_awal SET status = 'tersedia'");
    res.json({ message: "Semua nomor antrean awal direset ke status tersedia." });
  } catch (err) {
    console.error("Gagal mereset antrean awal:", err);
    res.status(500).json({ message: "Gagal mereset antrean awal." });
  }
};