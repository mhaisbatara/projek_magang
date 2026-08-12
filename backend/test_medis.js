import pool from "./config/db.js";
import { savePemeriksaan } from "./controllers/medisController.js";

async function run() {
  const conn = await pool.getConnection();
  try {
    console.log("Preparing test database entries...");

    // 1. Ensure we have at least one patient
    let [pasienRows] = await conn.query("SELECT id, no_rm, kode_penjamin FROM mst_pasien LIMIT 1");
    let no_rm, id_pasien, kode_penjamin;

    if (pasienRows.length === 0) {
      console.log("No patient found. Creating a test patient...");
      id_pasien = "PSN99";
      no_rm = "RM9999";
      kode_penjamin = "PJM01";
      await conn.query(
        "INSERT INTO mst_pasien (id, no_rm, nik, nama_pasien, tanggal_lahir, jk, alamat, no_hp, kode_penjamin) VALUES (?, ?, '1234567890123456', 'Test Patient', '1995-05-10', 'L', 'Jl. Test', '0812', ?)",
        [id_pasien, kode_penjamin]
      );
    } else {
      id_pasien = pasienRows[0].id;
      no_rm = pasienRows[0].no_rm;
      kode_penjamin = pasienRows[0].kode_penjamin || "PJM01";
    }

    // 2. Ensure we have an active queue item for today
    let [antrianRows] = await conn.query("SELECT id FROM mst_antrian WHERE tanggal = CURDATE() AND status_panggil != 'selesai' LIMIT 1");
    let id_antrian;

    if (antrianRows.length === 0) {
      console.log("No active queue item found. Creating a test queue...");
      id_antrian = "ANT99";
      await conn.query(
        "INSERT INTO mst_antrian (id, kode_antrian, no_antrian, no_rm, kode_poli, tanggal, status_panggil) VALUES (?, 'ANT-99999999-999', 'A-999', ?, 'POL01', CURDATE(), 'menunggu')",
        [id_antrian, no_rm]
      );
    } else {
      id_antrian = antrianRows[0].id;
    }

    // 3. Ensure we have medicines in mst_obat
    const [obatRows] = await conn.query("SELECT id, kode_obat, nama_obat, harga_jual, stok FROM mst_obat LIMIT 2");
    if (obatRows.length === 0) {
      console.log("Warning: No medicines in mst_obat. Prescription testing might be skipped.");
    }

    console.log("Mocking request to savePemeriksaan...");

    const req = {
      body: {
        id_antrian: id_antrian,
        subjektif: "Keluhan sakit kepala dan pusing",
        objektif: "Tensi normal, pemeriksaan penunjang normal",
        assessment: "Cephalgia (sakit kepala biasa)",
        plan: "Istirahat cukup dan minum obat tepat waktu",
        icd10_code: "R51",
        icd10_deskripsi: "Headache",
        tekanan_darah: "120/80",
        suhu: "36.6",
        nadi: "80",
        respirasi: "18",
        berat_badan: "65.5",
        tinggi_badan: "170",
        resep: obatRows.map(o => ({
          id_obat: o.id,
          dosis: "3x1",
          jumlah: 10,
          aturan_pakai: "Sesudah makan"
        }))
      }
    };

    let responseData = null;
    const res = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        responseData = data;
        return this;
      },
      statusCode: 200
    };

    await savePemeriksaan(req, res);

    console.log("Response status:", res.statusCode);
    console.log("Response data:", responseData);

    if (res.statusCode === 201) {
      console.log("SUCCESS: savePemeriksaan completed successfully.");
      
      // Let's verify details in database
      const [visit] = await conn.query("SELECT * FROM mst_kunjungan WHERE kode_kunjungan = ?", [responseData.data.kode_kunjungan]);
      console.log("Visit inserted:", visit.length > 0 ? "YES" : "NO");

      const [pemeriksaan] = await conn.query("SELECT * FROM mst_pemeriksaan WHERE kode_kunjungan = ?", [responseData.data.kode_kunjungan]);
      console.log("Pemeriksaan inserted:", pemeriksaan.length > 0 ? "YES" : "NO");

      const [tagihan] = await conn.query("SELECT * FROM trx_tagihan WHERE kode_tagihan = ?", [responseData.data.kode_tagihan]);
      console.log("Tagihan inserted:", tagihan.length > 0 ? "YES" : "NO");

      const [detailTagihan] = await conn.query("SELECT * FROM trx_detail_tagihan WHERE kode_tagihan = ?", [responseData.data.kode_tagihan]);
      console.log(`Tagihan details inserted: ${detailTagihan.length} rows`);
      detailTagihan.forEach(d => {
        console.log(`  - ${d.jenis_item}: ${d.nama_item} (qty: ${d.qty}, subtotal: Rp ${d.subtotal})`);
      });
    } else {
      console.log("FAILED: savePemeriksaan returned error status.");
    }

  } catch (err) {
    console.error("Error during test run:", err);
  } finally {
    conn.release();
    process.exit();
  }
}

run();
