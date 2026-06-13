const { Usuario } = require("../models");
const { hashPassword, LEGACY_PLACEHOLDER } = require("../utils/passwords");

async function upgradeLegacyPasswords() {
  const demoPassword = process.env.DEMO_USER_PASSWORD || "TicketFlow2026";
  const newHash = await hashPassword(demoPassword);
  const result = await Usuario.updateMany(
    { password_hash: LEGACY_PLACEHOLDER },
    { $set: { password_hash: newHash } }
  );
  if (result.modifiedCount > 0) {
    console.log(`Seguridad: ${result.modifiedCount} usuarios actualizados con hash bcrypt`);
  }
}

module.exports = { upgradeLegacyPasswords };
