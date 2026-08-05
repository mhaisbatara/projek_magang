import pool from "../config/db.js";

// GET /api/dashboard/summary
// Mengembalikan KPI ringkasan hari ini, tren kunjungan 7 hari, dan distribusi pasien per poli
export const getDashboardSummary = async (req, res) => {
  try {
    // 1. Kunjungan hari ini
    const [kunjunganHariIni] = await pool.query(
      `SELECT COUNT(*) AS total FROM kunjungan WHERE tanggal_kunjungan = CURDATE()`
    );

    // 2. Pendapatan hari ini (dari kasir yang sudah lunas, dibayar hari ini)
    const [pendapatanHariIni] = await pool.query(
      `SELECT COALESCE(SUM(total_tagihan), 0) AS total
       FROM kasir
       WHERE status_bayar = 'lunas' AND DATE(tanggal_bayar) = CURDATE()`
    );

    // 3. Pasien menunggu (antrian hari ini yang belum dipanggil/selesai)
    const [pasienMenunggu] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM antrian a
       JOIN pendaftaran p ON a.id_pendaftaran = p.id_pendaftaran
       WHERE p.tanggal = CURDATE() AND a.status_panggil = 'menunggu'`
    );

    // 4. Okupansi poli hari ini = (jumlah pendaftaran hari ini / total kuota jadwal hari ini) x 100
    const [[kuotaRow]] = await pool.query(
      `SELECT COALESCE(SUM(kuota), 0) AS total_kuota
       FROM jadwal_dokter
       WHERE hari = ELT(WEEKDAY(CURDATE()) + 1, 'Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu')`
    );
    const totalKuota = kuotaRow.total_kuota || 0;
    const totalPendaftaranHariIni = kunjunganHariIni[0].total;
    const okupansi = totalKuota > 0 ? Math.round((totalPendaftaranHariIni / totalKuota) * 100) : 0;

    // 5. Tren kunjungan 7 hari terakhir
    const [trenRows] = await pool.query(
      `SELECT tanggal_kunjungan, COUNT(*) AS total
       FROM kunjungan
       WHERE tanggal_kunjungan >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY tanggal_kunjungan
       ORDER BY tanggal_kunjungan ASC`
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
      `SELECT poli.nama_poli AS label, COUNT(*) AS total
       FROM pendaftaran pd
       JOIN poli ON poli.id_poli = pd.id_poli
       WHERE pd.tanggal >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY poli.nama_poli
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
        kunjunganHariIni: totalPendaftaranHariIni,
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
