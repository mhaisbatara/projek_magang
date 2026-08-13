/**
 * @project Sistem Klinik
 * @file knex.js
 * @description Konfigurasi koneksi database MySQL menggunakan Knex + mysql2
 */

import "dotenv/config";
import knex from "knex";

const DB = knex({
  client: "mysql2",
  connection: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "sistem_klinik",
  },
  pool: { min: 0, max: 10 },
});

export default DB;
