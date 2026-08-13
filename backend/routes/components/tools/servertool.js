/**
 * @project Sistem Klinik
 * @file servertool.js
 * @description Helper server: validasi payload (Joi), generate JWT token, dan logging
 */

import "dotenv/config";
import { SignJWT } from "jose";
import Joi from "joi";

/**
 * Validasi payload menggunakan Joi.
 * Mengembalikan null jika valid, atau string pesan error jika tidak valid.
 */
export const validatePayload = async (schema, messages = {}, payload) => {
  const joiSchema = Joi.object(schema).messages(messages);
  const { error } = joiSchema.validate(payload, { abortEarly: false });

  if (error) {
    return error.details.map((detail) => detail.message).join("; ");
  }

  return null;
};

/**
 * Generate access_token & refresh_token (JWT HS256) untuk user.
 */
export const generateUserTokens = async (oUser, rememberMe = false) => {
  const accessSecret = new TextEncoder().encode(
    process.env.JWT_SECRET || "jwt_access_secret"
  );
  const refreshSecret = new TextEncoder().encode(
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "jwt_refresh_secret"
  );

  const accessPayload = {
    sub: oUser.id,
    user_name: oUser.user_name,
    email: oUser.email,
    role: oUser.role,
    kode_role: oUser.kode_role,
  };

  const access_token = await new SignJWT(accessPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(rememberMe ? "2d" : "8h")
    .sign(accessSecret);

  const refresh_token = await new SignJWT({
    sub: oUser.id,
    user_name: oUser.user_name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(rememberMe ? "30d" : "1d")
    .sign(refreshSecret);

  return { access_token, refresh_token };
};

/**
 * Logging sederhana ke console.
 * - error: objek Error (opsional)
 * - info: metadata request/response (opsional), password akan disensor.
 */
export const Logging = (error = null, info = {}) => {
  const timestamp = new Date().toISOString();

  const sanitize = (obj) => {
    if (!obj || typeof obj !== "object") return obj;
    const clone = { ...obj };
    if (clone.request && typeof clone.request === "object") {
      clone.request = { ...clone.request, password: "***" };
    }
    return clone;
  };

  if (error) {
    console.error(`[LOG:ERROR] ${timestamp}`, error.message || error);
  }

  if (info && Object.keys(info).length) {
    console.log(`[LOG] ${timestamp}`, JSON.stringify(sanitize(info)));
  }
};
