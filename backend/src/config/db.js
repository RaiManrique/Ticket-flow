const mongoose = require("mongoose");

function buildUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;

  const useAppUser = process.env.MONGO_USE_APP_USER === "true";
  const user = useAppUser
    ? process.env.MONGO_APP_USER || process.env.MONGO_ROOT_USER
    : process.env.MONGO_ROOT_USER || process.env.MONGO_APP_USER;
  const password = useAppUser
    ? process.env.MONGO_APP_PASSWORD || process.env.MONGO_ROOT_PASSWORD
    : process.env.MONGO_ROOT_PASSWORD || process.env.MONGO_APP_PASSWORD;
  const host = process.env.MONGO_HOST || "mongo";
  const port = process.env.MONGO_INTERNAL_PORT || "27017";
  const database = process.env.MONGO_DATABASE || "ticketflow_social";

  return `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}?authSource=admin`;
}

async function connectDB() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(buildUri());
  console.log("MongoDB conectado (capa de datos)");
}

module.exports = { connectDB };
