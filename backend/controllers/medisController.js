import pool from "../config/db.js";

// Helper to generate sequential ID (e.g. KJN01, PMK01, RSP01)
async function generateId(conn, table, column, prefix) {
  const [rows] = await conn.query(
    `SELECT ${column} FROM ${table} ORDER BY ${column} DESC LIMIT 1 FOR UPDATE`
  );
  if (rows.length === 0) return prefix + "01";
  const lastNumber = parseInt(rows[0][column].replace(prefix, ""), 10);
  return prefix + String(lastNumber + 1).padStart(2, "0");
}

// Helper to generate daily codes
async function generateKodeKunjungan(conn) {
  const [[ymdRow]] = await conn.query("SELECT DATE_FORMAT(CURDATE(), '%Y%m%d') AS ymd");
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS total FROM mst_kunjungan WHERE tanggal_kunjungan = CURDATE() FOR UPDATE"
  );
  const seq = (rows[0]?.total || 0) + 1;
  return `KJN-${ymdRow.ymd}-${String(seq).padStart(3, "0")}`;
}

async function generateKodeResep(conn) {
  const [[ymdRow]] = await conn.query("SELECT DATE_FORMAT(CURDATE(), '%Y%m%d') AS ymd");
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS total FROM mst_resep WHERE tanggal_resep = CURDATE() FOR UPDATE"
  );
  const seq = (rows[0]?.total || 0) + 1;
  return `RSP-${ymdRow.ymd}-${String(seq).padStart(3, "0")}`;
}

async function generateKodeTagihan(conn) {
  const [[ymdRow]] = await conn.query("SELECT DATE_FORMAT(CURDATE(), '%Y%m%d') AS ymd");
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS total FROM trx_tagihan WHERE tanggal = CURDATE() FOR UPDATE"
  );
  const seq = (rows[0]?.total || 0) + 1;
  return `TGH-${ymdRow.ymd}-${String(seq).padStart(3, "0")}`;
}

