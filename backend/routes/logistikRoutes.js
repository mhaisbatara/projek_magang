import express from "express";
import {
  getLogistikSummary,
  getAllObat,
  createObat,
  updateObat,
  deleteObat,
  cariObat,
  getAllSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getAllPO,
  getPOById,
  createPO,
  updateStatusPO,
  terimaPO,
  getBukuKas,
} from "../controllers/logistikController.js";

const router = express.Router();

router.get("/summary", getLogistikSummary);

router.get("/obat", getAllObat);
router.post("/obat", createObat);
router.put("/obat/:id_obat", updateObat);
router.delete("/obat/:id_obat", deleteObat);
router.get("/obat/cari", cariObat);

router.get("/supplier", getAllSupplier);
router.post("/supplier", createSupplier);
router.put("/supplier/:id_supplier", updateSupplier);
router.delete("/supplier/:id_supplier", deleteSupplier);

router.get("/purchase-order", getAllPO);
router.get("/purchase-order/:id_po", getPOById);
router.post("/purchase-order", createPO);
router.put("/purchase-order/:id_po/status", updateStatusPO);
router.post("/purchase-order/:id_po/terima", terimaPO);

router.get("/buku-kas", getBukuKas);

export default router;
