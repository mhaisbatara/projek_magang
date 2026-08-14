import knex from "../../../core/config/knex.js";

const TABLE_OBAT = "mst_obat";
const TABLE_SUPPLIER = "mst_supplier";
const TABLE_PO = "trx_purchase_order";
const TABLE_PO_DETAIL = "trx_po_detail";
const TABLE_RESEP = "trx_resep";
const TABLE_RESEP_DETAIL = "trx_resep_detail";
const TABLE_STOK_OPNAME = "trx_stok_opname";

function pad(num, size) {
  let s = String(num);
  while (s.length < size) s = "0" + s;
  return s;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ============================================================
// OBAT (mst_obat)
// ============================================================

async function generateKodeObat() {
  const last = await knex(TABLE_OBAT)
    .where("kode_obat", "like", "OBT%")
    .orderBy("kode_obat", "desc")
    .first();

  let nextNum = 1;
  if (last) {
    const match = last.kode_obat.match(/^OBT(\d+)$/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  return "OBT" + pad(nextNum, 3);
}

// GET /api/farmasi/obat
async function getAllObat(req, res) {
  try {
    const data = await knex(TABLE_OBAT).select("*").orderBy("nama_obat");
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/farmasi/obat/:kode_obat
async function getObatByKode(req, res) {
  const { kode_obat } = req.params;
  try {
    const data = await knex(TABLE_OBAT).where({ kode_obat }).first();
    if (!data) {
      return res.status(404).json({ success: false, message: "Obat tidak ditemukan" });
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/farmasi/obat
async function createObat(req, res) {
  const { nama_obat, kategori, satuan, stok, harga_beli, harga_jual, stok_minimum } = req.body;

  if (!nama_obat) {
    return res.status(400).json({ success: false, message: "Nama obat wajib diisi" });
  }

  try {
    const kode_obat = await generateKodeObat();

    const payload = {
      id: kode_obat,
      kode_obat,
      nama_obat,
      kategori: kategori || null,
      satuan: satuan || null,
      stok: stok !== undefined ? Number(stok) : 0,
      harga_beli: harga_beli !== undefined ? harga_beli : null,
      harga_jual: harga_jual !== undefined ? harga_jual : null,
      stok_minimum: stok_minimum !== undefined ? Number(stok_minimum) : 0,
    };

    await knex(TABLE_OBAT).insert(payload);
    res.status(201).json({ success: true, message: "Obat berhasil ditambahkan", data: payload });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PUT /api/farmasi/obat/:kode_obat
async function updateObat(req, res) {
  const { kode_obat } = req.params;
  const { nama_obat, kategori, satuan, harga_beli, harga_jual, stok_minimum } = req.body;

  try {
    const obat = await knex(TABLE_OBAT).where({ kode_obat }).first();
    if (!obat) {
      return res.status(404).json({ success: false, message: "Obat tidak ditemukan" });
    }

    const updates = {};
    if (nama_obat !== undefined) updates.nama_obat = nama_obat;
    if (kategori !== undefined) updates.kategori = kategori;
    if (satuan !== undefined) updates.satuan = satuan;
    if (harga_beli !== undefined) updates.harga_beli = harga_beli;
    if (harga_jual !== undefined) updates.harga_jual = harga_jual;
    if (stok_minimum !== undefined) updates.stok_minimum = Number(stok_minimum);

    if (Object.keys(updates).length > 0) {
      await knex(TABLE_OBAT).where({ kode_obat }).update(updates);
    }

    res.json({ success: true, message: "Obat berhasil diperbarui" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/farmasi/obat/:kode_obat
async function deleteObat(req, res) {
  const { kode_obat } = req.params;
  try {
    const obat = await knex(TABLE_OBAT).where({ kode_obat }).first();
    if (!obat) {
      return res.status(404).json({ success: false, message: "Obat tidak ditemukan" });
    }
    await knex(TABLE_OBAT).where({ kode_obat }).del();
    res.json({ success: true, message: "Obat berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/farmasi/obat/:kode_obat/stok
// Penyesuaian stok manual (stok opname), tercatat di trx_stok_opname
async function adjustStokObat(req, res) {
  const { kode_obat } = req.params;
  const { stok_fisik } = req.body;

  if (stok_fisik === undefined || stok_fisik === null || isNaN(Number(stok_fisik))) {
    return res.status(400).json({ success: false, message: "Stok fisik wajib diisi berupa angka" });
  }

  try {
    const obat = await knex(TABLE_OBAT).where({ kode_obat }).first();
    if (!obat) {
      return res.status(404).json({ success: false, message: "Obat tidak ditemukan" });
    }

    const stokSistem = obat.stok;
    const stokFisik = Number(stok_fisik);
    const selisih = stokFisik - stokSistem;

    await knex(TABLE_OBAT).where({ kode_obat }).update({ stok: stokFisik });

    const lastOpname = await knex(TABLE_STOK_OPNAME)
      .where("id", "like", "OPN%")
      .orderBy("id", "desc")
      .first();
    let nextNum = 1;
    if (lastOpname) {
      const match = lastOpname.id.match(/^OPN(\d+)$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    const idOpname = "OPN" + pad(nextNum, 4);

    await knex(TABLE_STOK_OPNAME).insert({
      id: idOpname,
      tanggal: todayStr(),
      kode_obat,
      stok_sistem: stokSistem,
      stok_fisik: stokFisik,
      selisih,
    });

    res.json({
      success: true,
      message: "Stok berhasil disesuaikan",
      data: { kode_obat, stok_sistem: stokSistem, stok_fisik: stokFisik, selisih },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ============================================================
// RESEP / DISPENSING (trx_resep, trx_resep_detail)
// ============================================================

// GET /api/farmasi/resep?status=menunggu|diracik|selesai
async function getAllResep(req, res) {
  const { status } = req.query;
  try {
    const query = knex(TABLE_RESEP + " as r")
      .leftJoin("trx_kunjungan as k", "r.kode_kunjungan", "k.kode_kunjungan")
      .leftJoin("mst_pasien as p", "k.no_rm", "p.no_rm")
      .select(
        "r.id",
        "r.kode_resep",
        "r.kode_kunjungan",
        "r.no_sip",
        "r.tanggal_resep",
        "r.catatan",
        "r.status_dispensing",
        "r.email_farmasi",
        "r.tgl_dispensing",
        "p.nama_pasien",
        "p.no_rm"
      )
      .orderBy("r.tanggal_resep", "desc");

    if (status) {
      query.where("r.status_dispensing", status);
    }

    const data = await query;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/farmasi/resep/:kode_resep
async function getResepByKode(req, res) {
  const { kode_resep } = req.params;
  try {
    const resep = await knex(TABLE_RESEP).where({ kode_resep }).first();
    if (!resep) {
      return res.status(404).json({ success: false, message: "Resep tidak ditemukan" });
    }

    const detail = await knex(TABLE_RESEP_DETAIL + " as d")
      .leftJoin("mst_obat as o", "d.kode_obat", "o.kode_obat")
      .where("d.kode_resep", kode_resep)
      .select(
        "d.id",
        "d.kode_obat",
        "o.nama_obat",
        "o.satuan",
        "o.stok",
        "d.dosis",
        "d.jumlah",
        "d.aturan_pakai"
      );

    res.json({ success: true, data: { ...resep, detail } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/farmasi/resep/:kode_resep/proses
// status_dispensing: menunggu -> diracik
async function prosesResep(req, res) {
  const { kode_resep } = req.params;
  try {
    const resep = await knex(TABLE_RESEP).where({ kode_resep }).first();
    if (!resep) {
      return res.status(404).json({ success: false, message: "Resep tidak ditemukan" });
    }
    if (resep.status_dispensing !== "menunggu") {
      return res.status(400).json({ success: false, message: "Resep sudah diproses sebelumnya" });
    }

    await knex(TABLE_RESEP).where({ kode_resep }).update({ status_dispensing: "diracik" });
    res.json({ success: true, message: "Resep sedang diracik" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/farmasi/resep/:kode_resep/selesai
// status_dispensing: diracik -> selesai, mengurangi stok obat sesuai detail resep
async function selesaiResep(req, res) {
  const { kode_resep } = req.params;
  const { email_farmasi } = req.body;

  try {
    const resep = await knex(TABLE_RESEP).where({ kode_resep }).first();
    if (!resep) {
      return res.status(404).json({ success: false, message: "Resep tidak ditemukan" });
    }
    if (resep.status_dispensing === "selesai") {
      return res.status(400).json({ success: false, message: "Resep sudah selesai" });
    }

    const detail = await knex(TABLE_RESEP_DETAIL).where({ kode_resep });
    if (detail.length === 0) {
      return res.status(400).json({ success: false, message: "Resep tidak memiliki detail obat" });
    }

    // Validasi stok mencukupi sebelum memproses
    for (const item of detail) {
      const obat = await knex(TABLE_OBAT).where({ kode_obat: item.kode_obat }).first();
      if (!obat) {
        return res.status(400).json({ success: false, message: `Obat ${item.kode_obat} tidak ditemukan` });
      }
      if (obat.stok < item.jumlah) {
        return res.status(400).json({
          success: false,
          message: `Stok ${obat.nama_obat} tidak mencukupi (tersedia ${obat.stok}, dibutuhkan ${item.jumlah})`,
        });
      }
    }

    // Kurangi stok per item
    for (const item of detail) {
      await knex(TABLE_OBAT)
        .where({ kode_obat: item.kode_obat })
        .decrement("stok", item.jumlah);
    }

    await knex(TABLE_RESEP).where({ kode_resep }).update({
      status_dispensing: "selesai",
      email_farmasi: email_farmasi || resep.email_farmasi || null,
      tgl_dispensing: new Date(),
    });

    res.json({ success: true, message: "Resep berhasil diselesaikan dan stok telah dikurangi" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ============================================================
// SUPPLIER (mst_supplier) - read only, dipakai untuk pilihan PO
// ============================================================

// GET /api/farmasi/supplier
async function getAllSupplier(req, res) {
  try {
    const data = await knex(TABLE_SUPPLIER).select("*").orderBy("nama_supplier");
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ============================================================
// PURCHASE ORDER (trx_purchase_order, trx_po_detail)
// ============================================================

async function generateKodePo() {
  const prefix = "PO" + todayStr().slice(2).replace(/-/g, "");
  const last = await knex(TABLE_PO)
    .where("kode_po", "like", `${prefix}%`)
    .orderBy("kode_po", "desc")
    .first();

  let nextNum = 1;
  if (last) {
    nextNum = parseInt(last.kode_po.slice(-3), 10) + 1;
  }
  return prefix + pad(nextNum, 3);
}

// GET /api/farmasi/po?status=
async function getAllPo(req, res) {
  const { status } = req.query;
  try {
    const query = knex(TABLE_PO + " as po")
      .leftJoin(TABLE_SUPPLIER + " as s", "po.kode_supplier", "s.kode_supplier")
      .select(
        "po.id",
        "po.kode_po",
        "po.kode_supplier",
        "s.nama_supplier",
        "po.tanggal_po",
        "po.status"
      )
      .orderBy("po.tanggal_po", "desc");

    if (status) {
      query.where("po.status", status);
    }

    const data = await query;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/farmasi/po/:kode_po
async function getPoByKode(req, res) {
  const { kode_po } = req.params;
  try {
    const po = await knex(TABLE_PO + " as po")
      .leftJoin(TABLE_SUPPLIER + " as s", "po.kode_supplier", "s.kode_supplier")
      .where("po.kode_po", kode_po)
      .select("po.*", "s.nama_supplier", "s.kontak", "s.alamat")
      .first();

    if (!po) {
      return res.status(404).json({ success: false, message: "Purchase order tidak ditemukan" });
    }

    const detail = await knex(TABLE_PO_DETAIL + " as d")
      .leftJoin(TABLE_OBAT + " as o", "d.kode_obat", "o.kode_obat")
      .where("d.kode_po", kode_po)
      .select("d.id", "d.kode_obat", "o.nama_obat", "o.satuan", "d.qty", "d.harga_satuan");

    res.json({ success: true, data: { ...po, detail } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/farmasi/po
// body: { kode_supplier, tanggal_po, items: [{ kode_obat, qty, harga_satuan }] }
async function createPo(req, res) {
  const { kode_supplier, tanggal_po, items } = req.body;

  if (!kode_supplier) {
    return res.status(400).json({ success: false, message: "Supplier wajib dipilih" });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: "Minimal 1 item obat wajib diisi" });
  }
  for (const item of items) {
    if (!item.kode_obat || !item.qty || Number(item.qty) <= 0) {
      return res.status(400).json({ success: false, message: "Setiap item wajib memiliki obat dan qty > 0" });
    }
  }

  try {
    const supplier = await knex(TABLE_SUPPLIER).where({ kode_supplier }).first();
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier tidak ditemukan" });
    }

    const kode_po = await generateKodePo();

    await knex(TABLE_PO).insert({
      id: kode_po,
      kode_po,
      kode_supplier,
      tanggal_po: tanggal_po || todayStr(),
      status: "draft",
    });

    let seq = 1;
    for (const item of items) {
      await knex(TABLE_PO_DETAIL).insert({
        id: `${kode_po}-${pad(seq, 2)}`,
        kode_po,
        kode_obat: item.kode_obat,
        qty: Number(item.qty),
        harga_satuan: item.harga_satuan || null,
      });
      seq++;
    }

    res.status(201).json({ success: true, message: "Purchase order berhasil dibuat", data: { kode_po } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/farmasi/po/:kode_po/kirim  (draft -> dikirim)
async function kirimPo(req, res) {
  const { kode_po } = req.params;
  try {
    const po = await knex(TABLE_PO).where({ kode_po }).first();
    if (!po) return res.status(404).json({ success: false, message: "Purchase order tidak ditemukan" });
    if (po.status !== "draft") {
      return res.status(400).json({ success: false, message: "Hanya PO berstatus draft yang bisa dikirim" });
    }
    await knex(TABLE_PO).where({ kode_po }).update({ status: "dikirim" });
    res.json({ success: true, message: "Purchase order berhasil dikirim ke supplier" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/farmasi/po/:kode_po/terima  (dikirim -> diterima, stok obat bertambah)
async function terimaPo(req, res) {
  const { kode_po } = req.params;
  try {
    const po = await knex(TABLE_PO).where({ kode_po }).first();
    if (!po) return res.status(404).json({ success: false, message: "Purchase order tidak ditemukan" });
    if (po.status !== "dikirim") {
      return res.status(400).json({ success: false, message: "Hanya PO berstatus dikirim yang bisa diterima" });
    }

    const detail = await knex(TABLE_PO_DETAIL).where({ kode_po });
    for (const item of detail) {
      await knex(TABLE_OBAT).where({ kode_obat: item.kode_obat }).increment("stok", item.qty);
    }

    await knex(TABLE_PO).where({ kode_po }).update({ status: "diterima" });
    res.json({ success: true, message: "Barang diterima, stok obat berhasil diperbarui" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/farmasi/po/:kode_po/batal
async function batalPo(req, res) {
  const { kode_po } = req.params;
  try {
    const po = await knex(TABLE_PO).where({ kode_po }).first();
    if (!po) return res.status(404).json({ success: false, message: "Purchase order tidak ditemukan" });
    if (po.status === "diterima") {
      return res.status(400).json({ success: false, message: "PO yang sudah diterima tidak bisa dibatalkan" });
    }
    await knex(TABLE_PO).where({ kode_po }).update({ status: "batal" });
    res.json({ success: true, message: "Purchase order dibatalkan" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/farmasi/po/:kode_po  (hanya draft)
async function deletePo(req, res) {
  const { kode_po } = req.params;
  try {
    const po = await knex(TABLE_PO).where({ kode_po }).first();
    if (!po) return res.status(404).json({ success: false, message: "Purchase order tidak ditemukan" });
    if (po.status !== "draft") {
      return res.status(400).json({ success: false, message: "Hanya PO berstatus draft yang bisa dihapus" });
    }
    await knex(TABLE_PO_DETAIL).where({ kode_po }).del();
    await knex(TABLE_PO).where({ kode_po }).del();
    res.json({ success: true, message: "Purchase order berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export {
  getAllObat,
  getObatByKode,
  createObat,
  updateObat,
  deleteObat,
  adjustStokObat,
  getAllResep,
  getResepByKode,
  prosesResep,
  selesaiResep,
  getAllSupplier,
  getAllPo,
  getPoByKode,
  createPo,
  kirimPo,
  terimaPo,
  batalPo,
  deletePo,
};