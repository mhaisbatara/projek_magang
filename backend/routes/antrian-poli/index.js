import express from "express";
import * as controller from "./controller.js";

const router = express.Router();

router.get("/", controller.getAll);
router.patch("/:id/panggil", controller.panggilAntrian);
router.patch("/:id/selesai", controller.selesaiAntrian);
router.patch("/reset", controller.resetAntrian);

export default router;
