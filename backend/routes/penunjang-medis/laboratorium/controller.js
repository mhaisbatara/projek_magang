import knex from "../../../core/config/knex.js";

const TABLE_PERMINTAAN = "trx_permintaan_lab";
const TABLE_HASIL = "trx_hasil_lab";

function pad(num, size) {
  let s = String(num);
  while (s.length < size) s = "0" + s;
  return s;
}

// ============================================================
// PERMINTAAN LAB (trx_permintaan_lab)
// ============================================================

// GET /api/laboratorium/permintaan?status=menunggu|diproses|selesai
async function getAllPermintaan(req, res) {
  const { status } = req.query;
  try {
    const query = knex(TABLE_PERMINTAAN + " as pl")
      .leftJoin("trx_kunjungan as k", "pl.kode_kunjungan", "k.kode_kunjungan")
      .leftJoin("mst_pasien as p", "k.no_rm", "p.no_rm")
      .select(
        "pl.id",
        "pl.kode_permintaan",
        "pl.kode_kunjungan",
        "pl.no_sip",
        "pl.jenis_pemeriksaan",
        "pl.tanggal_permintaan",
        "pl.status",
        "p.nama_pasien",
        "p.no_rm"
      )
      .orderBy("pl.tanggal_permintaan", "desc");

    if (status) {
      query.where("pl.status", status);
    }

    const data = await query;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/laboratorium/permintaan/:kode_permintaan
async function getPermintaanByKode(req, res) {
  const { kode_permintaan } = req.params;
  try {
    const permintaan = await knex(TABLE_PERMINTAAN + " as pl")
      .leftJoin("trx_kunjungan as k", "pl.kode_kunjungan", "k.kode_kunjungan")
      .leftJoin("mst_pasien as p", "k.no_rm", "p.no_rm")
      .where("pl.kode_permintaan", kode_permintaan)
      .select("pl.*", "p.nama_pasien", "p.no_rm", "p.jenis_kelamin", "p.tanggal_lahir")
      .first();

    if (!permintaan) {
      return res.status(404).json({ success: false, message: "Permintaan lab tidak ditemukan" });
    }

    const hasil = await knex(TABLE_HASIL)
      .where({ kode_permintaan })
      .orderBy("parameter");

    res.json({ success: true, data: { ...permintaan, hasil } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/laboratorium/permintaan/:kode_permintaan/proses
// status: menunggu -> diproses
async function prosesPermintaan(req, res) {
  const { kode_permintaan } = req.params;
  try {
    const permintaan = await knex(TABLE_PERMINTAAN).where({ kode_permintaan }).first();
    if (!permintaan) {
      return res.status(404).json({ success: false, message: "Permintaan lab tidak ditemukan" });
    }
    if (permintaan.status !== "menunggu") {
      return res.status(400).json({ success: false, message: "Permintaan sudah diproses sebelumnya" });
    }

    await knex(TABLE_PERMINTAAN).where({ kode_permintaan }).update({ status: "diproses" });
    res.json({ success: true, message: "Permintaan lab sedang diproses" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ============================================================
// HASIL LAB (trx_hasil_lab)
// ============================================================

async function generateIdHasil() {
  const last = await knex(TABLE_HASIL)
    .where("id", "like", "HSL%")
    .orderBy("id", "desc")
    .first();

  let nextNum = 1;
  if (last) {
    const match = last.id.match(/^HSL(\d+)$/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  return "HSL" + pad(nextNum, 5);
}

// POST /api/laboratorium/permintaan/:kode_permintaan/hasil
// body: { email_petugas_lab, hasil: [{ parameter, hasil, nilai_rujukan, satuan }] }
// Menyimpan seluruh parameter hasil sekaligus, lalu menandai permintaan selesai.
async function simpanHasil(req, res) {
  const { kode_permintaan } = req.params;
  const { email_petugas_lab, hasil } = req.body;

  if (!Array.isArray(hasil) || hasil.length === 0) {
    return res.status(400).json({ success: false, message: "Minimal 1 parameter hasil wajib diisi" });
  }
  for (const item of hasil) {
    if (!item.parameter || item.hasil === undefined || item.hasil === "") {
      return res.status(400).json({ success: false, message: "Setiap hasil wajib memiliki parameter dan nilai hasil" });
    }
  }

  try {
    const permintaan = await knex(TABLE_PERMINTAAN).where({ kode_permintaan }).first();
    if (!permintaan) {
      return res.status(404).json({ success: false, message: "Permintaan lab tidak ditemukan" });
    }
    if (permintaan.status === "selesai") {
      return res.status(400).json({ success: false, message: "Hasil untuk permintaan ini sudah tersimpan" });
    }

    const tanggal_hasil = new Date().toISOString().slice(0, 10);
    const inserted = [];

    for (const item of hasil) {
      const id = await generateIdHasil();
      const payload = {
        id,
        kode_permintaan,
        parameter: item.parameter,
        hasil: String(item.hasil),
        nilai_rujukan: item.nilai_rujukan || null,
        satuan: item.satuan || null,
        email_petugas_lab: email_petugas_lab || null,
        tanggal_hasil,
      };
      await knex(TABLE_HASIL).insert(payload);
      inserted.push(payload);
    }

    await knex(TABLE_PERMINTAAN).where({ kode_permintaan }).update({ status: "selesai" });

    res.status(201).json({
      success: true,
      message: "Hasil pemeriksaan lab berhasil disimpan",
      data: inserted,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PUT /api/laboratorium/hasil/:id
async function updateHasil(req, res) {
  const { id } = req.params;
  const { hasil, nilai_rujukan, satuan } = req.body;

  try {
    const row = await knex(TABLE_HASIL).where({ id }).first();
    if (!row) {
      return res.status(404).json({ success: false, message: "Data hasil lab tidak ditemukan" });
    }

    const updates = {};
    if (hasil !== undefined) updates.hasil = String(hasil);
    if (nilai_rujukan !== undefined) updates.nilai_rujukan = nilai_rujukan;
    if (satuan !== undefined) updates.satuan = satuan;

    if (Object.keys(updates).length > 0) {
      await knex(TABLE_HASIL).where({ id }).update(updates);
    }

    res.json({ success: true, message: "Hasil lab berhasil diperbarui" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/laboratorium/hasil/:id
async function deleteHasil(req, res) {
  const { id } = req.params;
  try {
    const row = await knex(TABLE_HASIL).where({ id }).first();
    if (!row) {
      return res.status(404).json({ success: false, message: "Data hasil lab tidak ditemukan" });
    }
    await knex(TABLE_HASIL).where({ id }).del();
    res.json({ success: true, message: "Hasil lab berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export {
  getAllPermintaan,
  getPermintaanByKode,
  prosesPermintaan,
  simpanHasil,
  updateHasil,
  deleteHasil,
};