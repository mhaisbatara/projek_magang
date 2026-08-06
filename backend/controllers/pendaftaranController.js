import pool from "../config/db.js";

// Helper to generate id_pendaftaran (e.g., REG0001) inside transaction
async function generateIdPendaftaran(conn) {
  const [rows] = await conn.query(
    "SELECT id_pendaftaran FROM pendaftaran ORDER BY id_pendaftaran DESC LIMIT 1 FOR UPDATE"
  );
  if (rows.length === 0) return "REG0001";
  const lastNumber = parseInt(rows[0].id_pendaftaran.replace("REG", ""), 10);
  return "REG" + String(lastNumber + 1).padStart(4, "0");
}

// Helper to generate id_antrian (e.g., ANT0001) inside transaction
async function generateIdAntrian(conn) {
  const [rows] = await conn.query(
    "SELECT id_antrian FROM antrian ORDER BY id_antrian DESC LIMIT 1 FOR UPDATE"
  );
  if (rows.length === 0) return "ANT0001";
  const lastNumber = parseInt(rows[0].id_antrian.replace("ANT", ""), 10);
  return "ANT" + String(lastNumber + 1).padStart(4, "0");
}

// Helper to generate no_urut inside transaction
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

// Helper to format queue ticket number (e.g., A-001)
export function formatNoAntrian(id_poli, no_urut) {
  const prefixMap = {
    "POL0001": "A", // Poli Umum
    "POL0002": "B", // Poli Gigi
    "POL0003": "C", // Poli Anak
    "POL0004": "D", // Poli KIA
    "POL0005": "E"  // Poli Penyakit Dalam
  };
  const letter = prefixMap[id_poli] || "Q";
  return `${letter}-${String(no_urut).padStart(3, "0")}`;
}

// Helper to resolve penjamin string to id_penjamin
export async function resolvePenjamin(conn, name) {
  if (!name) return "PJM0001"; // Default to Umum/Tunai
  const [rows] = await conn.query(
    "SELECT id_penjamin FROM penjamin WHERE nama_penjamin LIKE ? OR jenis LIKE ? LIMIT 1",
    [`%${name}%`, `%${name}%`]
  );
  if (rows.length > 0) return rows[0].id_penjamin;
  return "PJM0001";
}

// Helper to resolve doctor selection to id_dokter
export async function resolveDokter(conn, id_poli, doctorName) {
  if (doctorName && doctorName !== "Tanpa Preferensi (Otomatis)") {
    const cleanName = doctorName.replace("dr. ", "").replace("drg. ", "").split(",")[0].trim();
    const [rows] = await conn.query(
      "SELECT id_dokter FROM dokter WHERE nama LIKE ? LIMIT 1",
      [`%${cleanName}%`]
    );
    if (rows.length > 0) return rows[0].id_dokter;
  }
  // Fallback to scheduled doctor for this poli
  const [rows] = await conn.query(
    "SELECT id_dokter FROM jadwal_dokter WHERE id_poli = ? LIMIT 1",
    [id_poli]
  );
  if (rows.length > 0) return rows[0].id_dokter;

  // Fallback to any doctor
  const [anyDoc] = await conn.query("SELECT id_dokter FROM dokter LIMIT 1");
  return anyDoc[0]?.id_dokter || "DOK0001";
}

// GET /api/pendaftaran/poli
export const getPoliList = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM poli ORDER BY id_poli ASC");
    res.json(rows);
  } catch (err) {
    console.error("Gagal mendapatkan poli:", err);
    res.status(500).json({ message: "Gagal mengambil daftar poli", error: err.message });
  }
};

