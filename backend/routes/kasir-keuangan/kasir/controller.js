import knex from "../../../core/config/knex.js";

const TABLE_TAGIHAN = "trx_tagihan";
const TABLE_DETAIL = "trx_detail_tagihan";
const TABLE_PEMBAYARAN = "trx_pembayaran";

function pad(num, size) {
  let s = String(num);
  while (s.length < size) s = "0" + s;
  return s;
}

// Prefix tanggal untuk id/kode: YYMMDD (mengikuti pola data existing)
function todayPrefix() {
  const today = new Date();
  return today.toISOString().slice(2, 10).replace(/-/g, ""); // e.g. 260814
}

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// Counter global 4 digit, mengikuti pola data existing (TGH2608080001 ... TGH2608140121)
async function generateTagihanId() {
  const prefix = todayPrefix();
  const last = await knex(TABLE_TAGIHAN).orderBy("id", "desc").first();
  const nextNumber = last ? parseInt(last.id.slice(-4), 10) + 1 : 1;
  const counter = pad(nextNumber, 4);
  return {
    id: `TGH${prefix}${counter}`,
    kode_tagihan: `TGH-20${prefix.slice(0, 2)}${prefix.slice(2, 4)}${prefix.slice(4, 6)}-${counter}`,
  };
}

async function generatePembayaranId() {
  const prefix = todayPrefix();
  const last = await knex(TABLE_PEMBAYARAN).orderBy("id", "desc").first();
  const nextNumber = last ? parseInt(last.id.slice(-4), 10) + 1 : 1;
  return `PBY${prefix}${pad(nextNumber, 4)}`;
}

