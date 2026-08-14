import knex from "../../core/config/knex.js";

const TABLE = "mst_pasien";

function pad(num, size) {
  let s = String(num);
  while (s.length < size) s = "0" + s;
  return s;
}

async function generateId() {
  const today = new Date();
  const prefix = "PSN" + today.toISOString().slice(2, 10).replace(/-/g, "");
  const last = await knex(TABLE)
    .where("id", "like", `${prefix}%`)
    .orderBy("id", "desc")
    .first();
  const nextNumber = last ? parseInt(last.id.slice(-3)) + 1 : 1;
  return prefix + pad(nextNumber, 3);
}

async function generateNoRm() {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = "RM" + year;
  const last = await knex(TABLE)
    .where("no_rm", "like", `${prefix}%`)
    .orderBy("no_rm", "desc")
    .first();
  const nextNumber = last ? parseInt(last.no_rm.slice(-5)) + 1 : 1;
  return prefix + pad(nextNumber, 5);
}

// Generate transaction ID for trx_antrian: TRX + YYMMDD + xxx counter
async function generateTrxId() {
  const today = new Date();
  const prefix = "TRX" + today.toISOString().slice(2, 10).replace(/-/g, ""); // e.g. TRX260813
  const last = await knex("trx_antrian")
    .where("id", "like", `${prefix}%`)
    .orderBy("id", "desc")
    .first();
  const nextNumber = last ? parseInt(last.id.slice(-3), 10) + 1 : 1;
  return prefix + pad(nextNumber, 3);
}

// Generate queue number for a Poli today: sequential 3 digits e.g. 001
async function generatePoliNoAntrian(kode_poli) {
  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const countRow = await knex("trx_antrian")
    .where({ kode_poli, tanggal: todayStr })
    .count("id as count")
    .first();
  const nextNum = (countRow ? parseInt(countRow.count, 10) : 0) + 1;
  return pad(nextNum, 3);
}

