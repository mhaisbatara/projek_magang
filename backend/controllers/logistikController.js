import pool from "../config/db.js";

const BATAS_STOK_MENIPIS = 20;

async function generateId(conn, table, column, prefix) {
  const [rows] = await conn.query(
    `SELECT ${column} FROM ${table} ORDER BY ${column} DESC LIMIT 1 FOR UPDATE`
  );
  if (rows.length === 0) return prefix + "01";
  const lastNumber = parseInt(rows[0][column].replace(prefix, ""), 10);
  return prefix + String(lastNumber + 1).padStart(2, "0");
}

// Helper to generate kode_po (e.g., PO-20260811-001), global daily sequence
async function generateKodePo(conn) {
  const [[ymdRow]] = await conn.query("SELECT DATE_FORMAT(CURDATE(), '%Y%m%d') AS ymd");
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS total FROM mst_purchase_order WHERE tanggal_po = CURDATE() FOR UPDATE"
  );
  const seq = (rows[0]?.total || 0) + 1;
  return `PO-${ymdRow.ymd}-${String(seq).padStart(3, "0")}`;
}

// Helper to generate kode_obat (e.g., OBT011), sequential per max value
async function generateKodeObat(conn) {
  const [rows] = await conn.query(
    "SELECT kode_obat FROM mst_obat ORDER BY kode_obat DESC LIMIT 1 FOR UPDATE"
  );
  if (rows.length === 0) return "OBT001";
  const lastNumber = parseInt(rows[0].kode_obat.replace("OBT", ""), 10);
  return "OBT" + String(lastNumber + 1).padStart(3, "0");
}

async function catatAudit(conn, emailUser, aksi, tabelTerkait) {
  const idLog = await generateId(conn, "audit_log", "id", "LOG");
  await conn.query(
    "INSERT INTO audit_log (id, email_user, aksi, tabel_terkait, waktu) VALUES (?, ?, ?, ?, NOW())",
    [idLog, emailUser || null, (aksi || "").slice(0, 50), tabelTerkait]
  );
}

function statusStok(stok, minimum) {
  const batas = minimum || BATAS_STOK_MENIPIS;
  if (stok <= 0) return "habis";
  if (stok <= batas) return "menipis";
  return "aman";
}

// =======================
// DASHBOARD / SUMMARY
// =======================
export const getLogistikSummary = async (req, res) => {
  try {
    const [totalObat] = await pool.query(
      "SELECT COUNT(*) AS total FROM mst_obat"
    );

    const [stokMenipis] = await pool.query(
      "SELECT COUNT(*) AS total FROM mst_obat WHERE stok <= COALESCE(stok_minimum, ?)",
      [BATAS_STOK_MENIPIS]
    );

    const [totalStok] = await pool.query(
      "SELECT COALESCE(SUM(stok), 0) AS total FROM mst_obat"
    );

    const [poDiajukan] = await pool.query(
      "SELECT COUNT(*) AS total FROM mst_purchase_order WHERE status = 'draft'"
    );

    const [poDiproses] = await pool.query(
      "SELECT COUNT(*) AS total FROM mst_purchase_order WHERE status = 'dikirim'"
    );

    const [nilaiPembelian] = await pool.query(
      `SELECT COALESCE(SUM(pd.qty * pd.harga_satuan), 0) AS total
       FROM mst_purchase_order po
       JOIN mst_po_detail pd ON po.kode_po = pd.kode_po
       WHERE po.status = 'diterima'
         AND MONTH(po.tanggal_po) = MONTH(CURDATE())
         AND YEAR(po.tanggal_po) = YEAR(CURDATE())`
    );

    const [nilaiKasKeluar] = await pool.query(
      `SELECT COALESCE(SUM(jumlah), 0) AS total
       FROM trx_buku_kas
       WHERE jenis = 'keluar'
         AND MONTH(tanggal) = MONTH(CURDATE())
         AND YEAR(tanggal) = YEAR(CURDATE())`
    );

    const [obatMenipis] = await pool.query(
      `SELECT id AS id_obat, nama_obat, satuan, stok
       FROM mst_obat WHERE stok <= COALESCE(stok_minimum, ?) ORDER BY stok ASC`,
      [BATAS_STOK_MENIPIS]
    );

    const [poTerbaru] = await pool.query(
      `SELECT po.id AS id_po, po.tanggal_po, po.status,
              s.nama_supplier,
              COALESCE(SUM(pd.qty * pd.harga_satuan), 0) AS total
       FROM mst_purchase_order po
       LEFT JOIN mst_supplier s ON po.kode_supplier = s.kode_supplier
       LEFT JOIN mst_po_detail pd ON po.kode_po = pd.kode_po
       GROUP BY po.id
       ORDER BY po.tanggal_po DESC
       LIMIT 5`
    );

    res.json({
      kpi: {
        totalObat: totalObat[0].total,
        totalStok: totalStok[0].total,
        stokMenipis: stokMenipis[0].total,
        poDiajukan: poDiajukan[0].total,
        poDiproses: poDiproses[0].total,
        nilaiPembelianBulanIni: Number(nilaiPembelian[0].total),
        kasKeluarBulanIni: Number(nilaiKasKeluar[0].total),
      },
      obatMenipis,
      poTerbaru,
    });
  } catch (err) {
    console.error("Gagal mengambil summary logistik:", err);
    res.status(500).json({ message: "Gagal mengambil data summary", error: err.message });
  }
};

