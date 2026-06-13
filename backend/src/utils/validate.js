const mongoose = require("mongoose");

function isValidObjectId(value) {
  if (!value) return false;
  try {
    const id = String(value);
    if (!/^[a-fA-F0-9]{24}$/.test(id)) return false;
    return String(new mongoose.Types.ObjectId(id)) === id;
  } catch {
    return false;
  }
}

function requireObjectId(value, fieldName = "id") {
  if (!isValidObjectId(value)) {
    const error = new Error(`${fieldName} invalido`);
    error.status = 400;
    throw error;
  }
  return value;
}

module.exports = { isValidObjectId, requireObjectId };
