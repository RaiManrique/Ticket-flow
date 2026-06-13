const bcrypt = require("bcryptjs");

const LEGACY_PLACEHOLDER = "$2b$10$EjemploHashSoloDemoNoUsarEnProduccion";

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

function isLegacyHash(hash) {
  return !hash || hash === LEGACY_PLACEHOLDER || hash.length < 50;
}

async function verifyPassword(password, hash, demoPassword) {
  if (!password) return false;
  if (isLegacyHash(hash)) return password === demoPassword;
  return bcrypt.compare(password, hash);
}

module.exports = { hashPassword, verifyPassword, isLegacyHash, LEGACY_PLACEHOLDER };
