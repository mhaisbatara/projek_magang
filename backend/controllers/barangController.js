import pool from "../config/db.js";

// --- GET ALL BARANG (Membaca semua data barang) ---
async function getBarang(req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM barang ORDER BY id DESC");
    return res.json(rows);
  } catch (err) {
    console.error("Get Barang Error:", err);
    return res.status(500).json({ message: "Gagal mengambil data barang" });
  }
}

// --- GET BARANG BY ID (Membaca satu barang berdasarkan ID) ---
async function getBarangById(req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM barang WHERE id = ?", [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Barang tidak ditemukan" });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error("Get Barang By ID Error:", err);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
}

// --- CREATE BARANG (Menambah barang baru) ---
async function createBarang(req, res) {
  const { nama, kategori } = req.body;

  if (!nama || !kategori) {
    return res.status(400).json({ message: "Nama dan kategori wajib diisi" });
  }

  try {
    // 1. Simpan barang baru ke database
    const [result] = await pool.query(
      "INSERT INTO barang (nama, kategori) VALUES (?, ?)",
      [nama, kategori]
    );

    // 2. Ambil data barang yang baru dimasukkan untuk dikirim ke frontend
    const [rows] = await pool.query("SELECT * FROM barang WHERE id = ?", [result.insertId]);
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Create Barang Error:", err);
    return res.status(500).json({ message: "Gagal menambah barang" });
  }
}

// --- UPDATE BARANG (Mengubah data barang) ---
async function updateBarang(req, res) {
  const { nama, kategori } = req.body;
  const { id } = req.params;

  try {
    // 1. Pastikan barang yang ingin diupdate ada di database
    const [existing] = await pool.query("SELECT * FROM barang WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "Barang tidak ditemukan" });
    }

    const current = existing[0];

    // 2. Lakukan update (gunakan data lama jika data baru tidak diisi)
    await pool.query(
      "UPDATE barang SET nama = ?, kategori = ? WHERE id = ?",
      [nama ?? current.nama, kategori ?? current.kategori, id]
    );

    // 3. Ambil data barang yang ter-update untuk dikirim kembali
    const [rows] = await pool.query("SELECT * FROM barang WHERE id = ?", [id]);
    return res.json(rows[0]);
  } catch (err) {
    console.error("Update Barang Error:", err);
    return res.status(500).json({ message: "Gagal mengupdate barang" });
  }
}

// --- DELETE BARANG (Menghapus barang) ---
async function deleteBarang(req, res) {
  const { id } = req.params;

  try {
    // 1. Cek ketersediaan barang
    const [existing] = await pool.query("SELECT * FROM barang WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "Barang tidak ditemukan" });
    }

    // 2. Hapus dari database
    await pool.query("DELETE FROM barang WHERE id = ?", [id]);
    return res.json({ message: "Barang berhasil dihapus", barang: existing[0] });
  } catch (err) {
    console.error("Delete Barang Error:", err);
    return res.status(500).json({ message: "Gagal menghapus barang" });
  }
}

export { getBarang, getBarangById, createBarang, updateBarang, deleteBarang };