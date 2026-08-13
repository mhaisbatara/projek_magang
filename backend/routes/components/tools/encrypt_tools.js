/**
 * @project Sistem Klinik
 * @file encrypt_tools.js
 * @description Helper enkripsi/hashing (HMAC) yang dipakai di seluruh backend
 */

import crypto from "crypto";

export const hmac = (text, secret, algorithm = "sha256") => {
  return crypto
    .createHmac(algorithm, String(secret))
    .update(String(text))
    .digest("hex");
};

export const hashEquals = (hashA, hashB) => {
  const bufA = Buffer.from(String(hashA));
  const bufB = Buffer.from(String(hashB));

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
};
