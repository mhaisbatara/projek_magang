import pool from "../config/db.js";

// Helper to generate id_antrian (e.g., ANT01) inside transaction
async function generateIdAntrian(conn) {
  const [rows] = await conn.query(
    "SELECT id FROM mst_antrian ORDER BY id DESC LIMIT 1 FOR UPDATE"
  );
  if (rows.length === 0) return "ANT01";
  const lastNumber = parseInt(rows[0].id.replace("ANT", ""), 10);
  return "ANT" + String(lastNumber + 1).padStart(2, "0");
}

// Helper to generate kode_antrian (e.g., ANT-20260811-01), global daily sequence
async function generateKodeAntrian(conn) {
  const [[ymdRow]] = await conn.query("SELECT DATE_FORMAT(CURDATE(), '%Y%m%d') AS ymd");
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS total FROM mst_antrian WHERE tanggal = CURDATE() FOR UPDATE"
  );
  const seq = (rows[0]?.total || 0) + 1;
  return `ANT-${ymdRow.ymd}-${String(seq).padStart(3, "0")}`;
}

// Helper to generate no_urut (per-poli sequence today)
async function generateNoUrut(conn, kode_poli) {
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS total FROM mst_antrian WHERE kode_poli = ? AND tanggal = CURDATE() FOR UPDATE",
    [kode_poli]
  );
  return (rows[0]?.total || 0) + 1;
}

// Helper to format queue ticket number (e.g. A-001), letter per poli
export function formatNoAntrian(kode_poli, no_urut) {
  const huruf = {
    POL01: "A",
    POL02: "B",
    POL03: "C",
    POL04: "D",
    POL05: "E",
  };
  const letter = huruf[kode_poli] || "Q";
  return `${letter}-${String(no_urut).padStart(3, "0")}`;
}

// Helper to resolve penjamin string to kode_penjamin (e.g., PJM01)
export async function resolvePenjamin(conn, name) {
  const defaultPenjamin = async () => {
    const [rows] = await conn.query(
      "SELECT kode_penjamin FROM mst_penjamin WHERE jenis = 'Umum' LIMIT 1"
    );
    return rows[0]?.kode_penjamin || null;
  };

  if (!name) return defaultPenjamin();

  const base = String(name).split(" / ")[0].trim();
  const [rows] = await conn.query(
    "SELECT kode_penjamin FROM mst_penjamin WHERE jenis = ? LIMIT 1",
    [base]
  );
  if (rows.length > 0) return rows[0].kode_penjamin;

  const [byName] = await conn.query(
    "SELECT kode_penjamin FROM mst_penjamin WHERE nama_penjamin LIKE ? LIMIT 1",
    [`%${name}%`]
  );
  if (byName.length > 0) return byName[0].kode_penjamin;

  // Fallback: cocokkan berdasarkan kata kunci jenis (BPJS/Umum/Asuransi)
  const hint = ["BPJS", "Umum", "Asuransi"].find((k) =>
    base.toLowerCase().includes(k.toLowerCase())
  );
  if (hint) {
    const [byJenis] = await conn.query(
      "SELECT kode_penjamin FROM mst_penjamin WHERE jenis = ? LIMIT 1",
      [hint]
    );
    if (byJenis.length > 0) return byJenis[0].kode_penjamin;
  }

  return defaultPenjamin();
}

// Helper to resolve doctor selection to id_dokter
export async function resolveDokter(conn, kode_poli, doctorName) {
  if (doctorName && doctorName !== "Tanpa Preferensi (Otomatis)") {
    const cleanName = doctorName.replace("dr. ", "").replace("drg. ", "").split(",")[0].trim();
    const [rows] = await conn.query(
      "SELECT id FROM mst_dokter WHERE nama_dokter LIKE ? LIMIT 1",
      [`%${cleanName}%`]
    );
    if (rows.length > 0) return rows[0].id;
  }
  // Fallback to scheduled doctor for this poli
  const [rows] = await conn.query(
    `SELECT d.id
     FROM mst_jadwal_dokter j
     JOIN mst_dokter d ON d.no_sip = j.no_sip
     WHERE j.kode_poli = ?
     LIMIT 1`,
    [kode_poli]
  );
  if (rows.length > 0) return rows[0].id;

  // Fallback to any doctor
  const [anyDoc] = await conn.query("SELECT id FROM mst_dokter LIMIT 1");
  return anyDoc[0]?.id || "DOK01";
}

