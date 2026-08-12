import express from "express";
import * as antrianAwalController from "../controllers/antrianAwalController.js";
import {
  getPoliList,
  createPendaftaran,
  getAntrianList,
  updateAntrianStatus
} from "../controllers/pendaftaranController.js";

const router = express.Router();

router.get("/poli", getPoliList);
router.post("/", createPendaftaran);
router.get("/antrian", getAntrianList);
router.put("/antrian/:id_antrian/status", updateAntrianStatus);
router.get("/antrian-awal", antrianAwalController.getAll);
router.put("/antrian-awal/:kode/status", antrianAwalController.updateStatus);
router.put("/antrian-awal/reset", antrianAwalController.resetAll);

export default router;
