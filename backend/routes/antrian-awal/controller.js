import knex from "../../core/config/knex.js";

const TABLE = "nomor_antrian_awal";

// GET /api/antrian-awal
async function getAll(req, res) {
  try {
    const data = await knex(TABLE).select("*").orderBy("no_antrian");
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/antrian-awal/:kode_antrian/ambil
async function ambilAntrian(req, res) {
  const { kode_antrian } = req.params;
  try {
    const antrian = await knex(TABLE).where({ kode_antrian }).first();
    if (!antrian) return res.status(404).json({ success: false, message: "Kode antrian tidak ditemukan" });
    if (antrian.status === "terpakai") {
      return res.status(400).json({ success: false, message: "Antrian sudah dipakai" });
    }
    await knex(TABLE).where({ kode_antrian }).update({
      status: "terpakai",
    });
    res.json({ success: true, message: `Antrian ${antrian.no_antrian} berhasil diambil` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/antrian-awal/:kode_antrian/panggil
async function panggilAntrian(req, res) {
  const { kode_antrian } = req.params;
  try {
    const antrian = await knex(TABLE).where({ kode_antrian }).first();
    if (!antrian) return res.status(404).json({ success: false, message: "Kode antrian tidak ditemukan" });

    await knex(TABLE).where({ kode_antrian }).update({
      status: "dipanggil",
    });

    res.json({ success: true, no_antrian: antrian.no_antrian });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/antrian-awal/reset
async function resetAntrian(req, res) {
  try {
    await knex(TABLE).update({
      status: "tersedia",
    });
    res.json({ success: true, message: "Semua antrian berhasil direset" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/antrian-awal
async function createAntrian(req, res) {
  const { no_antrian } = req.body;
  if (!no_antrian) {
    return res.status(400).json({ success: false, message: "Nomor antrian wajib diisi" });
  }
  if (String(no_antrian).length > 2) {
    return res.status(400).json({ success: false, message: "Nomor antrian maksimal 2 karakter" });
  }

  try {
    const exist = await knex(TABLE).where({ no_antrian }).first();
    if (exist) {
      return res.status(400).json({ success: false, message: `Nomor antrian ${no_antrian} sudah terdaftar` });
    }

    const lastRow = await knex(TABLE)
      .where("kode_antrian", "like", "NAA%")
      .orderBy("kode_antrian", "desc")
      .first();

    let nextNum = 1;
    if (lastRow) {
      const match = lastRow.kode_antrian.match(/^NAA(\d+)$/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const kode_antrian = `NAA${String(nextNum).padStart(3, "0")}`;

    await knex(TABLE).insert({
      kode_antrian,
      no_antrian,
      status: "tersedia",
    });

    res.status(201).json({
      success: true,
      message: "Antrian berhasil ditambahkan",
      data: { kode_antrian, no_antrian, status: "tersedia" },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PUT /api/antrian-awal/:kode_antrian
async function updateAntrian(req, res) {
  const { kode_antrian } = req.params;
  const { no_antrian, status } = req.body;

  try {
    const antrian = await knex(TABLE).where({ kode_antrian }).first();
    if (!antrian) {
      return res.status(404).json({ success: false, message: "Antrian tidak ditemukan" });
    }

    const updates = {};
    if (no_antrian !== undefined) {
      if (String(no_antrian).length > 2) {
        return res.status(400).json({ success: false, message: "Nomor antrian maksimal 2 karakter" });
      }
      if (no_antrian !== antrian.no_antrian) {
        const exist = await knex(TABLE).where({ no_antrian }).first();
        if (exist) {
          return res.status(400).json({ success: false, message: `Nomor antrian ${no_antrian} sudah terdaftar` });
        }
      }
      updates.no_antrian = no_antrian;
    }

    if (status !== undefined) {
      if (!["tersedia", "terpakai", "dipanggil", "selesai"].includes(status)) {
        return res.status(400).json({ success: false, message: "Status tidak valid" });
      }
      updates.status = status;
    }

    if (Object.keys(updates).length > 0) {
      await knex(TABLE).where({ kode_antrian }).update(updates);
    }

    res.json({ success: true, message: "Antrian berhasil diperbarui" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/antrian-awal/:kode_antrian
async function deleteAntrian(req, res) {
  const { kode_antrian } = req.params;

  try {
    const antrian = await knex(TABLE).where({ kode_antrian }).first();
    if (!antrian) {
      return res.status(404).json({ success: false, message: "Antrian tidak ditemukan" });
    }

    await knex(TABLE).where({ kode_antrian }).del();
    res.json({ success: true, message: "Antrian berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/antrian-awal/:kode_antrian/selesai
async function selesaiAntrian(req, res) {
  const { kode_antrian } = req.params;

  try {
    const antrian = await knex(TABLE).where({ kode_antrian }).first();
    if (!antrian) {
      return res.status(404).json({ success: false, message: "Antrian tidak ditemukan" });
    }

    await knex(TABLE).where({ kode_antrian }).update({
      status: "selesai",
    });
    res.json({ success: true, message: `Antrian ${antrian.no_antrian} ditandai selesai` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export {
  getAll,
  ambilAntrian,
  panggilAntrian,
  resetAntrian,
  createAntrian,
  updateAntrian,
  deleteAntrian,
  selesaiAntrian,
};