// =======================
// OBAT CRUD
// =======================
export const getAllObat = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id AS id_obat, nama_obat, kategori, satuan, harga_jual AS harga, stok, stok_minimum
       FROM mst_obat
       ORDER BY nama_obat ASC`
    );

    const result = rows.map((r) => ({
      ...r,
      harga: Number(r.harga),
      status_stok: statusStok(r.stok, r.stok_minimum),
    }));

    res.json(result);
  } catch (err) {
    console.error("Gagal mengambil daftar obat:", err);
    res.status(500).json({ message: "Gagal mengambil daftar obat", error: err.message });
  }
};

export const createObat = async (req, res) => {
  const { nama_obat, satuan, harga, stok, jenis_alkes } = req.body;

  if (!nama_obat || !harga) {
    return res.status(400).json({ message: "nama_obat dan harga wajib diisi" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const id_obat = await generateId(conn, "mst_obat", "id", "OBT");
    const kode_obat = await generateKodeObat(conn);

    await conn.query(
      "INSERT INTO mst_obat (id, kode_obat, nama_obat, kategori, satuan, stok, harga_beli, harga_jual, stok_minimum) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id_obat, kode_obat, nama_obat, jenis_alkes || null, satuan || null, stok || 0, 0, harga, BATAS_STOK_MENIPIS]
    );

    await catatAudit(conn, req.user?.nama, `Menambahkan obat baru: ${nama_obat}`, "obat");

    await conn.commit();

    res.status(201).json({
      message: "Obat berhasil ditambahkan",
      data: { id_obat, nama_obat, satuan, harga, stok: stok || 0 },
    });
  } catch (err) {
    await conn.rollback();
    console.error("Gagal menambahkan obat:", err);
    res.status(500).json({ message: "Gagal menambahkan obat", error: err.message });
  } finally {
    conn.release();
  }
};

export const updateObat = async (req, res) => {
  const { id_obat } = req.params;
  const { nama_obat, satuan, harga, stok, jenis_alkes } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query(
      "SELECT * FROM mst_obat WHERE id = ? FOR UPDATE",
      [id_obat]
    );

    if (existing.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Obat tidak ditemukan" });
    }

    await conn.query(
      `UPDATE mst_obat SET
        nama_obat = COALESCE(?, nama_obat),
        kategori = COALESCE(?, kategori),
        satuan = COALESCE(?, satuan),
        harga_jual = COALESCE(?, harga_jual),
        stok = COALESCE(?, stok)
       WHERE id = ?`,
      [nama_obat, jenis_alkes, satuan, harga, stok, id_obat]
    );

    await catatAudit(conn, req.user?.nama, `Mengubah data obat: ${existing[0].nama_obat}`, "obat");

    await conn.commit();

    res.json({ message: "Obat berhasil diperbarui" });
  } catch (err) {
    await conn.rollback();
    console.error("Gagal memperbarui obat:", err);
    res.status(500).json({ message: "Gagal memperbarui obat", error: err.message });
  } finally {
    conn.release();
  }
};

export const deleteObat = async (req, res) => {
  const { id_obat } = req.params;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query(
      "SELECT nama_obat FROM mst_obat WHERE id = ? FOR UPDATE",
      [id_obat]
    );

    if (existing.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Obat tidak ditemukan" });
    }

    await conn.query("DELETE FROM mst_obat WHERE id = ?", [id_obat]);

    await catatAudit(conn, req.user?.nama, `Menghapus obat: ${existing[0].nama_obat}`, "obat");

    await conn.commit();

    res.json({ message: "Obat berhasil dihapus" });
  } catch (err) {
    await conn.rollback();
    console.error("Gagal menghapus obat:", err);
    res.status(500).json({ message: "Gagal menghapus obat", error: err.message });
  } finally {
    conn.release();
  }
};

export const cariObat = async (req, res) => {
  try {
    const { q } = req.query;
    const term = (q || "").trim();

    if (term.length < 2) {
      return res.status(400).json({ message: "Minimal 2 karakter untuk pencarian." });
    }

    const like = `%${term}%`;
    const [rows] = await pool.query(
      `SELECT id AS id_obat, nama_obat, satuan, harga_jual AS harga, stok
       FROM mst_obat
       WHERE nama_obat LIKE ? OR id LIKE ?
       ORDER BY nama_obat ASC
       LIMIT 20`,
      [like, like]
    );

    res.json(rows);
  } catch (err) {
    console.error("Gagal mencari obat:", err);
    res.status(500).json({ message: "Gagal mencari obat", error: err.message });
  }
};

// =======================
// SUPPLIER CRUD
// =======================
export const getAllSupplier = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id AS id_supplier, s.nama_supplier, s.kontak,
              (SELECT COUNT(*) FROM mst_purchase_order po WHERE po.kode_supplier = s.kode_supplier) AS jumlah_po
       FROM mst_supplier s
       ORDER BY s.nama_supplier ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error("Gagal mengambil daftar supplier:", err);
    res.status(500).json({ message: "Gagal mengambil daftar supplier", error: err.message });
  }
};

export const createSupplier = async (req, res) => {
  const { nama_supplier, kontak } = req.body;

  if (!nama_supplier) {
    return res.status(400).json({ message: "nama_supplier wajib diisi" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const id_supplier = await generateId(conn, "mst_supplier", "id", "SUP");

    await conn.query(
      "INSERT INTO mst_supplier (id, kode_supplier, nama_supplier, kontak) VALUES (?, ?, ?, ?)",
      [id_supplier, id_supplier, nama_supplier, kontak || null]
    );

    await catatAudit(conn, req.user?.nama, `Menambahkan supplier: ${nama_supplier}`, "supplier");

    await conn.commit();

    res.status(201).json({
      message: "Supplier berhasil ditambahkan",
      data: { id_supplier, nama_supplier, kontak },
    });
  } catch (err) {
    await conn.rollback();
    console.error("Gagal menambahkan supplier:", err);
    res.status(500).json({ message: "Gagal menambahkan supplier", error: err.message });
  } finally {
    conn.release();
  }
};

export const updateSupplier = async (req, res) => {
  const { id_supplier } = req.params;
  const { nama_supplier, kontak } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query(
      "SELECT * FROM mst_supplier WHERE id = ? FOR UPDATE",
      [id_supplier]
    );

    if (existing.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Supplier tidak ditemukan" });
    }

    await conn.query(
      `UPDATE mst_supplier SET
        nama_supplier = COALESCE(?, nama_supplier),
        kontak = COALESCE(?, kontak)
       WHERE id = ?`,
      [nama_supplier, kontak, id_supplier]
    );

    await catatAudit(conn, req.user?.nama, `Mengubah data supplier: ${existing[0].nama_supplier}`, "supplier");

    await conn.commit();

    res.json({ message: "Supplier berhasil diperbarui" });
  } catch (err) {
    await conn.rollback();
    console.error("Gagal memperbarui supplier:", err);
    res.status(500).json({ message: "Gagal memperbarui supplier", error: err.message });
  } finally {
    conn.release();
  }
};

export const deleteSupplier = async (req, res) => {
  const { id_supplier } = req.params;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query(
      "SELECT nama_supplier FROM mst_supplier WHERE id = ? FOR UPDATE",
      [id_supplier]
    );

    if (existing.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Supplier tidak ditemukan" });
    }

    const [poCheck] = await conn.query(
      "SELECT COUNT(*) AS total FROM mst_purchase_order WHERE kode_supplier = ?",
      [id_supplier]
    );

    if (poCheck[0].total > 0) {
      await conn.rollback();
      return res.status(409).json({
        message: `Tidak dapat menghapus supplier yang masih memiliki ${poCheck[0].total} purchase order`,
      });
    }

    await conn.query("DELETE FROM mst_supplier WHERE id = ?", [id_supplier]);

    await catatAudit(conn, req.user?.nama, `Menghapus supplier: ${existing[0].nama_supplier}`, "supplier");

    await conn.commit();

    res.json({ message: "Supplier berhasil dihapus" });
  } catch (err) {
    await conn.rollback();
    console.error("Gagal menghapus supplier:", err);
    res.status(500).json({ message: "Gagal menghapus supplier", error: err.message });
  } finally {
    conn.release();
  }
};

// =======================
// PURCHASE ORDER
// =======================
export const getAllPO = async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT po.id AS id_po, po.tanggal_po, po.status,
             s.id AS id_supplier, s.nama_supplier,
             COUNT(pd.id) AS jumlah_item,
             COALESCE(SUM(pd.qty * pd.harga_satuan), 0) AS total_nilai
      FROM mst_purchase_order po
      LEFT JOIN mst_supplier s ON po.kode_supplier = s.kode_supplier
      LEFT JOIN mst_po_detail pd ON po.kode_po = pd.kode_po
    `;

    const params = [];
    if (status) {
      query += " WHERE po.status = ?";
      params.push(status);
    }

    query += " GROUP BY po.id ORDER BY po.tanggal_po DESC, po.id DESC";

    const [rows] = await pool.query(query, params);

    res.json(rows.map((r) => ({ ...r, total_nilai: Number(r.total_nilai) })));
  } catch (err) {
    console.error("Gagal mengambil daftar PO:", err);
    res.status(500).json({ message: "Gagal mengambil daftar PO", error: err.message });
  }
};

