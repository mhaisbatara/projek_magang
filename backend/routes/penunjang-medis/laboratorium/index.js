import express from "express";
import * as controller from "./controller.js";

const router = express.Router();

router.get("/permintaan", controller.getAllPermintaan);
router.get("/permintaan/:kode_permintaan", controller.getPermintaanByKode);
router.patch("/permintaan/:kode_permintaan/proses", controller.prosesPermintaan);
router.post("/permintaan/:kode_permintaan/hasil", controller.simpanHasil);

router.put("/hasil/:id", controller.updateHasil);
router.delete("/hasil/:id", controller.deleteHasil);

export default router;