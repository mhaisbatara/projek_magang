import { Router } from "express";
import {
  getBarang,
  getBarangById,
  createBarang,
  updateBarang,
  deleteBarang,
} from "../controllers/barangController.js";
import auth from "../middleware/auth.js";

const router = Router();

router.get("/", auth, getBarang);

router.get("/", getBarang);
router.get("/:id", getBarangById);
router.post("/", createBarang);
router.put("/:id", updateBarang);
router.delete("/:id", deleteBarang);

export default router;