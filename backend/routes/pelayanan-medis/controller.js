import knex from "../../core/config/knex.js";

const TABLE_KUNJUNGAN = "trx_kunjungan";
const TABLE_PEMERIKSAAN = "trx_pemeriksaan";
const TABLE_ANTRIAN = "trx_antrian";
const TABLE_PASIEN = "mst_pasien";

function pad(num, size) {
  let s = String(num);
  while (s.length < size) s = "0" + s;
  return s;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Generate id + kode_kunjungan baru, format: TRK<YYMMDD><counter> / KJG-<YYYYMMDD>-<counter>
async function generateKunjunganCode() {
  const today = new Date();
  const yymmdd = today.toISOString().slice(2, 10).replace(/-/g, "");
  const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = "TRK" + yymmdd;

  const last = await knex(TABLE_KUNJUNGAN)
    .where("id", "like", `${prefix}%`)
    .orderBy("id", "desc")
    .first();

  let nextNum = 1;
  if (last) {
    const match = last.id.match(new RegExp(`^${prefix}(\\d+)$`));
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }

  return {
    id: prefix + pad(nextNum, 4),
    kode_kunjungan: `KJG-${yyyymmdd}-${pad(nextNum, 4)}`,
  };
}

// Pastikan ada baris trx_kunjungan untuk satu baris trx_antrian.
// Dipakai supaya data lama (yang dibuat sebelum modul ini ada) tetap bisa muncul di Pemeriksaan Dokter.
async function ensureKunjunganFromAntrian(antrianRow) {
  let kunjungan = await knex(TABLE_KUNJUNGAN)
    .where({ kode_antrian: antrianRow.id })
    .first();

  if (kunjungan) return kunjungan;

  const { id, kode_kunjungan } = await generateKunjunganCode();

  // Cari dokter yang bertugas di poli tsb (opsional, ambil salah satu)
  const dokter = await knex("mst_dokter").where({ kode_poli: antrianRow.kode_poli }).first();

  const payload = {
    id,
    kode_kunjungan,
    kode_antrian: antrianRow.id,
    no_rm: antrianRow.no_rm,
    kode_poli: antrianRow.kode_poli,
    no_sip: dokter ? dokter.no_sip : null,
    kode_penjamin: antrianRow.kode_penjamin || null,
    tanggal_kunjungan: antrianRow.tanggal,
    jam_masuk: new Date(),
    keluhan_awal: null,
    status_kunjungan: "diperiksa",
  };

  await knex(TABLE_KUNJUNGAN).insert(payload);
  return payload;
}

// GET /api/pelayanan-medis/kunjungan?kode_poli=&tanggal=&status=diperiksa
async function getKunjungan(req, res) {
  const { kode_poli, tanggal, status } = req.query;
  const filterTanggal = tanggal || todayStr();
  const filterStatus = status || "diperiksa";

  try {
    const query = knex(TABLE_KUNJUNGAN)
      .join(TABLE_PASIEN, `${TABLE_KUNJUNGAN}.no_rm`, `${TABLE_PASIEN}.no_rm`)
      .join("mst_poli", `${TABLE_KUNJUNGAN}.kode_poli`, "mst_poli.kode_poli")
      .leftJoin("mst_dokter", `${TABLE_KUNJUNGAN}.no_sip`, "mst_dokter.no_sip")
      .select(
        `${TABLE_KUNJUNGAN}.id`,
        `${TABLE_KUNJUNGAN}.kode_kunjungan`,
        `${TABLE_KUNJUNGAN}.kode_antrian`,
        `${TABLE_KUNJUNGAN}.no_rm`,
        `${TABLE_KUNJUNGAN}.kode_poli`,
        `${TABLE_KUNJUNGAN}.no_sip`,
        `${TABLE_KUNJUNGAN}.kode_penjamin`,
        `${TABLE_KUNJUNGAN}.tanggal_kunjungan`,
        `${TABLE_KUNJUNGAN}.jam_masuk`,
        `${TABLE_KUNJUNGAN}.jam_selesai`,
        `${TABLE_KUNJUNGAN}.keluhan_awal`,
        `${TABLE_KUNJUNGAN}.status_kunjungan`,
        `${TABLE_PASIEN}.nama_pasien`,
        `${TABLE_PASIEN}.jenis_kelamin`,
        `${TABLE_PASIEN}.tanggal_lahir`,
        "mst_poli.nama_poli",
        "mst_dokter.nama_dokter"
      )
      .whereRaw("DATE(trx_kunjungan.tanggal_kunjungan) = ?", [filterTanggal]);

    if (filterStatus !== "semua") {
      query.where(`${TABLE_KUNJUNGAN}.status_kunjungan`, filterStatus);
    }
    if (kode_poli) {
      query.where(`${TABLE_KUNJUNGAN}.kode_poli`, kode_poli);
    }

    query.orderBy(`${TABLE_KUNJUNGAN}.jam_masuk`, "asc");

    const data = await query;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/pelayanan-medis/kunjungan/:kode_kunjungan
async function getKunjunganDetail(req, res) {
  const { kode_kunjungan } = req.params;
  try {
    const kunjungan = await knex(TABLE_KUNJUNGAN)
      .join(TABLE_PASIEN, `${TABLE_KUNJUNGAN}.no_rm`, `${TABLE_PASIEN}.no_rm`)
      .join("mst_poli", `${TABLE_KUNJUNGAN}.kode_poli`, "mst_poli.kode_poli")
      .leftJoin("mst_dokter", `${TABLE_KUNJUNGAN}.no_sip`, "mst_dokter.no_sip")
      .where(`${TABLE_KUNJUNGAN}.kode_kunjungan`, kode_kunjungan)
      .select(
        `${TABLE_KUNJUNGAN}.*`,
        `${TABLE_PASIEN}.nama_pasien`,
        `${TABLE_PASIEN}.jenis_kelamin`,
        `${TABLE_PASIEN}.tanggal_lahir`,
        `${TABLE_PASIEN}.no_hp`,
        `${TABLE_PASIEN}.golongan_darah`,
        "mst_poli.nama_poli",
        "mst_dokter.nama_dokter"
      )
      .first();

    if (!kunjungan) {
      return res.status(404).json({ success: false, message: "Kunjungan tidak ditemukan" });
    }

    const pemeriksaan = await knex(TABLE_PEMERIKSAAN)
      .where({ kode_kunjungan })
      .first();

    res.json({ success: true, data: { ...kunjungan, pemeriksaan: pemeriksaan || null } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/pelayanan-medis/kunjungan/:id/mulai
// Dipanggil dari halaman Antrian Poli (tombol "Panggil") ATAU langsung dari halaman Pemeriksaan
// untuk memastikan trx_kunjungan tersedia & berstatus 'diperiksa'.
async function mulaiKunjunganFromAntrian(req, res) {
  const { id } = req.params; // id = trx_antrian.id

  try {
    const antrian = await knex(TABLE_ANTRIAN).where({ id }).first();
    if (!antrian) {
      return res.status(404).json({ success: false, message: "Data antrian tidak ditemukan" });
    }

    const kunjungan = await ensureKunjunganFromAntrian(antrian);

    if (kunjungan.status_kunjungan !== "diperiksa") {
      await knex(TABLE_KUNJUNGAN)
        .where({ id: kunjungan.id })
        .update({ status_kunjungan: "diperiksa", jam_masuk: kunjungan.jam_masuk || new Date() });
    }

    res.json({ success: true, message: "Kunjungan siap diperiksa", data: kunjungan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/pelayanan-medis/dokter?kode_poli=
async function getDokter(req, res) {
  const { kode_poli } = req.query;
  try {
    const query = knex("mst_dokter").select("*").orderBy("nama_dokter");
    if (kode_poli) query.where({ kode_poli });
    const data = await query;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/pelayanan-medis/pemeriksaan
// Simpan hasil pemeriksaan (SOAP + vital sign) & tandai kunjungan + antrian selesai
async function simpanPemeriksaan(req, res) {
  const {
    kode_kunjungan,
    no_sip,
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
  } = req.body;

  if (!kode_kunjungan) {
    return res.status(400).json({ success: false, message: "kode_kunjungan wajib diisi" });
  }

  try {
    const kunjungan = await knex(TABLE_KUNJUNGAN).where({ kode_kunjungan }).first();
    if (!kunjungan) {
      return res.status(404).json({ success: false, message: "Kunjungan tidak ditemukan" });
    }

    const existingPemeriksaan = await knex(TABLE_PEMERIKSAAN).where({ kode_kunjungan }).first();

    const payload = {
      kode_kunjungan,
      no_sip: no_sip || kunjungan.no_sip || null,
      subjektif: subjektif || null,
      objektif: objektif || null,
      assessment: assessment || null,
      plan: plan || null,
      icd10_code: icd10_code || null,
      icd10_deskripsi: icd10_deskripsi || null,
      tekanan_darah: tekanan_darah || null,
      suhu: suhu !== undefined && suhu !== "" ? suhu : null,
      nadi: nadi !== undefined && nadi !== "" ? nadi : null,
      respirasi: respirasi !== undefined && respirasi !== "" ? respirasi : null,
      berat_badan: berat_badan !== undefined && berat_badan !== "" ? berat_badan : null,
      tinggi_badan: tinggi_badan !== undefined && tinggi_badan !== "" ? tinggi_badan : null,
    };

    if (existingPemeriksaan) {
      await knex(TABLE_PEMERIKSAAN).where({ kode_kunjungan }).update(payload);
    } else {
      const last = await knex(TABLE_PEMERIKSAAN)
        .where("id", "like", "PRX%")
        .orderBy("id", "desc")
        .first();
      let nextNum = 1;
      if (last) {
        const match = last.id.match(/^PRX(\d+)$/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
      }
      payload.id = "PRX" + pad(nextNum, 5);
      await knex(TABLE_PEMERIKSAAN).insert(payload);
    }

    // Tandai kunjungan selesai
    await knex(TABLE_KUNJUNGAN)
      .where({ kode_kunjungan })
      .update({ status_kunjungan: "selesai", jam_selesai: new Date() });

    // Sinkronkan status antrian terkait (jika ada) agar konsisten dengan halaman Antrian
    if (kunjungan.kode_antrian) {
      await knex(TABLE_ANTRIAN).where({ id: kunjungan.kode_antrian }).update({ status_panggil: "selesai" });
    }

    res.json({ success: true, message: "Hasil pemeriksaan berhasil disimpan" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/pelayanan-medis/rekam-medis/search?q=
async function searchPasien(req, res) {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.json({ success: true, data: [] });
  }
  try {
    const data = await knex(TABLE_PASIEN)
      .distinct("no_rm", "nik", "nama_pasien", "tanggal_lahir", "jenis_kelamin", "no_hp")
      .where("no_rm", "like", `%${q}%`)
      .orWhere("nik", "like", `%${q}%`)
      .orWhere("nama_pasien", "like", `%${q}%`)
      .limit(15);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/pelayanan-medis/rekam-medis/:no_rm
async function getRekamMedis(req, res) {
  const { no_rm } = req.params;
  try {
    const pasien = await knex(TABLE_PASIEN).where({ no_rm }).first();
    if (!pasien) {
      return res.status(404).json({ success: false, message: "Data pasien tidak ditemukan" });
    }

    const riwayat = await knex(TABLE_KUNJUNGAN)
      .leftJoin("mst_poli", `${TABLE_KUNJUNGAN}.kode_poli`, "mst_poli.kode_poli")
      .leftJoin("mst_dokter", `${TABLE_KUNJUNGAN}.no_sip`, "mst_dokter.no_sip")
      .leftJoin(TABLE_PEMERIKSAAN, `${TABLE_KUNJUNGAN}.kode_kunjungan`, `${TABLE_PEMERIKSAAN}.kode_kunjungan`)
      .where(`${TABLE_KUNJUNGAN}.no_rm`, no_rm)
      .select(
        `${TABLE_KUNJUNGAN}.kode_kunjungan`,
        `${TABLE_KUNJUNGAN}.tanggal_kunjungan`,
        `${TABLE_KUNJUNGAN}.jam_masuk`,
        `${TABLE_KUNJUNGAN}.jam_selesai`,
        `${TABLE_KUNJUNGAN}.keluhan_awal`,
        `${TABLE_KUNJUNGAN}.status_kunjungan`,
        "mst_poli.nama_poli",
        "mst_dokter.nama_dokter",
        `${TABLE_PEMERIKSAAN}.subjektif`,
        `${TABLE_PEMERIKSAAN}.objektif`,
        `${TABLE_PEMERIKSAAN}.assessment`,
        `${TABLE_PEMERIKSAAN}.plan`,
        `${TABLE_PEMERIKSAAN}.icd10_code`,
        `${TABLE_PEMERIKSAAN}.icd10_deskripsi`,
        `${TABLE_PEMERIKSAAN}.tekanan_darah`,
        `${TABLE_PEMERIKSAAN}.suhu`,
        `${TABLE_PEMERIKSAAN}.nadi`,
        `${TABLE_PEMERIKSAAN}.respirasi`,
        `${TABLE_PEMERIKSAAN}.berat_badan`,
        `${TABLE_PEMERIKSAAN}.tinggi_badan`
      )
      .orderBy(`${TABLE_KUNJUNGAN}.tanggal_kunjungan`, "desc")
      .orderBy(`${TABLE_KUNJUNGAN}.jam_masuk`, "desc");

    res.json({ success: true, data: { pasien, riwayat } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export {
  getKunjungan,
  getKunjunganDetail,
  mulaiKunjunganFromAntrian,
  getDokter,
  simpanPemeriksaan,
  searchPasien,
  getRekamMedis,
};
