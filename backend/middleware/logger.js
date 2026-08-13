/**
 * @project Sistem Klinik
 * @file logger.js
 * @description Middleware log sederhana untuk setiap request HTTP
 */

export default function Logger(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
    );
  });

  return next();
}