// GET /api/kasir/tagihan?status=&q=
// status: belum_bayar | sebagian | lunas | (kosong = semua)
async function getTagihan(req, res) {
  const { status, q } = req.query;
  try {
    let query = knex(TABLE_TAGIHAN + " as t")
      .leftJoin("mst_pasien as p", "t.no_rm", "p.no_rm")
      .leftJoin("trx_kunjungan as k", "t.kode_kunjungan", "k.kode_kunjungan")
      .leftJoin("mst_poli as pl", "k.kode_poli", "pl.kode_poli")
      .select(
        "t.id",
        "t.kode_tagihan",
        "t.kode_kunjungan",
        "t.no_rm",
        "t.kode_penjamin",
        "t.total_tagihan",
        "t.status_pembayaran",
        "t.tanggal",
        "p.nama_pasien",
        "pl.nama_poli"
      )
      .orderBy("t.tanggal", "desc")
      .orderBy("t.id", "desc");

    if (status && status !== "semua") {
      query = query.where("t.status_pembayaran", status);
    }
    if (q && q.trim()) {
      query = query.where((builder) => {
        builder
          .where("t.kode_tagihan", "like", `%${q}%`)
          .orWhere("t.no_rm", "like", `%${q}%`)
          .orWhere("p.nama_pasien", "like", `%${q}%`);
      });
    }

    const data = await query;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/kasir/tagihan/:kode_tagihan
async function getTagihanDetail(req, res) {
  const { kode_tagihan } = req.params;
  try {
    const tagihan = await knex(TABLE_TAGIHAN + " as t")
      .leftJoin("mst_pasien as p", "t.no_rm", "p.no_rm")
      .leftJoin("trx_kunjungan as k", "t.kode_kunjungan", "k.kode_kunjungan")
      .leftJoin("mst_poli as pl", "k.kode_poli", "pl.kode_poli")
      .leftJoin("mst_penjamin as pj", "t.kode_penjamin", "pj.kode_penjamin")
      .select(
        "t.*",
        "p.nama_pasien",
        "p.nik",
        "pl.nama_poli",
        "pj.nama_penjamin"
      )
      .where("t.kode_tagihan", kode_tagihan)
      .first();

    if (!tagihan) {
      return res.status(404).json({ success: false, message: "Tagihan tidak ditemukan" });
    }

    const items = await knex(TABLE_DETAIL).where({ kode_tagihan }).select("*");
    const pembayaran = await knex(TABLE_PEMBAYARAN)
      .where({ kode_tagihan })
      .orderBy("tanggal_bayar", "asc")
      .select("*");

    const totalDibayar = pembayaran.reduce((sum, p) => sum + Number(p.jumlah_bayar || 0), 0);
    const sisaTagihan = Number(tagihan.total_tagihan || 0) - totalDibayar;

    res.json({
      success: true,
      data: {
        ...tagihan,
        items,
        pembayaran,
        total_dibayar: totalDibayar,
        sisa_tagihan: sisaTagihan < 0 ? 0 : sisaTagihan,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/kasir/tagihan
// body: { kode_kunjungan, no_rm, kode_penjamin, items: [{jenis_item, nama_item, qty, harga_satuan}] }
async function createTagihan(req, res) {
  const { kode_kunjungan, no_rm, kode_penjamin, items } = req.body;

  if (!no_rm) {
    return res.status(400).json({ success: false, message: "no_rm wajib diisi" });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: "Item tagihan wajib diisi minimal 1" });
  }

  try {
    const { id, kode_tagihan } = await generateTagihanId();
    const total_tagihan = items.reduce(
      (sum, it) => sum + Number(it.qty || 0) * Number(it.harga_satuan || 0),
      0
    );

    await knex(TABLE_TAGIHAN).insert({
      id,
      kode_tagihan,
      kode_kunjungan: kode_kunjungan || null,
      no_rm,
      kode_penjamin: kode_penjamin || null,
      total_tagihan,
      status_pembayaran: "belum_bayar",
      tanggal: todayStr(),
    });

    const detailRows = items.map((it, idx) => ({
      id: `${id}-${pad(idx + 1, 2)}`,
      kode_tagihan,
      jenis_item: it.jenis_item,
      nama_item: it.nama_item,
      qty: it.qty,
      harga_satuan: it.harga_satuan,
      subtotal: Number(it.qty || 0) * Number(it.harga_satuan || 0),
    }));
    await knex(TABLE_DETAIL).insert(detailRows);

    res.status(201).json({
      success: true,
      message: "Tagihan berhasil dibuat",
      data: { id, kode_tagihan, total_tagihan, items: detailRows },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/kasir/tagihan/:kode_tagihan/bayar
// body: { metode_pembayaran, jumlah_bayar, email_kasir }
async function bayarTagihan(req, res) {
  const { kode_tagihan } = req.params;
  const { metode_pembayaran, jumlah_bayar, email_kasir } = req.body;

  if (!["tunai", "qris", "transfer", "bpjs"].includes(metode_pembayaran)) {
    return res.status(400).json({ success: false, message: "Metode pembayaran tidak valid" });
  }
  if (!jumlah_bayar || Number(jumlah_bayar) <= 0) {
    return res.status(400).json({ success: false, message: "Jumlah bayar tidak valid" });
  }

  try {
    const tagihan = await knex(TABLE_TAGIHAN).where({ kode_tagihan }).first();
    if (!tagihan) {
      return res.status(404).json({ success: false, message: "Tagihan tidak ditemukan" });
    }
    if (tagihan.status_pembayaran === "lunas") {
      return res.status(400).json({ success: false, message: "Tagihan sudah lunas" });
    }

    const previousPayments = await knex(TABLE_PEMBAYARAN).where({ kode_tagihan }).select("jumlah_bayar");
    const totalSebelumnya = previousPayments.reduce((sum, p) => sum + Number(p.jumlah_bayar || 0), 0);
    const totalSetelahBayar = totalSebelumnya + Number(jumlah_bayar);

    const id = await generatePembayaranId();
    const now = new Date();
    const tanggal_bayar = now.toISOString().slice(0, 19).replace("T", " ");

    await knex(TABLE_PEMBAYARAN).insert({
      id,
      kode_tagihan,
      metode_pembayaran,
      jumlah_bayar,
      tanggal_bayar,
      email_kasir: email_kasir || null,
    });

    const status_pembayaran = totalSetelahBayar >= Number(tagihan.total_tagihan) ? "lunas" : "sebagian";
    await knex(TABLE_TAGIHAN).where({ kode_tagihan }).update({ status_pembayaran });

    res.json({
      success: true,
      message:
        status_pembayaran === "lunas"
          ? "Pembayaran berhasil, tagihan lunas"
          : "Pembayaran sebagian berhasil disimpan",
      data: {
        id,
        kode_tagihan,
        status_pembayaran,
        total_dibayar: totalSetelahBayar,
        sisa_tagihan: Math.max(Number(tagihan.total_tagihan) - totalSetelahBayar, 0),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/kasir/ringkasan?tanggal=YYYY-MM-DD
async function getRingkasanKasir(req, res) {
  const tanggal = req.query.tanggal || todayStr();
  try {
    const rows = await knex(TABLE_PEMBAYARAN)
      .whereRaw("DATE(tanggal_bayar) = ?", [tanggal])
      .select("metode_pembayaran", "jumlah_bayar");

    const per_metode = { tunai: 0, qris: 0, transfer: 0, bpjs: 0 };
    let total = 0;
    for (const r of rows) {
      per_metode[r.metode_pembayaran] = (per_metode[r.metode_pembayaran] || 0) + Number(r.jumlah_bayar);
      total += Number(r.jumlah_bayar);
    }

    const belumBayarCount = await knex(TABLE_TAGIHAN)
      .where({ tanggal })
      .whereIn("status_pembayaran", ["belum_bayar", "sebagian"])
      .count("id as count")
      .first();

    res.json({
      success: true,
      data: {
        tanggal,
        total_pendapatan: total,
        jumlah_transaksi: rows.length,
        per_metode,
        tagihan_belum_lunas: Number(belumBayarCount?.count || 0),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export { getTagihan, getTagihanDetail, createTagihan, bayarTagihan, getRingkasanKasir };
