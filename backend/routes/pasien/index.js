import express from "express";
import * as controller from "./controller.js";

const router = express.Router();

router.get("/poli", controller.getPoli);
router.post("/poli", controller.createPoli);
router.put("/poli/:kode_poli", controller.updatePoli);
router.delete("/poli/:kode_poli", controller.deletePoli);
router.get("/search", controller.search);
router.post("/baru", controller.daftarBaru);
router.post("/lama", controller.daftarLama);

export default router;