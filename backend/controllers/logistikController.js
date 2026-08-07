import pool from "../config/db.js";

const BATAS_STOK_MENIPIS = 20;

async function generateId(conn, table, column, prefix) {
  const [rows] = await conn.query(
    `SELECT ${column} FROM ${table} ORDER BY ${column} DESC LIMIT 1 FOR UPDATE`
  );
  if (rows.length === 0) return prefix + "0001";
  const lastNumber = parseInt(rows[0][column].replace(prefix, ""), 10);
  return prefix + String(lastNumber + 1).padStart(4, "0");
}

async function catatAudit(conn, idUser, aktivitas, modul) {
  const idLog = await generateId(conn, "audit_log", "id_log", "LOG");
  await conn.query(
    "INSERT INTO audit_log (id_log, id_user, aktivitas, modul, waktu) VALUES (?, ?, ?, ?, NOW())",
    [idLog, idUser || "USR0001", aktivitas, modul]
  );
}

function statusStok(stok) {
  if (stok <= 0) return "habis";
  if (stok <= BATAS_STOK_MENIPIS) return "menipis";
  return "aman";
}

// =======================
// DASHBOARD / SUMMARY
// =======================
export const getLogistikSummary = async (req, res) => {
  try {
    const [totalObat] = await pool.query(
      "SELECT COUNT(*) AS total FROM obat"
    );

    const [stokMenipis] = await pool.query(
      "SELECT COUNT(*) AS total FROM obat WHERE stok <= ?",
      [BATAS_STOK_MENIPIS]
    );

    const [totalStok] = await pool.query(
      "SELECT COALESCE(SUM(stok), 0) AS total FROM obat"
    );

    const [poDiajukan] = await pool.query(
      "SELECT COUNT(*) AS total FROM purchase_order WHERE status = 'diajukan'"
    );

    const [poDiproses] = await pool.query(
      "SELECT COUNT(*) AS total FROM purchase_order WHERE status = 'diproses'"
    );

    const [nilaiPembelian] = await pool.query(
      `SELECT COALESCE(SUM(pd.jumlah * pd.harga_satuan), 0) AS total
       FROM purchase_order po
       JOIN po_detail pd ON po.id_po = pd.id_po
       WHERE po.status = 'diterima'
         AND MONTH(po.tanggal_po) = MONTH(CURDATE())
         AND YEAR(po.tanggal_po) = YEAR(CURDATE())`
    );

    const [nilaiKasKeluar] = await pool.query(
      `SELECT COALESCE(SUM(jumlah), 0) AS total
       FROM buku_kas
       WHERE jenis_transaksi = 'keluar'
         AND MONTH(tanggal) = MONTH(CURDATE())
         AND YEAR(tanggal) = YEAR(CURDATE())`
    );

    const [obatMenipis] = await pool.query(
      `SELECT id_obat, nama_obat, satuan, stok
       FROM obat WHERE stok <= ? ORDER BY stok ASC`,
      [BATAS_STOK_MENIPIS]
    );

    const [poTerbaru] = await pool.query(
      `SELECT po.id_po, po.tanggal_po, po.status,
              s.nama_supplier,
              COALESCE(SUM(pd.jumlah * pd.harga_satuan), 0) AS total
       FROM purchase_order po
       LEFT JOIN supplier s ON po.id_supplier = s.id_supplier
       LEFT JOIN po_detail pd ON po.id_po = pd.id_po
       GROUP BY po.id_po
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
      `SELECT o.id_obat, o.nama_obat, o.satuan, o.harga, o.stok,
              i.id_inventori, i.jumlah_stok, i.tanggal_update, i.jenis_alkes
       FROM obat o
       LEFT JOIN inventori i ON o.id_obat = i.id_obat
       ORDER BY o.nama_obat ASC`
    );

    const result = rows.map((r) => ({
      ...r,
      harga: Number(r.harga),
      status_stok: statusStok(r.stok),
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

    const id_obat = await generateId(conn, "obat", "id_obat", "OBT");
    const id_inventori = await generateId(conn, "inventori", "id_inventori", "INV");

    await conn.query(
      "INSERT INTO obat (id_obat, nama_obat, satuan, harga, stok) VALUES (?, ?, ?, ?, ?)",
      [id_obat, nama_obat, satuan || null, harga, stok || 0]
    );

    await conn.query(
      "INSERT INTO inventori (id_inventori, id_obat, jumlah_stok, tanggal_update, jenis_alkes) VALUES (?, ?, ?, CURDATE(), ?)",
      [id_inventori, id_obat, stok || 0, jenis_alkes || null]
    );

    await catatAudit(conn, req.user?.id, `Menambahkan obat baru: ${nama_obat}`, "Logistik");

    await conn.commit();

    res.status(201).json({
      message: "Obat berhasil ditambahkan",
      data: { id_obat, id_inventori, nama_obat, satuan, harga, stok: stok || 0 },
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
      "SELECT * FROM obat WHERE id_obat = ? FOR UPDATE",
      [id_obat]
    );

    if (existing.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Obat tidak ditemukan" });
    }

    await conn.query(
      `UPDATE obat SET
        nama_obat = COALESCE(?, nama_obat),
        satuan = COALESCE(?, satuan),
        harga = COALESCE(?, harga),
        stok = COALESCE(?, stok)
       WHERE id_obat = ?`,
      [nama_obat, satuan, harga, stok, id_obat]
    );

    if (stok !== undefined || jenis_alkes !== undefined) {
      await conn.query(
        `UPDATE inventori SET
          jumlah_stok = COALESCE(?, jumlah_stok),
          jenis_alkes = COALESCE(?, jenis_alkes),
          tanggal_update = CURDATE()
         WHERE id_obat = ?`,
        [stok, jenis_alkes, id_obat]
      );
    }

    await catatAudit(conn, req.user?.id, `Mengubah data obat: ${existing[0].nama_obat}`, "Logistik");

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
      "SELECT nama_obat FROM obat WHERE id_obat = ? FOR UPDATE",
      [id_obat]
    );

    if (existing.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Obat tidak ditemukan" });
    }

    await conn.query("DELETE FROM inventori WHERE id_obat = ?", [id_obat]);
    await conn.query("DELETE FROM obat WHERE id_obat = ?", [id_obat]);

    await catatAudit(conn, req.user?.id, `Menghapus obat: ${existing[0].nama_obat}`, "Logistik");

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
      `SELECT id_obat, nama_obat, satuan, harga, stok
       FROM obat
       WHERE nama_obat LIKE ? OR id_obat LIKE ?
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
      `SELECT s.id_supplier, s.nama_supplier, s.kontak,
              (SELECT COUNT(*) FROM purchase_order po WHERE po.id_supplier = s.id_supplier) AS jumlah_po
       FROM supplier s
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

    const id_supplier = await generateId(conn, "supplier", "id_supplier", "SUP");

    await conn.query(
      "INSERT INTO supplier (id_supplier, nama_supplier, kontak) VALUES (?, ?, ?)",
      [id_supplier, nama_supplier, kontak || null]
    );

    await catatAudit(conn, req.user?.id, `Menambahkan supplier: ${nama_supplier}`, "Logistik");

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
      "SELECT * FROM supplier WHERE id_supplier = ? FOR UPDATE",
      [id_supplier]
    );

    if (existing.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Supplier tidak ditemukan" });
    }

    await conn.query(
      `UPDATE supplier SET
        nama_supplier = COALESCE(?, nama_supplier),
        kontak = COALESCE(?, kontak)
       WHERE id_supplier = ?`,
      [nama_supplier, kontak, id_supplier]
    );

    await catatAudit(conn, req.user?.id, `Mengubah data supplier: ${existing[0].nama_supplier}`, "Logistik");

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
      "SELECT nama_supplier FROM supplier WHERE id_supplier = ? FOR UPDATE",
      [id_supplier]
    );

    if (existing.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Supplier tidak ditemukan" });
    }

    const [poCheck] = await conn.query(
      "SELECT COUNT(*) AS total FROM purchase_order WHERE id_supplier = ?",
      [id_supplier]
    );

    if (poCheck[0].total > 0) {
      await conn.rollback();
      return res.status(409).json({
        message: `Tidak dapat menghapus supplier yang masih memiliki ${poCheck[0].total} purchase order`,
      });
    }

    await conn.query("DELETE FROM supplier WHERE id_supplier = ?", [id_supplier]);

    await catatAudit(conn, req.user?.id, `Menghapus supplier: ${existing[0].nama_supplier}`, "Logistik");

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
      SELECT po.id_po, po.tanggal_po, po.status,
             s.id_supplier, s.nama_supplier,
             COUNT(pd.id_po_detail) AS jumlah_item,
             COALESCE(SUM(pd.jumlah * pd.harga_satuan), 0) AS total_nilai
      FROM purchase_order po
      LEFT JOIN supplier s ON po.id_supplier = s.id_supplier
      LEFT JOIN po_detail pd ON po.id_po = pd.id_po
    `;

    const params = [];
    if (status) {
      query += " WHERE po.status = ?";
      params.push(status);
    }

    query += " GROUP BY po.id_po ORDER BY po.tanggal_po DESC, po.id_po DESC";

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
      `SELECT po.id_po, po.tanggal_po, po.status,
              s.id_supplier, s.nama_supplier, s.kontak
       FROM purchase_order po
       LEFT JOIN supplier s ON po.id_supplier = s.id_supplier
       WHERE po.id_po = ?`,
      [id_po]
    );

    if (poRows.length === 0) {
      return res.status(404).json({ message: "Purchase order tidak ditemukan" });
    }

    const [details] = await pool.query(
      `SELECT pd.id_po_detail, pd.id_obat, pd.jumlah, pd.harga_satuan,
              o.nama_obat, o.satuan
       FROM po_detail pd
       LEFT JOIN obat o ON pd.id_obat = o.id_obat
       WHERE pd.id_po = ?
       ORDER BY pd.id_po_detail ASC`,
      [id_po]
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
      "SELECT nama_supplier FROM supplier WHERE id_supplier = ? FOR UPDATE",
      [id_supplier]
    );

    if (supplier.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Supplier tidak ditemukan" });
    }

    const id_po = await generateId(conn, "purchase_order", "id_po", "PO");

    await conn.query(
      "INSERT INTO purchase_order (id_po, id_supplier, tanggal_po, status) VALUES (?, ?, CURDATE(), 'diajukan')",
      [id_po, id_supplier]
    );

    for (const item of items) {
      const id_po_detail = await generateId(conn, "po_detail", "id_po_detail", "POD");
      await conn.query(
        "INSERT INTO po_detail (id_po_detail, id_po, id_obat, jumlah, harga_satuan) VALUES (?, ?, ?, ?, ?)",
        [id_po_detail, id_po, item.id_obat, item.jumlah, item.harga_satuan]
      );
    }

    await catatAudit(
      conn,
      req.user?.id,
      `Membuat purchase order ${id_po} ke ${supplier[0].nama_supplier}`,
      "Logistik"
    );

    await conn.commit();

    res.status(201).json({
      message: "Purchase order berhasil dibuat",
      data: { id_po, id_supplier, status: "diajukan", jumlah_item: items.length },
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

  const validStatus = ["diajukan", "diproses", "batal"];
  if (!validStatus.includes(status)) {
    return res.status(400).json({
      message: "Status tidak valid. Gunakan: diajukan, diproses, atau batal",
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query(
      "SELECT * FROM purchase_order WHERE id_po = ? FOR UPDATE",
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
      "UPDATE purchase_order SET status = ? WHERE id_po = ?",
      [status, id_po]
    );

    await catatAudit(
      conn,
      req.user?.id,
      `Mengubah status PO ${id_po} menjadi ${status}`,
      "Logistik"
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
      "SELECT * FROM purchase_order WHERE id_po = ? FOR UPDATE",
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
      "SELECT id_obat, jumlah, harga_satuan FROM po_detail WHERE id_po = ?",
      [id_po]
    );

    if (details.length === 0) {
      await conn.rollback();
      return res.status(400).json({ message: "PO tidak memiliki item" });
    }

    let totalNilai = 0;

    for (const item of details) {
      totalNilai += Number(item.harga_satuan) * item.jumlah;

      await conn.query(
        "UPDATE obat SET stok = stok + ? WHERE id_obat = ?",
        [item.jumlah, item.id_obat]
      );

      await conn.query(
        `UPDATE inventori
         SET jumlah_stok = jumlah_stok + ?, tanggal_update = CURDATE()
         WHERE id_obat = ?`,
        [item.jumlah, item.id_obat]
      );
    }

    await conn.query(
      "UPDATE purchase_order SET status = 'diterima' WHERE id_po = ?",
      [id_po]
    );

    const id_kas = await generateId(conn, "buku_kas", "id_kas", "KAS");
    await conn.query(
      `INSERT INTO buku_kas (id_kas, tanggal, jenis_transaksi, kategori, jumlah, keterangan)
       VALUES (?, CURDATE(), 'keluar', 'Pembelian Obat', ?, ?)`,
      [id_kas, totalNilai, `Penerimaan PO ${id_po}`]
    );

    await catatAudit(
      conn,
      req.user?.id,
      `Menerima PO ${id_po}, total Rp ${totalNilai}`,
      "Logistik"
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
      SELECT id_kas, tanggal, jenis_transaksi, kategori, jumlah, keterangan
      FROM buku_kas
    `;
    const params = [];
    const conditions = [];

    if (jenis_transaksi) {
      conditions.push("jenis_transaksi = ?");
      params.push(jenis_transaksi);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY tanggal DESC, id_kas DESC";

    if (limit) {
      query += " LIMIT ?";
      params.push(parseInt(limit, 10));
    }

    const [rows] = await pool.query(query, params);

    const [ringkasan] = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN jenis_transaksi = 'masuk' THEN jumlah ELSE 0 END), 0) AS total_masuk,
        COALESCE(SUM(CASE WHEN jenis_transaksi = 'keluar' THEN jumlah ELSE 0 END), 0) AS total_keluar
       FROM buku_kas`
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