export const getPOById = async (req, res) => {
  try {
    const { id_po } = req.params;

    const [poRows] = await pool.query(
      `SELECT po.id AS id_po, po.kode_po, po.tanggal_po, po.status,
              s.id AS id_supplier, s.nama_supplier, s.kontak
       FROM mst_purchase_order po
       LEFT JOIN mst_supplier s ON po.kode_supplier = s.kode_supplier
       WHERE po.id = ?`,
      [id_po]
    );

    if (poRows.length === 0) {
      return res.status(404).json({ message: "Purchase order tidak ditemukan" });
    }

    const [details] = await pool.query(
      `SELECT pd.id AS id_po_detail, pd.kode_obat AS id_obat, pd.qty AS jumlah, pd.harga_satuan,
              o.nama_obat, o.satuan
       FROM mst_po_detail pd
       LEFT JOIN mst_obat o ON o.kode_obat = pd.kode_obat
       WHERE pd.kode_po = ?
       ORDER BY pd.id ASC`,
      [poRows[0].kode_po]
    );

    const total_nilai = details.reduce(
      (sum, d) => sum + Number(d.harga_satuan) * d.jumlah,
      0
    );

    res.json({
      ...poRows[0],
      items: details.map((d) => ({ ...d, harga_satuan: Number(d.harga_satuan) })),
      total_nilai,
    });
  } catch (err) {
    console.error("Gagal mengambil detail PO:", err);
    res.status(500).json({ message: "Gagal mengambil detail PO", error: err.message });
  }
};

