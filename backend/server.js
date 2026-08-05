import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import barangRoutes from "./routes/barang.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/barang", barangRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Backend magang (MySQL) berjalan" });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});