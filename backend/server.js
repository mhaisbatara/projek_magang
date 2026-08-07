import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import pasienRoutes from "./routes/pasienRoutes.js";
import pendaftaranRoutes from "./routes/pendaftaranRoutes.js";
import logistikRoutes from "./routes/logistikRoutes.js";
import auth from "./middleware/auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", auth, dashboardRoutes);
app.use("/api/pasien", auth, pasienRoutes);
app.use("/api/pendaftaran", auth, pendaftaranRoutes);
app.use("/api/logistik", auth, logistikRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Backend magang (MySQL) berjalan" });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});