import express from "express";
import * as controller from "./controller.js";

const router = express.Router();

router.get("/stats", controller.getStats);
router.get("/tren-kunjungan", controller.getTrenKunjungan);
router.get("/pasien-per-poli", controller.getPasienPerPoli);

export default router;