// POST /api/medis/periksa
export const savePemeriksaan = async (req, res) => {
  const {
    id_antrian,
    subjektif,
    objektif,
    assessment,
    plan,
    icd10_code,
    icd10_deskripsi,
    tekanan_darah,
    suhu,
    nadi,
    respirasi,
    berat_badan,
    tinggi_badan,
    resep, // Array of { id_obat, dosis, jumlah, aturan_pakai }
  } = req.body;

  if (!id_antrian) {
    return res.status(400).json({ message: "id_antrian wajib disertakan." });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Ambil data antrean aktif
    const [antrianRows] = await conn.query(
      `SELECT a.kode_antrian, a.no_rm, a.kode_poli, p.nama_poli, pas.kode_penjamin
       FROM mst_antrian a
       JOIN mst_poli p ON p.kode_poli = a.kode_poli
       JOIN mst_pasien pas ON pas.no_rm = a.no_rm
       WHERE a.id = ? FOR UPDATE`,
      [id_antrian]
    );

    if (antrianRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Data antrean tidak ditemukan." });
    }

    const antrian = antrianRows[0];
    const { kode_antrian, no_rm, kode_poli, nama_poli, kode_penjamin } = antrian;

    // 2. Resolve no_sip (dokter yang bertugas hari ini di poli tersebut)
    const [jadwalRows] = await conn.query(
      `SELECT no_sip 
       FROM mst_jadwal_dokter 
       WHERE kode_poli = ? 
         AND hari = ELT(WEEKDAY(CURDATE()) + 1, 'Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu')
       LIMIT 1`,
      [kode_poli]
    );
    const no_sip = jadwalRows[0]?.no_sip || "SIP01"; // Fallback to SIP01 if not scheduled

    // 3. Simpan Kunjungan (mst_kunjungan)
    const idKunjungan = await generateId(conn, "mst_kunjungan", "id", "KJN");
    const kodeKunjungan = await generateKodeKunjungan(conn);

    await conn.query(
      `INSERT INTO mst_kunjungan 
       (id, kode_kunjungan, kode_antrian, no_rm, kode_poli, no_sip, kode_penjamin, tanggal_kunjungan, jam_masuk, jam_selesai, keluhan_awal, status_kunjungan)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), NOW(), NOW(), ?, 'selesai')`,
      [idKunjungan, kodeKunjungan, kode_antrian, no_rm, kode_poli, no_sip, kode_penjamin, subjektif]
    );

    // 4. Simpan Pemeriksaan SOAP & Vital (mst_pemeriksaan)
    const idPemeriksaan = await generateId(conn, "mst_pemeriksaan", "id", "PMK");
    await conn.query(
      `INSERT INTO mst_pemeriksaan 
       (id, kode_kunjungan, no_sip, subjektif, objektif, assessment, plan, icd10_code, icd10_deskripsi, tekanan_darah, suhu, nadi, respirasi, berat_badan, tinggi_badan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idPemeriksaan,
        kodeKunjungan,
        no_sip,
        subjektif || null,
        objektif || null,
        assessment || null,
        plan || null,
        icd10_code || null,
        icd10_deskripsi || null,
        tekanan_darah || null,
        suhu ? parseFloat(suhu) : null,
        nadi ? parseInt(nadi, 10) : null,
        respirasi ? parseInt(respirasi, 10) : null,
        berat_badan ? parseFloat(berat_badan) : null,
        tinggi_badan ? parseFloat(tinggi_badan) : null,
      ]
    );

    // 5. Simpan Resep (mst_resep & mst_resep_detail)
    let kodeResep = null;
    let detailResepList = [];

    if (Array.isArray(resep) && resep.length > 0) {
      const idResep = await generateId(conn, "mst_resep", "id", "RSP");
      kodeResep = await generateKodeResep(conn);

      await conn.query(
        `INSERT INTO mst_resep (id, kode_resep, kode_kunjungan, no_sip, tanggal_resep, catatan, status_dispensing)
         VALUES (?, ?, ?, ?, CURDATE(), ?, 'menunggu')`,
        [idResep, kodeResep, kodeKunjungan, no_sip, plan || "Resep obat pasien poliklinik"]
      );

      for (const r of resep) {
        const idDetail = await generateId(conn, "mst_resep_detail", "id", "RPD");
        
        // Ambil data obat berdasarkan id (e.g. OBT01)
        const [obatRows] = await conn.query(
          "SELECT kode_obat, nama_obat, harga_jual, stok FROM mst_obat WHERE id = ? FOR UPDATE",
          [r.id_obat]
        );

        if (obatRows.length > 0) {
          const obat = obatRows[0];
          await conn.query(
            `INSERT INTO mst_resep_detail (id, kode_resep, kode_obat, dosis, jumlah, aturan_pakai)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [idDetail, kodeResep, obat.kode_obat, r.dosis, r.jumlah, r.aturan_pakai]
          );

          // Kurangi stok obat
          await conn.query(
            "UPDATE mst_obat SET stok = GREATEST(stok - ?, 0) WHERE id = ?",
            [r.jumlah, r.id_obat]
          );

          detailResepList.push({
            nama_obat: obat.nama_obat,
            qty: r.jumlah,
            harga_satuan: parseFloat(obat.harga_jual),
            subtotal: r.jumlah * parseFloat(obat.harga_jual),
          });
        }
      }
    }

    // 6. Buat Tagihan Pembayaran (trx_tagihan & trx_detail_tagihan)
    const idTagihan = await generateId(conn, "trx_tagihan", "id", "TGH");
    const kodeTagihan = await generateKodeTagihan(conn);

    // Tambah item Konsultasi Dokter (default: Rp 50.000)
    const idDetailKonsultasi = await generateId(conn, "trx_detail_tagihan", "id", "TGD");
    const biayaKonsultasi = 50000.0;
    await conn.query(
      `INSERT INTO trx_detail_tagihan (id, kode_tagihan, jenis_item, nama_item, qty, harga_satuan, subtotal)
       VALUES (?, ?, 'konsultasi', ?, 1, ?, ?)`,
      [idDetailKonsultasi, kodeTagihan, `Konsultasi & Pemeriksaan - ${nama_poli}`, biayaKonsultasi, biayaKonsultasi]
    );

    let totalObatVal = 0.0;
    // Tambah item Obat
    for (const d of detailResepList) {
      const idDetailObat = await generateId(conn, "trx_detail_tagihan", "id", "TGD");
      await conn.query(
        `INSERT INTO trx_detail_tagihan (id, kode_tagihan, jenis_item, nama_item, qty, harga_satuan, subtotal)
         VALUES (?, ?, 'obat', ?, ?, ?, ?)`,
        [idDetailObat, kodeTagihan, d.nama_obat, d.qty, d.harga_satuan, d.subtotal]
      );
      totalObatVal += d.subtotal;
    }

    const totalTagihan = biayaKonsultasi + totalObatVal;

    await conn.query(
      `INSERT INTO trx_tagihan (id, kode_tagihan, kode_kunjungan, no_rm, kode_penjamin, total_tagihan, status_pembayaran, tanggal)
       VALUES (?, ?, ?, ?, ?, ?, 'belum_bayar', CURDATE())`,
      [idTagihan, kodeTagihan, kodeKunjungan, no_rm, kode_penjamin, totalTagihan]
    );

    // 7. Perbarui status antrean menjadi 'selesai'
    await conn.query(
      `UPDATE mst_antrian SET status_panggil = 'selesai' WHERE id = ?`,
      [id_antrian]
    );

    await conn.commit();
    res.status(201).json({
      message: "Pemeriksaan medis berhasil disimpan",
      data: {
        id_kunjungan: idKunjungan,
        kode_kunjungan: kodeKunjungan,
        kode_tagihan: kodeTagihan,
        total_tagihan: totalTagihan,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error("Gagal menyimpan pemeriksaan medis:", err);
    res.status(500).json({ message: "Gagal menyimpan pemeriksaan medis", error: err.message });
  } finally {
    conn.release();
  }
};

// GET /api/medis/riwayat/:no_rm
export const getRiwayatPemeriksaan = async (req, res) => {
  const { no_rm } = req.params;

  try {
    // Ambal riwayat pemeriksaan beserta detail obat yang diberikan
    const [rows] = await pool.query(
      `SELECT 
        k.kode_kunjungan,
        k.tanggal_kunjungan,
        d.nama_dokter,
        p.subjektif,
        p.objektif,
        p.assessment,
        p.plan,
        p.icd10_code,
        p.icd10_deskripsi,
        p.tekanan_darah,
        p.suhu,
        p.nadi,
        p.respirasi,
        p.berat_badan,
        p.tinggi_badan,
        r.kode_resep
       FROM mst_kunjungan k
       JOIN mst_pemeriksaan p ON p.kode_kunjungan = k.kode_kunjungan
       LEFT JOIN mst_dokter d ON d.no_sip = k.no_sip
       LEFT JOIN mst_resep r ON r.kode_kunjungan = k.kode_kunjungan
       WHERE k.no_rm = ?
       ORDER BY k.tanggal_kunjungan DESC, k.created_at DESC`,
      [no_rm]
    );

    // Untuk setiap resep, ambil detail obatnya
    const riwayat = [];
    for (const row of rows) {
      let obatList = [];
      if (row.kode_resep) {
        const [oRows] = await pool.query(
          `SELECT rd.dosis, rd.jumlah, rd.aturan_pakai, o.nama_obat, o.satuan
           FROM mst_resep_detail rd
           JOIN mst_obat o ON o.kode_obat = rd.kode_obat
           WHERE rd.kode_resep = ?`,
          [row.kode_resep]
        );
        obatList = oRows;
      }
      riwayat.push({
        ...row,
        resep_obat: obatList
      });
    }

    res.json(riwayat);
  } catch (err) {
    console.error("Gagal mengambil riwayat pemeriksaan:", err);
    res.status(500).json({ message: "Gagal mengambil riwayat pemeriksaan", error: err.message });
  }
};
