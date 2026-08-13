/**
 * @project Sistem Klinik
 * @file validate_header.js
 * @description Middleware validasi header (X-Timestamp), autentikasi JWT, dan context user
 */

import "dotenv/config";
import { jwtVerify } from "jose";
import { formatDateSystem } from "../routes/components/tools/date_tools.js";

const dateNow = () => formatDateSystem();

/**
 * Validasi header X-Timestamp agar tidak jauh berbeda dari waktu server
 * (mencegah replay request yang sudah lama).
 */
export const validateTimestamp = (req, res, next) => {
  const header = req.headers["x-timestamp"];

  if (!header) {
    return res.status(400).json({
      status: "BAD_REQUEST",
      message: "Header X-Timestamp wajib dikirim",
      datetime: dateNow(),
    });
  }

  const clientTime = Number(header);
  if (Number.isNaN(clientTime)) {
    return res.status(400).json({
      status: "BAD_REQUEST",
      message: "Header X-Timestamp tidak valid",
      datetime: dateNow(),
    });
  }

  const serverTime = Math.floor(Date.now() / 1000);
  const tolerance = Number(process.env.TIMESTAMP_TOLERANCE || 300);

  if (Math.abs(serverTime - clientTime) > tolerance) {
    return res.status(400).json({
      status: "BAD_REQUEST",
      message: "Header X-Timestamp di luar batas toleransi waktu server",
      datetime: dateNow(),
    });
  }

  return next();
};

/**
 * Validasi access token (JWT) dari header Authorization: Bearer <token>.
 */
export const validateAccessToken = async (req, res, next) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      status: "UNAUTHORIZED",
      message: "Token tidak ditemukan",
      datetime: dateNow(),
    });
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET || "jwt_access_secret")
    );
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({
      status: "UNAUTHORIZED",
      message: "Token tidak valid atau sudah kedaluwarsa",
      datetime: dateNow(),
    });
  }
};

/**
 * Isi req.context dengan data user dari token (dipakai setelah validateAccessToken).
 */
export const contextMiddleware = (req, res, next) => {
  req.context = req.user || {};
  return next();
};
