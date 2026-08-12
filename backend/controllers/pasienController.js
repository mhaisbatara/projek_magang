import pool from '../config/db.js';
import { formatNoAntrian, resolvePenjamin } from './pendaftaranController.js';

async function generateIdPasien(conn) {
  const [rows] = await conn.query(
    "SELECT id FROM mst_pasien ORDER BY id DESC LIMIT 1 FOR UPDATE"
  );
  if (rows.length === 0) return "PSN01";
  const lastNumber = parseInt(rows[0].id.replace("PSN", ""), 10);
  return "PSN" + String(lastNumber + 1).padStart(2, "0");
}

async function generateNoRm(conn) {
  const [rows] = await conn.query(
    "SELECT no_rm FROM mst_pasien ORDER BY no_rm DESC LIMIT 1 FOR UPDATE"
  );
  if (rows.length === 0) return "RM0001";
  const lastNumber = parseInt(rows[0].no_rm.replace("RM", ""), 10);
  return "RM" + String(lastNumber + 1).padStart(4, "0");
}

async function generateIdAntrian(conn) {
  const [rows] = await conn.query(
    "SELECT id FROM mst_antrian ORDER BY id DESC LIMIT 1 FOR UPDATE"
  );
  if (rows.length === 0) return "ANT01";
  const lastNumber = parseInt(rows[0].id.replace("ANT", ""), 10);
  return "ANT" + String(lastNumber + 1).padStart(2, "0");
}

async function generateKodeAntrian(conn) {
  const [[ymdRow]] = await conn.query("SELECT DATE_FORMAT(CURDATE(), '%Y%m%d') AS ymd");
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS total FROM mst_antrian WHERE tanggal = CURDATE() FOR UPDATE"
  );
  const seq = (rows[0]?.total || 0) + 1;
  return `ANT-${ymdRow.ymd}-${String(seq).padStart(3, "0")}`;
}

async function generateNoUrut(conn, kode_poli) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS total FROM mst_antrian WHERE kode_poli = ? AND tanggal = CURDATE() FOR UPDATE`,
    [kode_poli]
  );
  return (rows[0]?.total || 0) + 1;
}

export const createPasien = async (req, res) => {
  try {
    const { nik, nama, tgl_lahir, jk, alamat, telepon, poli, penjamin, dokter } = req.body;

    if (!nik || String(nik).length !== 16) {
      return res.status(400).json({ message: "NIK wajib diisi 16 digit" });
    }
    if (!nama || !tgl_lahir || !jk) {
      return res.status(400).json({ message: "Nama, tanggal lahir, dan jenis kelamin wajib diisi" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const id_pasien = await generateIdPasien(conn);
      const no_rm = await generateNoRm(conn);

      // Resolve penjamin (stored on pasien table now)
      const id_penjamin = await resolvePenjamin(conn, penjamin);

      // Insert patient
      await conn.query(
        "INSERT INTO mst_pasien (id, no_rm, nik, nama_pasien, tanggal_lahir, jk, alamat, no_hp, kode_penjamin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [id_pasien, no_rm, nik, nama, tgl_lahir, jk, alamat, telepon, id_penjamin]
      );

      let no_urut = null;
      let no_antrian = null;
      let nama_poli = "";

      // If poli is provided, create antrian
      if (poli) {
        let id_poli = null;
        const [poliRow] = await conn.query(
          "SELECT id, nama_poli FROM mst_poli WHERE nama_poli = ? LIMIT 1",
          [poli]
        );
        if (poliRow.length > 0) {
          id_poli = poliRow[0].id;
          nama_poli = poliRow[0].nama_poli;

          const id_antrian = await generateIdAntrian(conn);
          const kode_antrian = await generateKodeAntrian(conn);
          no_urut = await generateNoUrut(conn, id_poli);
          no_antrian = formatNoAntrian(id_poli, no_urut);

          await conn.query(
            `INSERT INTO mst_antrian (id, kode_antrian, no_antrian, no_rm, kode_poli, tanggal, status_panggil)
             VALUES (?, ?, ?, ?, ?, CURDATE(), 'menunggu')`,
            [id_antrian, kode_antrian, no_antrian, no_rm, id_poli]
          );
        }
      }

      await conn.commit();

      return res.status(201).json({
        message: "Pasien berhasil didaftarkan",
        data: {
          id_pasien,
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
    const [rows] = await pool.query("SELECT * FROM mst_pasien ORDER BY id DESC");
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
      `SELECT p.id AS id_pasien, p.no_rm, p.nik, p.nama_pasien AS nama, p.tanggal_lahir AS tgl_lahir,
              p.jk, p.alamat, p.no_hp AS telepon, p.kode_penjamin AS id_penjamin,
              pen.nama_penjamin
       FROM mst_pasien p
       LEFT JOIN mst_penjamin pen ON pen.kode_penjamin = p.kode_penjamin
       WHERE p.no_rm LIKE ? OR p.nama_pasien LIKE ? OR p.nik LIKE ?
       ORDER BY p.nama_pasien ASC
       LIMIT 20`,
      [like, like, like]
    );

    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};