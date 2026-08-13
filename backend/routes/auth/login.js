/**
 * @project Sistem Klinik
 * @file login.js
 * @description Endpoint login menggunakan tabel mst_user & mst_role
 */

import "dotenv/config";

import express from "express";
import { status } from "../components/tools/general.js";
import { generateUserTokens, Logging, validatePayload } from "../components/tools/servertool.js";
import Joi from "joi";
import DB from "../../core/config/knex.js";
import { formatDateSystem } from "../components/tools/date_tools.js";
import { hashEquals, hmac } from "../components/tools/encrypt_tools.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  let oPayload = body;

  try {
    if (!oPayload || Object.keys(oPayload).length < 1) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "Invalid request body",
        datetime: formatDateSystem(),
      });
    }

    // Validasi input
    const cValidation = await validatePayload(
      {
        user_name: Joi.string().required().label("Username"),
        password: Joi.string().required().label("Password"),
        remember_me: Joi.string().valid("1", "0").required().label("Remember me"),
      },
      {
        "string.base": "{#label} harus berupa string",
        "string.empty": "{#label} tidak boleh kosong",
        "any.required": "{#label} wajib diisi",
      },
      oPayload
    );

    if (cValidation) {
      const oResult = {
        status: status.BAD_REQUEST,
        message: cValidation || "Terdapat kesalahan pada data anda",
        datetime: formatDateSystem(),
      };

      Logging(null, {
        file: "login.js",
        func: "login",
        request: oPayload,
        response: oResult,
        user: oPayload?.user_name || "",
      });

      return res.status(422).json(oResult);
    }

    // Ambil data user + join ke mst_role untuk dapatkan nama role
    const oUser = await DB("mst_user")
      .join("mst_role", "mst_user.kode_role", "mst_role.kode_role")
      .where("mst_user.user_name", oPayload.user_name)
      .select(
        "mst_user.id",
        "mst_user.user_name",
        "mst_user.email",
        "mst_user.password",
        "mst_user.kode_role",
        "mst_role.role"
      )
      .first();

    if (!oUser) {
      return res.status(400).json({
        status: status.GAGAL,
        message: "Username tidak ditemukan",
        datetime: formatDateSystem(),
      });
    }

    // Cocokkan password (HMAC-SHA512), pola sama seperti standar backend
    const secret = process.env.USER_SECRET;
    const cPassword = process.env.USER_KEY + oUser.id + oPayload.password;

    if (!hashEquals(hmac(cPassword, secret, "sha512"), oUser.password)) {
      return res.status(400).json({
        status: status.GAGAL,
        message: "Password salah",
        datetime: formatDateSystem(),
      });
    }

    const credential = {
      id: oUser.id,
      user_name: oUser.user_name,
      email: oUser.email,
      role: oUser.role,
      kode_role: oUser.kode_role,
    };

    // Generate JWT token (access + refresh)
    const oToken = await generateUserTokens(oUser, oPayload.remember_me == "1");

    // Catat ke audit_log
    await DB("audit_log").insert({
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      email_user: oUser.email,
      aksi: "LOGIN_SUCCESS",
      tabel_terkait: "mst_user",
      waktu: new Date(),
    });

    return res.status(200).json({
      status: status.SUKSES,
      message: "Login Berhasil",
      datetime: formatDateSystem(),
      data: {
        access_token: oToken.access_token,
        refresh_token: oToken.refresh_token,
        user_info: credential,
      },
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "auth/login.js",
      func: "login",
      request: oPayload,
      response: oResult,
      user: oPayload?.user_name || "",
    });

    return res.status(500).json(oResult);
  }
});

export default router;