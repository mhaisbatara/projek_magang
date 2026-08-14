import express from "express";
import * as controller from "./controller.js";

const router = express.Router();

// Kunjungan (antrian dokter per poli)
router.get("/kunjungan", controller.getKunjungan);
router.get("/kunjungan/:kode_kunjungan", controller.getKunjunganDetail);
router.patch("/antrian/:id/mulai", controller.mulaiKunjunganFromAntrian);

// Dokter (untuk dropdown pemeriksa)
router.get("/dokter", controller.getDokter);

// Pemeriksaan (SOAP + vital sign)
router.post("/pemeriksaan", controller.simpanPemeriksaan);

// Rekam Medis
router.get("/rekam-medis/search", controller.searchPasien);
router.get("/rekam-medis/:no_rm", controller.getRekamMedis);

export default router;
