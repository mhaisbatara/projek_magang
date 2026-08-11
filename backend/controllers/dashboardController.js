import pool from "../config/db.js";

// GET /api/dashboard/summary
// Mengembalikan KPI ringkasan hari ini, tren kunjungan 7 hari, dan distribusi pasien per poli
export const getDashboardSummary = async (req, res) => {
  try {
    // 1. Kunjungan hari ini (dihitung dari antrian hari ini)
    const [kunjunganHariIni] = await pool.query(
      `SELECT COUNT(*) AS total FROM mst_antrian WHERE tanggal = CURDATE()`
    );

    // 2. Pendapatan hari ini (dari tagihan yang sudah lunas hari ini)
    const [pendapatanHariIni] = await pool.query(
      `SELECT COALESCE(SUM(total_tagihan), 0) AS total
       FROM trx_tagihan
       WHERE status_pembayaran = 'lunas' AND tanggal = CURDATE()`
    );

    // 3. Pasien menunggu (antrian hari ini yang belum dipanggil/selesai)
    const [pasienMenunggu] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM mst_antrian
       WHERE tanggal = CURDATE() AND status_panggil = 'menunggu'`
    );

    // 4. Okupansi poli hari ini = (jumlah antrian hari ini / total kuota jadwal hari ini) x 100
    const [[kuotaRow]] = await pool.query(
      `SELECT COALESCE(SUM(kuota_pasien), 0) AS total_kuota
       FROM mst_jadwal_dokter
       WHERE hari = ELT(WEEKDAY(CURDATE()) + 1, 'Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu')`
    );
    const totalKuota = kuotaRow.total_kuota || 0;
    const totalAntrianHariIni = kunjunganHariIni[0].total;
    const okupansi = totalKuota > 0 ? Math.round((totalAntrianHariIni / totalKuota) * 100) : 0;

    // 5. Tren kunjungan 7 hari terakhir (dari antrian)
    const [trenRows] = await pool.query(
      `SELECT tanggal AS tanggal_kunjungan, COUNT(*) AS total
       FROM mst_antrian
       WHERE tanggal >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY tanggal
       ORDER BY tanggal ASC`
    );

    const namaHari = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const visitTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const tanggalStr = d.toISOString().slice(0, 10);
      const found = trenRows.find(
        (r) => new Date(r.tanggal_kunjungan).toISOString().slice(0, 10) === tanggalStr
      );
      visitTrend.push({
        day: namaHari[d.getDay()],
        kunjungan: found ? Number(found.total) : 0,
      });
    }

    // 6. Distribusi pasien per poli (7 hari terakhir)
    const [poliRows] = await pool.query(
      `SELECT mst_poli.nama_poli AS label, COUNT(*) AS total
       FROM mst_antrian a
       JOIN mst_poli ON mst_poli.kode_poli = a.kode_poli
       WHERE a.tanggal >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY mst_poli.nama_poli
       ORDER BY total DESC`
    );

    const warnaPoli = ['#3266f0', '#14b8a6', '#f97316', '#60a5fa', '#2dd4bf', '#a78bfa'];
    const poliDistribution = poliRows.map((row, i) => ({
      label: row.label,
      value: Number(row.total),
      color: warnaPoli[i % warnaPoli.length],
    }));

    res.json({
      kpi: {
        kunjunganHariIni: totalAntrianHariIni,
        pendapatanHariIni: Number(pendapatanHariIni[0].total),
        pasienMenunggu: pasienMenunggu[0].total,
        okupansiPoli: okupansi,
      },
      visitTrend,
      poliDistribution,
    });
  } catch (error) {
    console.error("Gagal mengambil data dashboard:", error);
    res.status(500).json({ message: "Gagal mengambil data dashboard", error: error.message });
  }
};
