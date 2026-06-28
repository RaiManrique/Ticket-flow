const mongoose = require("mongoose");
const { Evento } = require("../models");

function userObjectId(user) {
  return new mongoose.Types.ObjectId(String(user._id));
}

function isPlatformAdmin(user) {
  return user?.rol === "admin";
}

function eventCreatorFilter(user) {
  if (isPlatformAdmin(user)) return {};
  return { creador_id: userObjectId(user) };
}

async function eventIdsForStaff(user) {
  if (isPlatformAdmin(user)) return null;
  const eventos = await Evento.find({ creador_id: userObjectId(user) }).select("_id").lean();
  return eventos.map((e) => e._id);
}

async function scopedEventIdsFilter(user) {
  const ids = await eventIdsForStaff(user);
  if (!ids) return {};
  if (!ids.length) return { evento_id: { $in: [] } };
  return { evento_id: { $in: ids } };
}

module.exports = {
  userObjectId,
  isPlatformAdmin,
  eventCreatorFilter,
  eventIdsForStaff,
  scopedEventIdsFilter,
};
