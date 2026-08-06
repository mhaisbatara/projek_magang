import pool from '../config/db.js';
import { formatNoAntrian, resolvePenjamin, resolveDokter } from './pendaftaranController.js';

async function generateNoRm(conn) {
  const [rows] = await conn.query(
    "SELECT no_rm FROM pasien ORDER BY no_rm DESC LIMIT 1 FOR UPDATE"
  );
  if (rows.length === 0) return "RM0001";
  const lastNumber = parseInt(rows[0].no_rm.replace("RM", ""), 10);
  return "RM" + String(lastNumber + 1).padStart(4, "0");
}

async function generateIdPasien(conn) {
  const [rows] = await conn.query(
    "SELECT id_pasien FROM pasien ORDER BY id_pasien DESC LIMIT 1 FOR UPDATE"
  );
  if (rows.length === 0) return "PSN0001";
  const lastNumber = parseInt(rows[0].id_pasien.replace("PSN", ""), 10);
  return "PSN" + String(lastNumber + 1).padStart(4, "0");
}

async function generateIdPendaftaran(conn) {
  const [rows] = await conn.query(
    "SELECT id_pendaftaran FROM pendaftaran ORDER BY id_pendaftaran DESC LIMIT 1 FOR UPDATE"
  );
  if (rows.length === 0) return "REG0001";
  const lastNumber = parseInt(rows[0].id_pendaftaran.replace("REG", ""), 10);
  return "REG" + String(lastNumber + 1).padStart(4, "0");
}

async function generateIdAntrian(conn) {
  const [rows] = await conn.query(
    "SELECT id_antrian FROM antrian ORDER BY id_antrian DESC LIMIT 1 FOR UPDATE"
  );
  if (rows.length === 0) return "ANT0001";
  const lastNumber = parseInt(rows[0].id_antrian.replace("ANT", ""), 10);
  return "ANT" + String(lastNumber + 1).padStart(4, "0");
}

async function generateNoUrut(conn, id_poli) {
  const [rows] = await conn.query(
    `SELECT COALESCE(MAX(a.no_urut), 0) AS max_no
     FROM antrian a
     JOIN pendaftaran p ON a.id_pendaftaran = p.id_pendaftaran
     WHERE p.id_poli = ? AND p.tanggal = CURDATE() FOR UPDATE`,
    [id_poli]
  );
  return (rows[0]?.max_no || 0) + 1;
}

export const createPasien = async (req, res) => {
  try {
    const { nik, nama, tgl_lahir, jk, alamat, telepon, poli, penjamin, dokter } = req.body;

    if (!nik || !nama || !tgl_lahir || !jk) {
      return res.status(400).json({ message: "NIK, nama, tanggal lahir, dan jenis kelamin wajib diisi" });
    }

    const [existing] = await pool.query("SELECT id_pasien FROM pasien WHERE nik = ?", [nik]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "NIK sudah terdaftar" });
    }

    // Lookup id_poli berdasarkan nama_poli (jika dikirim)
    let id_poli = null;
    let nama_poli = "";
    if (poli) {
      const [poliRow] = await pool.query(
        "SELECT id_poli, nama_poli FROM poli WHERE nama_poli = ? LIMIT 1",
        [poli]
      );
      if (poliRow.length > 0) {
        id_poli = poliRow[0].id_poli;
        nama_poli = poliRow[0].nama_poli;
      }
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const id_pasien = await generateIdPasien(conn);
      const no_rm = await generateNoRm(conn);

      // Insert patient
      await conn.query(
        "INSERT INTO pasien (id_pasien, id_poli, no_rm, nik, nama, tgl_lahir, jk, alamat, telepon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [id_pasien, id_poli, no_rm, nik, nama, tgl_lahir, jk, alamat, telepon]
      );

      let no_urut = null;
      let no_antrian = null;

      if (id_poli) {
        // Resolve penjamin
        const id_penjamin = await resolvePenjamin(conn, penjamin);

        // Resolve dokter
        const id_dokter = await resolveDokter(conn, id_poli, dokter);

        // Generate ids and queue
        const id_pendaftaran = await generateIdPendaftaran(conn);
        const id_antrian = await generateIdAntrian(conn);
        no_urut = await generateNoUrut(conn, id_poli);
        no_antrian = formatNoAntrian(id_poli, no_urut);

        // Insert pendaftaran
        await conn.query(
          `INSERT INTO pendaftaran (id_pendaftaran, id_pasien, id_poli, id_dokter, id_penjamin, tanggal, status)
           VALUES (?, ?, ?, ?, ?, CURDATE(), 'menunggu')`,
          [id_pendaftaran, id_pasien, id_poli, id_dokter, id_penjamin]
        );

        // Insert antrian
        await conn.query(
          `INSERT INTO antrian (id_antrian, id_pendaftaran, no_urut, status_panggil, waktu_panggil)
           VALUES (?, ?, ?, 'menunggu', NULL)`,
          [id_antrian, id_pendaftaran, no_urut]
        );
      }

      await conn.commit();

      return res.status(201).json({
        message: "Pasien berhasil didaftarkan",
        data: {
          id_pasien,
          id_poli,
          no_rm,
          nik,
          nama,
          tgl_lahir,
          jk,
          alamat,
          telepon,
          no_urut,
          no_antrian,
          nama_poli
        },
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

export const getAllPasien = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM pasien ORDER BY id_pasien DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

export const cariPasien = async (req, res) => {
  try {
    const { q } = req.query;
    const term = (q || "").trim();

    if (term.length < 2) {
      return res.status(400).json({ message: "Minimal 2 karakter untuk pencarian." });
    }

    const like = `%${term}%`;
    const [rows] = await pool.query(
      `SELECT p.id_pasien, p.no_rm, p.nik, p.nama, p.tgl_lahir, p.jk, p.alamat, p.telepon,
              p.id_poli, poli.nama_poli
       FROM pasien p
       LEFT JOIN poli ON poli.id_poli = p.id_poli
       WHERE p.nik LIKE ? OR p.no_rm LIKE ? OR p.nama LIKE ?
       ORDER BY p.nama ASC
       LIMIT 20`,
      [like, like, like]
    );

    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};
