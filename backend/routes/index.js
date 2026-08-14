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
import AntrianPoli from "./antrian-poli/index.js";
import Dashboard from "./dashboard/index.js";
import Farmasi from "./penunjang-medis/farmasi/index.js";
import Laboratorium from "./penunjang-medis/laboratorium/index.js";
import PelayananMedis from "./pelayanan-medis/index.js";
import Kasir from "./kasir-keuangan/kasir/index.js";
import Keuangan from "./kasir-keuangan/keuangan/index.js";

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
router.use("/antrian-poli", AntrianPoli);
router.use("/dashboard", Dashboard);
router.use("/farmasi", Farmasi);
router.use("/laboratorium", Laboratorium);
router.use("/pelayanan-medis", PelayananMedis);
router.use("/kasir", Kasir);
router.use("/keuangan", Keuangan);

// Tambahkan modul lain di sini, contoh:
// import Pasien from "./pasien/index.js";
// router.use("/pasien", [validateAccessToken, contextMiddleware], Pasien);

export default router;