// POST /api/pendaftaran (Register Existing Patient)
export const createPendaftaran = async (req, res) => {
  const { id_pasien, poli, penjamin, dokter } = req.body;

  if (!id_pasien || !poli) {
    return res.status(400).json({ message: "id_pasien dan poli wajib diisi" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Resolve id_poli
    let id_poli = null;
    let nama_poli = "";
    if (poli.startsWith("POL")) {
      const [rows] = await conn.query("SELECT id_poli, nama_poli FROM poli WHERE id_poli = ? LIMIT 1", [poli]);
      if (rows.length > 0) {
        id_poli = rows[0].id_poli;
        nama_poli = rows[0].nama_poli;
      }
    } else {
      const [rows] = await conn.query("SELECT id_poli, nama_poli FROM poli WHERE nama_poli = ? LIMIT 1", [poli]);
      if (rows.length > 0) {
        id_poli = rows[0].id_poli;
        nama_poli = rows[0].nama_poli;
      }
    }

    if (!id_poli) {
      await conn.rollback();
      return res.status(404).json({ message: "Poliklinik tidak ditemukan" });
    }

    // 2. Resolve penjamin
    const id_penjamin = await resolvePenjamin(conn, penjamin);

    // 3. Resolve dokter
    const id_dokter = await resolveDokter(conn, id_poli, dokter);

    // 4. Generate ids and queue number
    const id_pendaftaran = await generateIdPendaftaran(conn);
    const id_antrian = await generateIdAntrian(conn);
    const no_urut = await generateNoUrut(conn, id_poli);
    const no_antrian = formatNoAntrian(id_poli, no_urut);

    // 5. Insert pendaftaran
    await conn.query(
      `INSERT INTO pendaftaran (id_pendaftaran, id_pasien, id_poli, id_dokter, id_penjamin, tanggal, status)
       VALUES (?, ?, ?, ?, ?, CURDATE(), 'menunggu')`,
      [id_pendaftaran, id_pasien, id_poli, id_dokter, id_penjamin]
    );

    // 6. Insert antrian
    await conn.query(
      `INSERT INTO antrian (id_antrian, id_pendaftaran, no_urut, status_panggil, waktu_panggil)
       VALUES (?, ?, ?, 'menunggu', NULL)`,
      [id_antrian, id_pendaftaran, no_urut]
    );

    // 7. Update id_poli on patient table (keep it in sync)
    await conn.query(
      `UPDATE pasien SET id_poli = ? WHERE id_pasien = ?`,
      [id_poli, id_pasien]
    );

    await conn.commit();

    res.status(201).json({
      message: "Pendaftaran berhasil",
      data: {
        id_pendaftaran,
        id_antrian,
        no_urut,
        no_antrian,
        nama_poli,
        id_pasien
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error("Gagal melakukan pendaftaran:", err);
    res.status(500).json({ message: "Terjadi kesalahan server", error: err.message });
  } finally {
    conn.release();
  }
};

// GET /api/pendaftaran/antrian (Get today's queue list)
export const getAntrianList = async (req, res) => {
  try {
    const { id_poli } = req.query;

    let query = `
      SELECT 
        a.id_antrian,
        a.id_pendaftaran,
        a.no_urut,
        a.status_panggil,
        a.waktu_panggil,
        p.id_poli,
        poli.nama_poli,
        p.id_pasien,
        pas.nama AS nama_pasien,
        pas.no_rm,
        pas.nik,
        pas.jk,
        pas.tgl_lahir,
        pen.nama_penjamin,
        dok.nama AS nama_dokter
      FROM antrian a
      JOIN pendaftaran p ON a.id_pendaftaran = p.id_pendaftaran
      JOIN poli ON p.id_poli = poli.id_poli
      JOIN pasien pas ON p.id_pasien = pas.id_pasien
      LEFT JOIN penjamin pen ON p.id_penjamin = pen.id_penjamin
      LEFT JOIN dokter dok ON p.id_dokter = dok.id_dokter
      WHERE p.tanggal = CURDATE()
    `;

    const params = [];
    if (id_poli) {
      query += " AND p.id_poli = ?";
      params.push(id_poli);
    }

    query += " ORDER BY a.status_panggil ASC, a.no_urut ASC";

    const [rows] = await pool.query(query, params);

    // Format queue numbers for response
    const formattedRows = rows.map(row => ({
      ...row,
      no_antrian: formatNoAntrian(row.id_poli, row.no_urut)
    }));

    res.json(formattedRows);
  } catch (err) {
    console.error("Gagal mengambil antrian:", err);
    res.status(500).json({ message: "Gagal mengambil daftar antrian", error: err.message });
  }
};

// PUT /api/pendaftaran/antrian/:id_antrian/status
export const updateAntrianStatus = async (req, res) => {
  const { id_antrian } = req.params;
  const { status_panggil } = req.body; // 'dipanggil' atau 'selesai'

  if (!['dipanggil', 'selesai'].includes(status_panggil)) {
    return res.status(400).json({ message: "Status tidak valid. Harus 'dipanggil' atau 'selesai'" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (status_panggil === "dipanggil") {
      // Update status_panggil and set waktu_panggil to NOW
      await conn.query(
        `UPDATE antrian 
         SET status_panggil = 'dipanggil', waktu_panggil = NOW() 
         WHERE id_antrian = ?`,
        [id_antrian]
      );
    } else if (status_panggil === "selesai") {
      // 1. Update status_panggil to selesai in antrian
      await conn.query(
        `UPDATE antrian 
         SET status_panggil = 'selesai' 
         WHERE id_antrian = ?`,
        [id_antrian]
      );

      // 2. Also update status to selesai in pendaftaran
      const [rows] = await conn.query(
        "SELECT id_pendaftaran FROM antrian WHERE id_antrian = ? LIMIT 1",
        [id_antrian]
      );
      if (rows.length > 0) {
        const id_pendaftaran = rows[0].id_pendaftaran;
        await conn.query(
          `UPDATE pendaftaran 
           SET status = 'selesai' 
           WHERE id_pendaftaran = ?`,
          [id_pendaftaran]
        );
      }
    }

    await conn.commit();

    res.json({
      message: `Status antrian berhasil diubah menjadi ${status_panggil}`
    });
  } catch (err) {
    await conn.rollback();
    console.error("Gagal mengubah status antrian:", err);
    res.status(500).json({ message: "Gagal memperbarui status antrian", error: err.message });
  } finally {
    conn.release();
  }
};
