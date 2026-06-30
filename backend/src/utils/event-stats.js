const { Publicacion } = require("../models");

async function aggregateEventoResumenes(eventoIds) {
  if (!eventoIds.length) return {};

  const pubStats = await Publicacion.aggregate([
    { $match: { evento_id: { $in: eventoIds } } },
    {
      $group: {
        _id: "$evento_id",
        publicaciones: { $sum: 1 },
        likes: { $sum: { $size: { $ifNull: ["$usuarios_likes", []] } } },
      },
    },
  ]);

  const resumen = {};
  eventoIds.forEach((id) => {
    resumen[String(id)] = { publicaciones: 0, likes: 0 };
  });

  pubStats.forEach((row) => {
    const key = String(row._id);
    if (!resumen[key]) return;
    resumen[key].publicaciones = row.publicaciones;
    resumen[key].likes = row.likes;
  });

  return resumen;
}

module.exports = { aggregateEventoResumenes };
