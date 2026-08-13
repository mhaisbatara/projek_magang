/**
 * @project Sistem Klinik
 * @file refresh_token.js
 * @description File untuk get token ulang jika ada token yang anomali tapi sesi masih jalan
 *
 * CATATAN: Endpoint ini menggunakan redisPub (Redis) untuk menyimpan refresh token,
 * tapi Redis belum di-setup di project ini. Kalau tidak butuh fitur refresh token
 * lewat Redis, endpoint ini boleh diabaikan dulu (server tetap bisa jalan normal,
 * error hanya muncul kalau endpoint ini benar-benar dipanggil).
 */

import express from "express";
import Joi from "joi";
import { formatDateSystem } from "../components/tools/date_tools.js";
import { generateUserTokens, Logging, validatePayload } from "../components/tools/servertool.js";
import DB from "../../core/config/knex.js";
import { status } from "../components/tools/general.js";

const router = express.Router();

router.post("/", async (req, res) => {
    const oPayload = req.body

    try {

        const cValidation = await validatePayload(
            {
                user_code: Joi.string().required().label("User Code"),
                refresh_token: Joi.string().required().label("Refresh Token"),
                remember_me: Joi.string().valid('1', '0').required().label("Remember me")
            },
            { "any.required": "{#label} wajib diisi" },
            oPayload
        );

        if (cValidation) {
            const oResult = {
                status: status.BAD_REQUEST,
                message: cValidation || "Terdapat kesalahan pada data anda",
                datetime: formatDateSystem(),
            };

            return res.status(422).json(oResult);
        }

        // TODO: fitur ini butuh Redis (redisPub) yang belum di-setup.
        // Sementara nonaktifkan endpoint ini kalau belum pakai Redis.
        return res.status(501).json({
            status: status.GAGAL,
            message: "Fitur refresh token belum tersedia (Redis belum di-setup).",
            datetime: formatDateSystem()
        });

        /* Kode asli (aktifkan setelah Redis di-setup):

        const storedRefreshToken = await redisPub.get(`refresh_token:${oPayload.user_code}`);

        if (!storedRefreshToken || storedRefreshToken !== oPayload.refresh_token) {
            return res.status(401).json({
                status: status.GAGAL,
                message: "Sesi telah berakhir sepenuhnya. Harap login kembali dengan password.",
                datetime: formatDateSystem()
            });
        }

        const oUser = await DB("mst_user")
            .join("mst_role", "mst_user.kode_role", "mst_role.kode_role")
            .where("mst_user.id", oPayload.user_code)
            .select("mst_user.id", "mst_user.user_name", "mst_role.role")
            .first();

        if (!oUser) {
            await redisPub.del(`refresh_token:${oPayload.user_code}`);
            return res.status(403).json({
                status: status.GAGAL,
                message: "Akun Anda dinonaktifkan atau tidak ditemukan.",
                datetime: formatDateSystem()
            });
        }

        const oToken = await generateUserTokens(oUser, oPayload.remember_me == '1');

        return res.status(200).json({
            status: status.SUKSES,
            message: "Sesi berhasil diperpanjang",
            datetime: formatDateSystem(),
            data: {
                access_token: oToken.access_token,
                refresh_token: oToken.refresh_token
            }
        });
        */

    } catch (error) {
        const oResult = {
            status: status.BAD_REQUEST,
            message: "Sistem sedang maintenance harap tunggu sebentar",
            datetime: formatDateSystem(),
        };

        Logging(error, {
            file: "auth/refresh_token.js",
            func: "data",
            request: oPayload,
            response: oResult,
            user: oPayload?.username || "",
        });

        return res.status(500).json(oResult);
    }
});

export default router;