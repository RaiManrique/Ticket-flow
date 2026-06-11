const express = require("express");
const cors = require("cors");
const { connectDB } = require("./config/db");
const eventosRouter = require("./routes/eventos");
const ventasRouter = require("./routes/ventas");
const socialRouter = require("./routes/social");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    servicio: "TicketFlow API",
    capa: "aplicacion",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/eventos", eventosRouter);
app.use("/api/ventas", ventasRouter);
app.use("/api/social", socialRouter);

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`TicketFlow API escuchando en puerto ${PORT}`);
  });
}

start().catch((error) => {
  console.error("Error al iniciar la API:", error.message);
  process.exit(1);
});
