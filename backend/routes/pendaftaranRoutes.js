import express from "express";
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

export default router;
