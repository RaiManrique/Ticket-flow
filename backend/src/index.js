const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const { upgradeLegacyPasswords } = require("./services/bootstrap");
const eventosRouter = require("./routes/eventos");
const ventasRouter = require("./routes/ventas");
const socialRouter = require("./routes/social");
const authRouter = require("./routes/auth");
const adminRouter = require("./routes/admin");
const politicasRouter = require("./routes/politicas");
const demoRouter = require("./routes/demo");

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = (process.env.CORS_ORIGINS || "http://127.0.0.1:8090,http://localhost:8090,http://127.0.0.1:8080,http://localhost:8080")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
  })
);
app.use(express.json({ limit: "1mb" }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos de login. Intenta mas tarde." },
});

app.get("/api/health", async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  res.status(mongoOk ? 200 : 503).json({
    status: mongoOk ? "ok" : "degraded",
    servicio: "TicketFlow API",
    capa: "aplicacion",
    mongo: mongoOk ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados registros desde esta IP. Intenta mas tarde." },
});

app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/register", registerLimiter);
app.use("/api/auth/register-organizer", registerLimiter);
app.use("/api/auth", authRouter);
app.use("/api/eventos", eventosRouter);
app.use("/api/ventas", ventasRouter);
app.use("/api/social", socialRouter);
app.use("/api/politicas", politicasRouter);
app.use("/api/admin", adminRouter);
app.use("/api/demo", demoRouter);

app.use((err, req, res, next) => {
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "JSON invalido en la solicitud" });
  }
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err?.message || "Error interno del servidor" });
});

async function start() {
  await connectDB();
  await upgradeLegacyPasswords();
  app.listen(PORT, () => {
    console.log(`TicketFlow API escuchando en puerto ${PORT}`);
  });
}

start().catch((error) => {
  console.error("Error al iniciar la API:", error.message);
  process.exit(1);
});
