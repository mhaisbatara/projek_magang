import express from "express";
import * as controller from "./controller.js";

const router = express.Router();

router.get("/buku-kas", controller.getBukuKas);
router.post("/buku-kas", controller.createBukuKas);
router.delete("/buku-kas/:id", controller.deleteBukuKas);
router.get("/ringkasan", controller.getRingkasanKeuangan);

export default router;
