import express from "express";
import * as controller from "./controller.js";

const router = express.Router();

// Obat
router.get("/obat", controller.getAllObat);
router.get("/obat/:kode_obat", controller.getObatByKode);
router.post("/obat", controller.createObat);
router.put("/obat/:kode_obat", controller.updateObat);
router.delete("/obat/:kode_obat", controller.deleteObat);
router.patch("/obat/:kode_obat/stok", controller.adjustStokObat);

// Resep / Dispensing
router.get("/resep", controller.getAllResep);
router.get("/resep/:kode_resep", controller.getResepByKode);
router.patch("/resep/:kode_resep/proses", controller.prosesResep);
router.patch("/resep/:kode_resep/selesai", controller.selesaiResep);

// Supplier (read only)
router.get("/supplier", controller.getAllSupplier);

// Purchase Order
router.get("/po", controller.getAllPo);
router.get("/po/:kode_po", controller.getPoByKode);
router.post("/po", controller.createPo);
router.patch("/po/:kode_po/kirim", controller.kirimPo);
router.patch("/po/:kode_po/terima", controller.terimaPo);
router.patch("/po/:kode_po/batal", controller.batalPo);
router.delete("/po/:kode_po", controller.deletePo);

export default router;