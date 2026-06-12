const { Usuario } = require("../models");

function parseToken(header) {
  if (!header || !header.startsWith("Bearer ")) return null;
  try {
    return JSON.parse(Buffer.from(header.slice(7), "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function createToken(user) {
  const payload = {
    id: String(user._id),
    rol: user.rol,
    username: user.username,
    exp: Date.now() + 24 * 60 * 60 * 1000,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

async function requireAuth(req, res, next) {
  const payload = parseToken(req.headers.authorization);
  if (!payload || !payload.id || payload.exp < Date.now()) {
    return res.status(401).json({ error: "Sesion invalida o expirada" });
  }

  const user = await Usuario.findById(payload.id).select("-password_hash").lean();
  if (!user) return res.status(401).json({ error: "Usuario no encontrado" });

  req.user = user;
  next();
}

function requireStaff(req, res, next) {
  if (!["admin", "organizador"].includes(req.user.rol)) {
    return res.status(403).json({ error: "Acceso solo para administradores u organizadores" });
  }
  next();
}

module.exports = { createToken, parseToken, requireAuth, requireStaff };
