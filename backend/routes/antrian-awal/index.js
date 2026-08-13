import express from "express";
import * as controller from "./controller.js";
// import validateHeader from "../../middleware/validate_header.js";
// router.use(validateHeader); // aktifkan kalau route lain juga pakai ini

const router = express.Router();

router.get("/", controller.getAll);
router.post("/", controller.createAntrian);
router.put("/:kode_antrian", controller.updateAntrian);
router.delete("/:kode_antrian", controller.deleteAntrian);
router.patch("/:kode_antrian/ambil", controller.ambilAntrian);
router.patch("/:kode_antrian/panggil", controller.panggilAntrian);
router.patch("/:kode_antrian/selesai", controller.selesaiAntrian);
router.patch("/reset", controller.resetAntrian);

export default router;