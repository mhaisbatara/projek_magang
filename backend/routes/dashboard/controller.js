import knex from "../../core/config/knex.js";

// GET /api/dashboard/stats
async function getStats(req, res) {
  try {
    const todayRow = await knex("trx_kunjungan")
      .whereRaw("tanggal_kunjungan = CURDATE()")
      .count("id as total")
      .first();
    const kemarinRow = await knex("trx_kunjungan")
      .whereRaw("tanggal_kunjungan = CURDATE() - INTERVAL 1 DAY")
      .count("id as total")
      .first();

    const pendapatanHariIniRow = await knex("trx_pembayaran")
      .whereRaw("DATE(tanggal_bayar) = CURDATE()")
      .sum("jumlah_bayar as total")
      .first();
    const pendapatanKemarinRow = await knex("trx_pembayaran")
      .whereRaw("DATE(tanggal_bayar) = CURDATE() - INTERVAL 1 DAY")
      .sum("jumlah_bayar as total")
      .first();

    const pasienMenungguRow = await knex("trx_kunjungan")
      .whereRaw("tanggal_kunjungan = CURDATE()")
      .andWhere("status_kunjungan", "menunggu")
      .count("id as total")
      .first();

    const selesaiRow = await knex("trx_kunjungan")
      .whereRaw("tanggal_kunjungan = CURDATE()")
      .whereIn("status_kunjungan", ["diperiksa", "selesai"])
      .count("id as total")
      .first();

    const kunjunganHariIni = Number(todayRow.total) || 0;
    const kunjunganKemarin = Number(kemarinRow.total) || 0;
    const pendapatanHariIni = Number(pendapatanHariIniRow.total) || 0;
    const pendapatanKemarin = Number(pendapatanKemarinRow.total) || 0;
    const pasienMenunggu = Number(pasienMenungguRow.total) || 0;
    const selesaiHariIni = Number(selesaiRow.total) || 0;

    const growthKunjungan = kunjunganKemarin
      ? Math.round(((kunjunganHariIni - kunjunganKemarin) / kunjunganKemarin) * 1000) / 10
      : null;
    const growthPendapatan = pendapatanKemarin
      ? Math.round(((pendapatanHariIni - pendapatanKemarin) / pendapatanKemarin) * 1000) / 10
      : null;
    const okupansi = kunjunganHariIni
      ? Math.round((selesaiHariIni / kunjunganHariIni) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        kunjunganHariIni,
        growthKunjungan,
        pendapatanHariIni,
        growthPendapatan,
        pasienMenunggu,
        okupansi,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/dashboard/tren-kunjungan
async function getTrenKunjungan(req, res) {
  try {
    const rows = await knex("trx_kunjungan")
      .select(knex.raw("DATE(tanggal_kunjungan) as tanggal"))
      .count("id as total")
      .whereRaw("tanggal_kunjungan >= CURDATE() - INTERVAL 6 DAY")
      .groupByRaw("DATE(tanggal_kunjungan)")
      .orderBy("tanggal", "asc");

    const map = {};
    rows.forEach((r) => {
      const key = new Date(r.tanggal).toISOString().slice(0, 10);
      map[key] = Number(r.total);
    });

    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({
        tanggal: key,
        hari: d.toLocaleDateString("id-ID", { weekday: "short" }),
        total: map[key] || 0,
      });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/dashboard/pasien-per-poli
async function getPasienPerPoli(req, res) {
  try {
    const rows = await knex("trx_kunjungan as tk")
      .join("mst_poli as mp", "tk.kode_poli", "mp.kode_poli")
      .whereRaw("tk.tanggal_kunjungan = CURDATE()")
      .groupBy("mp.kode_poli", "mp.nama_poli")
      .select("mp.nama_poli")
      .count("tk.id as total")
      .orderBy("total", "desc");

    res.json({
      success: true,
      data: rows.map((r) => ({ nama_poli: r.nama_poli, total: Number(r.total) })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export { getStats, getTrenKunjungan, getPasienPerPoli };
