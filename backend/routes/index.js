/**
 * @project Sistem Klinik
 * @file index.js
 * @description File index untuk menggabungkan semua routing (tanpa versioning)
 */

import express from "express";
import RefreshToken from "./auth/refresh_token.js";
import Login from "./auth/login.js";
import AntrianAwal from "./antrian-awal/index.js"; 
import Pasien from "./pasien/index.js"; 

import {
  contextMiddleware,
  validateAccessToken,
} from "../middleware/validate_header.js";

const router = express.Router();

// Auth (tidak perlu token untuk login/refresh)
router.use("/auth/refresh-token", [], RefreshToken);
router.use("/auth/login", [], Login);
router.use("/antrian-awal", AntrianAwal);
router.use("/pasien", Pasien);

// Tambahkan modul lain di sini, contoh:
// import Pasien from "./pasien/index.js";
// router.use("/pasien", [validateAccessToken, contextMiddleware], Pasien);

export default router;