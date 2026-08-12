import express from "express";
import {
  savePemeriksaan,
  getRiwayatPemeriksaan
} from "../controllers/medisController.js";

const router = express.Router();

router.post("/periksa", savePemeriksaan);
router.get("/riwayat/:no_rm", getRiwayatPemeriksaan);

export default router;
