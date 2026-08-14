import knex from "../../../core/config/knex.js";

const TABLE_KAS = "trx_buku_kas";
const TABLE_PEMBAYARAN = "trx_pembayaran";

function pad(num, size) {
  let s = String(num);
  while (s.length < size) s = "0" + s;
  return s;
}

function todayPrefix() {
  const today = new Date();
  return today.toISOString().slice(2, 10).replace(/-/g, ""); // e.g. 260814
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function generateKasId() {
  const prefix = todayPrefix();
  const last = await knex(TABLE_KAS).orderBy("id", "desc").first();
  const nextNumber = last ? parseInt(last.id.slice(-3), 10) + 1 : 1;
  return `KAS${prefix}${pad(nextNumber, 3)}`;
}

// GET /api/keuangan/buku-kas?jenis=&tanggal_mulai=&tanggal_akhir=&q=
async function getBukuKas(req, res) {
  const { jenis, tanggal_mulai, tanggal_akhir, q } = req.query;
  try {
    let query = knex(TABLE_KAS).select("*");

    if (jenis && jenis !== "semua") {
      query = query.where("jenis", jenis);
    }
    if (tanggal_mulai) {
      query = query.where("tanggal", ">=", tanggal_mulai);
    }
    if (tanggal_akhir) {
      query = query.where("tanggal", "<=", tanggal_akhir);
    }
    if (q && q.trim()) {
      query = query.where((builder) => {
        builder.where("keterangan", "like", `%${q}%`).orWhere("kategori", "like", `%${q}%`);
      });
    }

    const data = await query.orderBy("tanggal", "desc").orderBy("id", "desc");
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/keuangan/buku-kas
// body: { tanggal, jenis, kategori, keterangan, jumlah, email_user }
async function createBukuKas(req, res) {
  const { tanggal, jenis, kategori, keterangan, jumlah, email_user } = req.body;

  if (!["masuk", "keluar"].includes(jenis)) {
    return res.status(400).json({ success: false, message: "Jenis transaksi tidak valid" });
  }
  if (!jumlah || Number(jumlah) <= 0) {
    return res.status(400).json({ success: false, message: "Jumlah tidak valid" });
  }
  if (!kategori) {
    return res.status(400).json({ success: false, message: "Kategori wajib diisi" });
  }

  try {
    const id = await generateKasId();
    const payload = {
      id,
      tanggal: tanggal || todayStr(),
      jenis,
      kategori,
      keterangan: keterangan || null,
      jumlah,
      email_user: email_user || null,
    };
    await knex(TABLE_KAS).insert(payload);
    res.status(201).json({ success: true, message: "Transaksi kas berhasil dicatat", data: payload });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/keuangan/buku-kas/:id
async function deleteBukuKas(req, res) {
  const { id } = req.params;
  try {
    const row = await knex(TABLE_KAS).where({ id }).first();
    if (!row) {
      return res.status(404).json({ success: false, message: "Data kas tidak ditemukan" });
    }
    await knex(TABLE_KAS).where({ id }).del();
    res.json({ success: true, message: "Transaksi kas berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/keuangan/ringkasan?tanggal_mulai=&tanggal_akhir=
// Default: 7 hari terakhir. Menggabungkan pendapatan kasir (trx_pembayaran) + buku kas manual.
async function getRingkasanKeuangan(req, res) {
  const tanggal_mulai = req.query.tanggal_mulai || daysAgoStr(6);
  const tanggal_akhir = req.query.tanggal_akhir || todayStr();

  try {
    const pembayaran = await knex(TABLE_PEMBAYARAN)
      .whereRaw("DATE(tanggal_bayar) BETWEEN ? AND ?", [tanggal_mulai, tanggal_akhir])
      .select("metode_pembayaran", "jumlah_bayar", knex.raw("DATE(tanggal_bayar) as tgl"));

    const kas = await knex(TABLE_KAS)
      .whereBetween("tanggal", [tanggal_mulai, tanggal_akhir])
      .select("jenis", "kategori", "jumlah", "tanggal");

    const pendapatanKasir = pembayaran.reduce((sum, p) => sum + Number(p.jumlah_bayar || 0), 0);
    const kasMasuk = kas.filter((k) => k.jenis === "masuk").reduce((s, k) => s + Number(k.jumlah || 0), 0);
    const kasKeluar = kas.filter((k) => k.jenis === "keluar").reduce((s, k) => s + Number(k.jumlah || 0), 0);

    const totalPemasukan = pendapatanKasir + kasMasuk;
    const saldoBersih = totalPemasukan - kasKeluar;

    const per_metode = { tunai: 0, qris: 0, transfer: 0, bpjs: 0 };
    for (const p of pembayaran) {
      per_metode[p.metode_pembayaran] = (per_metode[p.metode_pembayaran] || 0) + Number(p.jumlah_bayar);
    }

    // Grafik harian: pemasukan (kasir + kas masuk) vs pengeluaran (kas keluar) per tanggal
    const grafikMap = {};
    const ensureDay = (tgl) => {
      if (!grafikMap[tgl]) grafikMap[tgl] = { tanggal: tgl, pemasukan: 0, pengeluaran: 0 };
      return grafikMap[tgl];
    };
    for (const p of pembayaran) {
      ensureDay(p.tgl).pemasukan += Number(p.jumlah_bayar);
    }
    for (const k of kas) {
      const day = ensureDay(k.tanggal);
      if (k.jenis === "masuk") day.pemasukan += Number(k.jumlah);
      else day.pengeluaran += Number(k.jumlah);
    }
    const grafik_harian = Object.values(grafikMap).sort((a, b) => (a.tanggal > b.tanggal ? 1 : -1));

    res.json({
      success: true,
      data: {
        periode: { tanggal_mulai, tanggal_akhir },
        pendapatan_kasir: pendapatanKasir,
        kas_masuk: kasMasuk,
        kas_keluar: kasKeluar,
        total_pemasukan: totalPemasukan,
        saldo_bersih: saldoBersih,
        per_metode,
        grafik_harian,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export { getBukuKas, createBukuKas, deleteBukuKas, getRingkasanKeuangan };