export const createPO = async (req, res) => {
  const { id_supplier, items } = req.body;

  if (!id_supplier || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "id_supplier dan items (minimal 1) wajib diisi",
    });
  }

  for (const item of items) {
    if (!item.id_obat || !item.jumlah || !item.harga_satuan) {
      return res.status(400).json({
        message: "Setiap item harus memiliki id_obat, jumlah, dan harga_satuan",
      });
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [supplier] = await conn.query(
      "SELECT nama_supplier FROM mst_supplier WHERE id = ? FOR UPDATE",
      [id_supplier]
    );

    if (supplier.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Supplier tidak ditemukan" });
    }

    const id_po = await generateId(conn, "mst_purchase_order", "id", "PO");
    const kode_po = await generateKodePo(conn);

    await conn.query(
      "INSERT INTO mst_purchase_order (id, kode_po, kode_supplier, tanggal_po, status) VALUES (?, ?, ?, CURDATE(), 'draft')",
      [id_po, kode_po, id_supplier]
    );

    for (const item of items) {
      const id_po_detail = await generateId(conn, "mst_po_detail", "id", "POD");

      const [obat] = await conn.query(
        "SELECT kode_obat FROM mst_obat WHERE id = ? FOR UPDATE",
        [item.id_obat]
      );
      if (obat.length === 0) {
        await conn.rollback();
        return res.status(404).json({ message: `Obat dengan id ${item.id_obat} tidak ditemukan` });
      }

      await conn.query(
        "INSERT INTO mst_po_detail (id, kode_po, kode_obat, qty, harga_satuan) VALUES (?, ?, ?, ?, ?)",
        [id_po_detail, kode_po, obat[0].kode_obat, item.jumlah, item.harga_satuan]
      );
    }

    await catatAudit(
      conn,
      req.user?.nama,
      `Membuat purchase order ${kode_po} ke ${supplier[0].nama_supplier}`,
      "purchase_order"
    );

    await conn.commit();

    res.status(201).json({
      message: "Purchase order berhasil dibuat",
      data: { id_po, kode_po, id_supplier, status: "draft", jumlah_item: items.length },
    });
  } catch (err) {
    await conn.rollback();
    console.error("Gagal membuat PO:", err);
    res.status(500).json({ message: "Gagal membuat purchase order", error: err.message });
  } finally {
    conn.release();
  }
};

