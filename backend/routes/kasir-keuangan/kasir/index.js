import express from "express";
import * as controller from "./controller.js";

const router = express.Router();

router.get("/tagihan", controller.getTagihan);
router.get("/tagihan/:kode_tagihan", controller.getTagihanDetail);
router.post("/tagihan", controller.createTagihan);
router.post("/tagihan/:kode_tagihan/bayar", controller.bayarTagihan);
router.get("/ringkasan", controller.getRingkasanKasir);

export default router;