// GET /pasien/poli -> dapatkan semua poli
async function getPoli(req, res) {
  try {
    const data = await knex("mst_poli").select("*");
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /pasien/search?q=  -> cari pasien lama (untuk tab Pasien Lama)
async function search(req, res) {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.json({ success: true, data: [] });
  }
  try {
    const data = await knex(TABLE)
      .distinct(
        "no_rm",
        "nik",
        "nama_pasien",
        "tanggal_lahir",
        "jenis_kelamin",
        "no_hp"
      )
      .where("no_rm", "like", `%${q}%`)
      .orWhere("nik", "like", `%${q}%`)
      .orWhere("nama_pasien", "like", `%${q}%`)
      .limit(10);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /pasien/baru -> daftar pasien baru (No. RM baru dibuat otomatis)
async function daftarBaru(req, res) {
  const body = req.body;
  const required = ["kode_poli", "nik", "nama_pasien", "email", "detail_alamat"];
  for (const field of required) {
    if (!body[field]) {
      return res
        .status(400)
        .json({ success: false, message: `${field} wajib diisi` });
    }
  }

  try {
    const id = await generateId();
    const no_rm = await generateNoRm();

    // Check if there is an active called queue ticket in nomor_antrian_awal
    let active_kode_antrian = "";
    const activeTicket = await knex("nomor_antrian_awal")
      .where({ status: "dipanggil" })
      .orderBy("kode_antrian", "asc")
      .first();
    if (activeTicket) {
      // Ensure the active ticket is not already associated to prevent duplicate key errors in unique index
      const exist = await knex(TABLE).where({ kode_antrian: activeTicket.kode_antrian }).first();
      if (!exist) {
        active_kode_antrian = activeTicket.kode_antrian;
      }
    }

    const final_kode_antrian = active_kode_antrian || `DUMMY-${id}`;

    // 1. Insert patient master
    const patientPayload = {
      id,
      no_rm,
      kode_antrian: final_kode_antrian,
      nik: body.nik,
      nama_pasien: body.nama_pasien,
      nama_ibu_kandung: body.nama_ibu_kandung || null,
      tanggal_lahir: body.tanggal_lahir || null,
      tempat_lahir: body.tempat_lahir || null,
      jenis_kelamin: body.jenis_kelamin || null,
      email: body.email,
      golongan_darah: body.golongan_darah || null,
      agama: body.agama || null,
      status_perkawinan: body.status_perkawinan || null,
      pekerjaan: body.pekerjaan || null,
      pendidikan: body.pendidikan || null,
      kewarganegaraan: body.kewarganegaraan || "WNI",
      provinsi: body.provinsi || null,
      kota_kabupaten: body.kota_kabupaten || null,
      kecamatan: body.kecamatan || null,
      kelurahan: body.kelurahan || null,
      detail_alamat: body.detail_alamat,
      kode_pos: body.kode_pos || null,
      no_hp: body.no_hp || null,
    };
    await knex(TABLE).insert(patientPayload);

    // 2. Insert transaction queue (trx_antrian)
    const trxId = await generateTrxId();
    const noAntrianPoli = await generatePoliNoAntrian(body.kode_poli);
    const todayStr = new Date().toISOString().slice(0, 10);

    const trxPayload = {
      id: trxId,
      no_antrian: noAntrianPoli,
      no_rm: no_rm,
      kode_poli: body.kode_poli,
      tanggal: todayStr,
      status_panggil: "menunggu",
    };
    if (body.kode_penjamin !== undefined) {
      trxPayload.kode_penjamin = body.kode_penjamin;
    }
    await knex("trx_antrian").insert(trxPayload);

    res.json({
      success: true,
      message: "Pasien baru berhasil didaftarkan",
      data: {
        patient: patientPayload,
        transaction: trxPayload,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /pasien/lama -> daftarkan kunjungan baru untuk pasien yang sudah punya No. RM
async function daftarLama(req, res) {
  const body = req.body;
  const required = ["kode_poli", "no_rm"];
  for (const field of required) {
    if (!body[field]) {
      return res
        .status(400)
        .json({ success: false, message: `${field} wajib diisi` });
    }
  }

  try {
    const existing = await knex(TABLE)
      .where({ no_rm: body.no_rm })
      .first();

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Data pasien lama tidak ditemukan" });
    }

    // Check if there is an active called queue ticket in nomor_antrian_awal
    let active_kode_antrian = "";
    const activeTicket = await knex("nomor_antrian_awal")
      .where({ status: "dipanggil" })
      .orderBy("kode_antrian", "asc")
      .first();
    if (activeTicket) {
      const exist = await knex(TABLE).where({ kode_antrian: activeTicket.kode_antrian }).first();
      if (!exist) {
        active_kode_antrian = activeTicket.kode_antrian;
      }
    }

    // 1. Update patient master's kode_antrian (if there is an active called ticket)
    const updates = {};
    if (active_kode_antrian) {
      updates.kode_antrian = active_kode_antrian;
    }
    if (Object.keys(updates).length > 0) {
      await knex(TABLE).where({ no_rm: body.no_rm }).update(updates);
    }

    // 2. Insert transaction queue (trx_antrian)
    const trxId = await generateTrxId();
    const noAntrianPoli = await generatePoliNoAntrian(body.kode_poli);
    const todayStr = new Date().toISOString().slice(0, 10);

    const trxPayload = {
      id: trxId,
      no_antrian: noAntrianPoli,
      no_rm: body.no_rm,
      kode_poli: body.kode_poli,
      tanggal: todayStr,
      status_panggil: "menunggu",
    };
    if (body.kode_penjamin !== undefined) {
      trxPayload.kode_penjamin = body.kode_penjamin;
    }
    await knex("trx_antrian").insert(trxPayload);

    res.json({
      success: true,
      message: "Kunjungan pasien lama berhasil didaftarkan",
      data: {
        patient: { ...existing, ...updates },
        transaction: trxPayload,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /pasien/poli -> tambah poli baru
async function createPoli(req, res) {
  const { kode_poli, nama_poli } = req.body;
  if (!nama_poli) {
    return res.status(400).json({ success: false, message: "Nama poli wajib diisi" });
  }

  try {
    let final_kode_poli = kode_poli;
    if (!final_kode_poli) {
      // Auto-generate kode_poli: POLxx
      const last = await knex("mst_poli")
        .where("kode_poli", "like", "POL%")
        .orderBy("kode_poli", "desc")
        .first();
      let nextNum = 1;
      if (last) {
        const match = last.kode_poli.match(/^POL(\d+)$/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
      final_kode_poli = "POL" + String(nextNum).padStart(2, "0");
    }

    const exist = await knex("mst_poli").where({ kode_poli: final_kode_poli }).first();
    if (exist) {
      return res.status(400).json({ success: false, message: `Kode poli ${final_kode_poli} sudah terdaftar` });
    }

    await knex("mst_poli").insert({
      id: final_kode_poli,
      kode_poli: final_kode_poli,
      nama_poli,
    });

    res.status(201).json({
      success: true,
      message: "Poli berhasil ditambahkan",
      data: { id: final_kode_poli, kode_poli: final_kode_poli, nama_poli }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PUT /pasien/poli/:kode_poli -> edit nama poli
async function updatePoli(req, res) {
  const { kode_poli } = req.params;
  const { nama_poli } = req.body;
  if (!nama_poli) {
    return res.status(400).json({ success: false, message: "Nama poli wajib diisi" });
  }

  try {
    const exist = await knex("mst_poli").where({ kode_poli }).first();
    if (!exist) {
      return res.status(404).json({ success: false, message: "Poli tidak ditemukan" });
    }

    await knex("mst_poli").where({ kode_poli }).update({ nama_poli });
    res.json({ success: true, message: "Poli berhasil diperbarui" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /pasien/poli/:kode_poli -> hapus poli
async function deletePoli(req, res) {
  const { kode_poli } = req.params;

  try {
    const exist = await knex("mst_poli").where({ kode_poli }).first();
    if (!exist) {
      return res.status(404).json({ success: false, message: "Poli tidak ditemukan" });
    }

    // Check if there are patient visits referencing this clinic
    const hasVisits = await knex("trx_antrian").where({ kode_poli }).first();
    if (hasVisits) {
      return res.status(400).json({
        success: false,
        message: "Poli tidak dapat dihapus karena sudah memiliki riwayat kunjungan antrean"
      });
    }

    await knex("mst_poli").where({ kode_poli }).del();
    res.json({ success: true, message: "Poli berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export { search, daftarBaru, daftarLama, getPoli, createPoli, updatePoli, deletePoli };