/**
 * Script untuk generate hash password sesuai pola backend (mst_user)
 * Jalankan: node generate_password.js
 *
 * Letakkan file ini di root folder backend, jalankan lewat terminal.
 * Setelah dapat hash-nya, hapus file ini (mengandung logic sensitif).
 */

import "dotenv/config";
import crypto from "crypto";

const hmac = (text, secret, alg = "sha256") => {
  return crypto.createHmac(alg, secret).update(text).digest("hex");
};

// ==== UBAH BAGIAN INI ====
const USER_ID = "1";              // id user di tabel mst_user
const PASSWORD_ASLI = "admin123"; // password yang mau di-generate hash-nya
// ==========================

const secret = process.env.USER_SECRET;
const cPassword = process.env.USER_KEY + USER_ID + PASSWORD_ASLI;
const hashedPassword = hmac(cPassword, secret, "sha512");

console.log("=========================================");
console.log("User ID       :", USER_ID);
console.log("Password Asli :", PASSWORD_ASLI);
console.log("Hash Password :", hashedPassword);
console.log("=========================================");
console.log("\nGunakan hash di atas untuk kolom 'password' di tabel mst_user.");