// GET /api/pendaftaran/poli
export const getPoliList = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id AS id_poli, nama_poli FROM mst_poli ORDER BY id ASC");
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
    if (String(poli).startsWith("POL")) {
      const [rows] = await conn.query("SELECT id, nama_poli FROM mst_poli WHERE id = ? LIMIT 1", [poli]);
      if (rows.length > 0) {
        id_poli = rows[0].id;
        nama_poli = rows[0].nama_poli;
      }
    } else {
      const [rows] = await conn.query("SELECT id, nama_poli FROM mst_poli WHERE nama_poli = ? LIMIT 1", [poli]);
      if (rows.length > 0) {
        id_poli = rows[0].id;
        nama_poli = rows[0].nama_poli;
      }
    }

    if (!id_poli) {
      await conn.rollback();
      return res.status(404).json({ message: "Poliklinik tidak ditemukan" });
    }

    // 2. Look up no_rm from pasien (antrian stores no_rm, not id_pasien)
    const [pasienRows] = await conn.query(
      "SELECT no_rm FROM mst_pasien WHERE id = ? FOR UPDATE",
      [id_pasien]
    );
    if (pasienRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Pasien tidak ditemukan" });
    }
    const no_rm = pasienRows[0].no_rm;

    // 3. Resolve penjamin (update on pasien)
    const id_penjamin = await resolvePenjamin(conn, penjamin);
    await conn.query(
      "UPDATE mst_pasien SET kode_penjamin = ? WHERE id = ?",
      [id_penjamin, id_pasien]
    );

    // 4. Generate antrian id and queue number
    const id_antrian = await generateIdAntrian(conn);
    const kode_antrian = await generateKodeAntrian(conn);
    const no_urut = await generateNoUrut(conn, id_poli);
    const no_antrian = formatNoAntrian(id_poli, no_urut);

    // 5. Insert antrian
    await conn.query(
       `INSERT INTO mst_antrian (id, kode_antrian, no_antrian, no_rm, kode_poli, tanggal, status_panggil)
       VALUES (?, ?, ?, ?, ?, CURDATE(), 'menunggu')`,
      [id_antrian, kode_antrian, no_antrian, no_rm, id_poli]
    );

    await conn.commit();

    res.status(201).json({
      message: "Pendaftaran berhasil",
      data: {
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
        a.id AS id_antrian,
        a.no_antrian,
        a.status_panggil,
        a.kode_poli AS id_poli,
        mst_poli.nama_poli,
        a.no_rm,
        pas.nama_pasien,
        pas.jk,
        pas.tanggal_lahir,
        pen.nama_penjamin
      FROM mst_antrian a
      JOIN mst_poli ON mst_poli.kode_poli = a.kode_poli
      JOIN mst_pasien pas ON pas.no_rm = a.no_rm
      LEFT JOIN mst_penjamin pen ON pen.kode_penjamin = pas.kode_penjamin
      WHERE a.tanggal = CURDATE()
    `;

    const params = [];
    if (id_poli) {
      query += " AND a.kode_poli = ?";
      params.push(id_poli);
    }

    query += " ORDER BY a.status_panggil ASC, a.no_antrian ASC";

    const [rows] = await pool.query(query, params);

    res.json(rows);
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

    await conn.query(
      `UPDATE mst_antrian SET status_panggil = ? WHERE id = ?`,
      [status_panggil, id_antrian]
    );

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