export const updateStatusPO = async (req, res) => {
  const { id_po } = req.params;
  const { status } = req.body;

  const validStatus = ["draft", "dikirim", "batal"];
  if (!validStatus.includes(status)) {
    return res.status(400).json({
      message: "Status tidak valid. Gunakan: draft, dikirim, atau batal",
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query(
      "SELECT * FROM mst_purchase_order WHERE id = ? FOR UPDATE",
      [id_po]
    );

    if (existing.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Purchase order tidak ditemukan" });
    }

    if (existing[0].status === "diterima") {
      await conn.rollback();
      return res.status(400).json({ message: "PO yang sudah diterima tidak dapat diubah statusnya" });
    }

    await conn.query(
      "UPDATE mst_purchase_order SET status = ? WHERE id = ?",
      [status, id_po]
    );

    await catatAudit(
      conn,
      req.user?.nama,
      `Mengubah status PO ${existing[0].kode_po} menjadi ${status}`,
      "purchase_order"
    );

    await conn.commit();

    res.json({ message: `Status PO berhasil diubah menjadi ${status}` });
  } catch (err) {
    await conn.rollback();
    console.error("Gagal mengubah status PO:", err);
    res.status(500).json({ message: "Gagal mengubah status PO", error: err.message });
  } finally {
    conn.release();
  }
};

export const terimaPO = async (req, res) => {
  const { id_po } = req.params;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [poRows] = await conn.query(
      "SELECT * FROM mst_purchase_order WHERE id = ? FOR UPDATE",
      [id_po]
    );

    if (poRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Purchase order tidak ditemukan" });
    }

    const po = poRows[0];

    if (po.status === "diterima") {
      await conn.rollback();
      return res.status(400).json({ message: "PO sudah pernah diterima" });
    }

    if (po.status === "batal") {
      await conn.rollback();
      return res.status(400).json({ message: "PO yang dibatalkan tidak dapat diterima" });
    }

    const [details] = await conn.query(
      "SELECT kode_obat, qty AS jumlah, harga_satuan FROM mst_po_detail WHERE kode_po = ?",
      [po.kode_po]
    );

    if (details.length === 0) {
      await conn.rollback();
      return res.status(400).json({ message: "PO tidak memiliki item" });
    }

    let totalNilai = 0;

    for (const item of details) {
      totalNilai += Number(item.harga_satuan) * item.jumlah;

      await conn.query(
        "UPDATE mst_obat SET stok = stok + ? WHERE kode_obat = ?",
        [item.jumlah, item.kode_obat]
      );
    }

    await conn.query(
      "UPDATE mst_purchase_order SET status = 'diterima' WHERE id = ?",
      [id_po]
    );

    const id_kas = await generateId(conn, "trx_buku_kas", "id", "KAS");
    await conn.query(
      `INSERT INTO trx_buku_kas (id, tanggal, jenis, kategori, keterangan, jumlah, email_user)
       VALUES (?, CURDATE(), 'keluar', 'Pembelian Obat', ?, ?, ?)`,
      [id_kas, `Penerimaan PO ${po.kode_po}`, totalNilai, req.user?.nama || null]
    );

    await catatAudit(
      conn,
      req.user?.nama,
      `Menerima PO ${po.kode_po}, total Rp ${totalNilai}`,
      "purchase_order"
    );

    await conn.commit();

    res.json({
      message: "PO berhasil diterima, stok dan buku kas telah diperbarui",
      data: {
        id_po,
        total_nilai: totalNilai,
        id_kas,
        items_diterima: details.length,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error("Gagal menerima PO:", err);
    res.status(500).json({ message: "Gagal menerima PO", error: err.message });
  } finally {
    conn.release();
  }
};

// =======================
// BUKU KAS
// =======================
export const getBukuKas = async (req, res) => {
  try {
    const { jenis_transaksi, limit } = req.query;

    let query = `
      SELECT id AS id_kas, tanggal, jenis AS jenis_transaksi, kategori, jumlah, keterangan
      FROM trx_buku_kas
    `;
    const params = [];
    const conditions = [];

    if (jenis_transaksi) {
      conditions.push("jenis = ?");
      params.push(jenis_transaksi);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY tanggal DESC, id DESC";

    if (limit) {
      query += " LIMIT ?";
      params.push(parseInt(limit, 10));
    }

    const [rows] = await pool.query(query, params);

    const [ringkasan] = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN jenis = 'masuk' THEN jumlah ELSE 0 END), 0) AS total_masuk,
        COALESCE(SUM(CASE WHEN jenis = 'keluar' THEN jumlah ELSE 0 END), 0) AS total_keluar
       FROM trx_buku_kas`
    );

    res.json({
      transaksi: rows.map((r) => ({ ...r, jumlah: Number(r.jumlah) })),
      ringkasan: {
        total_masuk: Number(ringkasan[0].total_masuk),
        total_keluar: Number(ringkasan[0].total_keluar),
        saldo: Number(ringkasan[0].total_masuk) - Number(ringkasan[0].total_keluar),
      },
    });
  } catch (err) {
    console.error("Gagal mengambil buku kas:", err);
    res.status(500).json({ message: "Gagal mengambil buku kas", error: err.message });
  }
};
