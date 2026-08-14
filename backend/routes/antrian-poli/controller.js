import knex from "../../core/config/knex.js";

const TABLE = "trx_antrian";

function pad(num, size) {
  let s = String(num);
  while (s.length < size) s = "0" + s;
  return s;
}

// Pastikan setiap kali pasien dipanggil masuk poli, ada baris trx_kunjungan
// berstatus 'diperiksa' supaya langsung muncul di halaman Pemeriksaan Dokter.
async function ensureKunjungan(antrianRow) {
  const existing = await knex("trx_kunjungan").where({ kode_antrian: antrianRow.id }).first();
  if (existing) {
    if (existing.status_kunjungan === "menunggu") {
      await knex("trx_kunjungan")
        .where({ id: existing.id })
        .update({ status_kunjungan: "diperiksa", jam_masuk: new Date() });
    }
    return;
  }

  const today = new Date();
  const yymmdd = today.toISOString().slice(2, 10).replace(/-/g, "");
  const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = "TRK" + yymmdd;

  const last = await knex("trx_kunjungan")
    .where("id", "like", `${prefix}%`)
    .orderBy("id", "desc")
    .first();

  let nextNum = 1;
  if (last) {
    const match = last.id.match(new RegExp(`^${prefix}(\\d+)$`));
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }

  const dokter = await knex("mst_dokter").where({ kode_poli: antrianRow.kode_poli }).first();

  await knex("trx_kunjungan").insert({
    id: prefix + pad(nextNum, 4),
    kode_kunjungan: `KJG-${yyyymmdd}-${pad(nextNum, 4)}`,
    kode_antrian: antrianRow.id,
    no_rm: antrianRow.no_rm,
    kode_poli: antrianRow.kode_poli,
    no_sip: dokter ? dokter.no_sip : null,
    kode_penjamin: antrianRow.kode_penjamin || null,
    tanggal_kunjungan: antrianRow.tanggal,
    jam_masuk: new Date(),
    status_kunjungan: "diperiksa",
  });
}

// GET /api/antrian-poli?kode_poli=...&tanggal=...
async function getAll(req, res) {
  const { kode_poli, tanggal } = req.query;
  
  // Format today's date as YYYY-MM-DD
  const todayStr = new Date().toISOString().slice(0, 10);
  const filterTanggal = tanggal || todayStr;

  try {
    const query = knex(TABLE)
      .join("mst_pasien", "trx_antrian.no_rm", "mst_pasien.no_rm")
      .join("mst_poli", "trx_antrian.kode_poli", "mst_poli.kode_poli")
      .select(
        "trx_antrian.id",
        "trx_antrian.no_antrian",
        "trx_antrian.no_rm",
        "trx_antrian.kode_poli",
        "trx_antrian.kode_penjamin",
        "trx_antrian.tanggal",
        "trx_antrian.status_panggil",
        "trx_antrian.created_at",
        "mst_pasien.nama_pasien",
        "mst_pasien.jenis_kelamin",
        "mst_pasien.tanggal_lahir",
        "mst_poli.nama_poli"
      )
      .whereRaw("DATE(trx_antrian.tanggal) = ?", [filterTanggal]);

    if (kode_poli) {
      query.where("trx_antrian.kode_poli", kode_poli);
    }

    // Sort by queue number sequentially
    query.orderBy("trx_antrian.no_antrian", "asc");

    const data = await query;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/antrian-poli/:id/panggil
async function panggilAntrian(req, res) {
  const { id } = req.params;

  try {
    const exist = await knex(TABLE).where({ id }).first();
    if (!exist) {
      return res.status(404).json({ success: false, message: "Transaksi antrian tidak ditemukan" });
    }

    await knex(TABLE).where({ id }).update({
      status_panggil: "dipanggil",
    });

    // Siapkan data kunjungan supaya siap diperiksa dokter
    await ensureKunjungan(exist);

    res.json({ 
      success: true, 
      message: `Antrian ${exist.no_antrian} berhasil dipanggil`,
      data: {
        id,
        no_antrian: exist.no_antrian,
        status_panggil: "dipanggil"
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/antrian-poli/:id/selesai
async function selesaiAntrian(req, res) {
  const { id } = req.params;

  try {
    const exist = await knex(TABLE).where({ id }).first();
    if (!exist) {
      return res.status(404).json({ success: false, message: "Transaksi antrian tidak ditemukan" });
    }

    await knex(TABLE).where({ id }).update({
      status_panggil: "selesai",
    });

    res.json({ 
      success: true, 
      message: `Antrian ${exist.no_antrian} selesai diperiksa`,
      data: {
        id,
        no_antrian: exist.no_antrian,
        status_panggil: "selesai"
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/antrian-poli/reset
async function resetAntrian(req, res) {
  const todayStr = new Date().toISOString().slice(0, 10);

  try {
    await knex(TABLE)
      .whereRaw("DATE(tanggal) = ?", [todayStr])
      .update({
        status_panggil: "menunggu",
      });

    res.json({ success: true, message: "Semua antrian poli hari ini berhasil direset ke status menunggu" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export {
  getAll,
  panggilAntrian,
  selesaiAntrian,
  resetAntrian,
};
