/**
 * @project Sistem Klinik
 * @file secure_header.js
 * @description Middleware untuk menambahkan header keamanan pada response
 */

export default function secureHeader(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  return next();
}
