import knex from "../../core/config/knex.js";

const TABLE = "trx_antrian";

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
