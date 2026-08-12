import pool from "./config/db.js";

async function run() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    console.log("Seeding mst_poli...");
    const polis = [
      { id: 'POL01', kode_poli: 'POL01', nama_poli: 'Poli Umum' },
      { id: 'POL02', kode_poli: 'POL02', nama_poli: 'Poli Gigi' },
      { id: 'POL03', kode_poli: 'POL03', nama_poli: 'Poli Anak' },
      { id: 'POL04', kode_poli: 'POL04', nama_poli: 'Poli KIA' },
      { id: 'POL05', kode_poli: 'POL05', nama_poli: 'Poli Penyakit Dalam' }
    ];
    for (let p of polis) {
      const [existing] = await conn.query("SELECT * FROM mst_poli WHERE id = ?", [p.id]);
      if (existing.length === 0) {
        await conn.query("INSERT INTO mst_poli (id, kode_poli, nama_poli) VALUES (?, ?, ?)", [p.id, p.kode_poli, p.nama_poli]);
      }
    }

    console.log("Seeding mst_penjamin...");
    const penjamins = [
      { id: 'PJM01', kode_penjamin: 'PJM01', nama_penjamin: 'Umum', jenis: 'Umum' },
      { id: 'PJM02', kode_penjamin: 'PJM02', nama_penjamin: 'BPJS Kesehatan', jenis: 'BPJS' },
      { id: 'PJM03', kode_penjamin: 'PJM03', nama_penjamin: 'Asuransi Mandiri', jenis: 'Asuransi' }
    ];
    for (let p of penjamins) {
      const [existing] = await conn.query("SELECT * FROM mst_penjamin WHERE id = ?", [p.id]);
      if (existing.length === 0) {
        await conn.query("INSERT INTO mst_penjamin (id, kode_penjamin, nama_penjamin, jenis) VALUES (?, ?, ?, ?)", [p.id, p.kode_penjamin, p.nama_penjamin, p.jenis]);
      }
    }

    console.log("Seeding mst_dokter...");
    const dokters = [
      { id: 'DOK01', no_sip: 'SIP01', nama_dokter: 'dr. Budi Santoso', spesialisasi: 'Umum', kode_poli: 'POL01', no_hp: '08123456789', email: 'budi@klinik.com' },
      { id: 'DOK02', no_sip: 'SIP02', nama_dokter: 'drg. Rina Amelia', spesialisasi: 'Gigi', kode_poli: 'POL02', no_hp: '08123456790', email: 'rina@klinik.com' },
      { id: 'DOK03', no_sip: 'SIP03', nama_dokter: 'dr. Andi Wijaya, Sp.A', spesialisasi: 'Anak', kode_poli: 'POL03', no_hp: '08123456791', email: 'andi@klinik.com' },
      { id: 'DOK04', no_sip: 'SIP04', nama_dokter: 'dr. Siti Rahma, Sp.KK', spesialisasi: 'KIA', kode_poli: 'POL04', no_hp: '08123456792', email: 'siti@klinik.com' },
      { id: 'DOK05', no_sip: 'SIP05', nama_dokter: 'dr. Hendra Setiawan, Sp.PD', spesialisasi: 'Penyakit Dalam', kode_poli: 'POL05', no_hp: '08123456793', email: 'hendra@klinik.com' }
    ];
    for (let d of dokters) {
      const [existing] = await conn.query("SELECT * FROM mst_dokter WHERE id = ?", [d.id]);
      if (existing.length === 0) {
        await conn.query("INSERT INTO mst_dokter (id, no_sip, nama_dokter, spesialisasi, kode_poli, no_hp, email) VALUES (?, ?, ?, ?, ?, ?, ?)", [d.id, d.no_sip, d.nama_dokter, d.spesialisasi, d.kode_poli, d.no_hp, d.email]);
      }
    }

    console.log("Seeding mst_jadwal_dokter...");
    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    let jdIdCounter = 1;
    for (let d of dokters) {
      for (let day of days) {
        const jdId = `JAD${String(jdIdCounter++).padStart(2, '0')}`;
        const [existing] = await conn.query("SELECT * FROM mst_jadwal_dokter WHERE no_sip = ? AND hari = ?", [d.no_sip, day]);
        if (existing.length === 0) {
          await conn.query(
            "INSERT INTO mst_jadwal_dokter (id, no_sip, kode_poli, hari, jam_mulai, jam_selesai, kuota_pasien) VALUES (?, ?, ?, ?, '08:00:00', '14:00:00', 20)",
            [jdId, d.no_sip, d.kode_poli, day]
          );
        }
      }
    }

    console.log("Seeding mst_supplier...");
    const suppliers = [
      { id: 'SUP01', kode_supplier: 'SUP01', nama_supplier: 'PT Bio Farma', kontak: '021-1234567', alamat: 'Bandung' },
      { id: 'SUP02', kode_supplier: 'SUP02', nama_supplier: 'PT Kimia Farma', kontak: '021-7654321', alamat: 'Jakarta' }
    ];
    for (let s of suppliers) {
      const [existing] = await conn.query("SELECT * FROM mst_supplier WHERE id = ?", [s.id]);
      if (existing.length === 0) {
        await conn.query("INSERT INTO mst_supplier (id, kode_supplier, nama_supplier, kontak, alamat) VALUES (?, ?, ?, ?, ?)", [s.id, s.kode_supplier, s.nama_supplier, s.kontak, s.alamat]);
      }
    }

    console.log("Seeding mst_obat...");
    const obats = [
      { id: 'OBT01', kode_obat: 'OBT001', nama_obat: 'Paracetamol 500mg', kategori: 'Analgesik', satuan: 'Tablet', stok: 100, harga_beli: 500.00, harga_jual: 1000.00, stok_minimum: 10 },
      { id: 'OBT02', kode_obat: 'OBT002', nama_obat: 'Amoxicillin 500mg', kategori: 'Antibiotik', satuan: 'Tablet', stok: 50, harga_beli: 1000.00, harga_jual: 2000.00, stok_minimum: 10 }
    ];
    for (let o of obats) {
      const [existing] = await conn.query("SELECT * FROM mst_obat WHERE id = ?", [o.id]);
      if (existing.length === 0) {
        await conn.query("INSERT INTO mst_obat (id, kode_obat, nama_obat, kategori, satuan, stok, harga_beli, harga_jual, stok_minimum) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [o.id, o.kode_obat, o.nama_obat, o.kategori, o.satuan, o.stok, o.harga_beli, o.harga_jual, o.stok_minimum]);
      }
    }

    await conn.commit();
    console.log("Seeding completed successfully!");
  } catch (err) {
    await conn.rollback();
    console.error("Seeding failed:", err);
  } finally {
    conn.release();
    process.exit();
  }
}

run();
