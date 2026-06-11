const express = require("express");
const { Publicacion, Comentario, Usuario } = require("../models");

const router = express.Router();

router.get("/publicaciones", async (_req, res) => {
  try {
    const publicaciones = await Publicacion.find()
      .sort({ fecha_publicacion: -1 })
      .limit(50)
      .lean();

    const usuarioIds = [...new Set(publicaciones.map((p) => String(p.usuario_id)))];
    const usuarios = await Usuario.find({ _id: { $in: usuarioIds } })
      .select("username nombre_completo foto_perfil_url")
      .lean();

    const usuariosMap = Object.fromEntries(usuarios.map((u) => [String(u._id), u]));

    const feed = publicaciones.map((pub) => ({
      ...pub,
      autor: usuariosMap[String(pub.usuario_id)] || null,
      total_likes: pub.usuarios_likes?.length || 0,
    }));

    res.json(feed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/publicaciones/:id/comentarios", async (req, res) => {
  try {
    const comentarios = await Comentario.find({ publicacion_id: req.params.id })
      .sort({ fecha_comentario: 1 })
      .lean();

    const usuarioIds = [...new Set(comentarios.map((c) => String(c.usuario_id)))];
    const usuarios = await Usuario.find({ _id: { $in: usuarioIds } })
      .select("username nombre_completo")
      .lean();

    const usuariosMap = Object.fromEntries(usuarios.map((u) => [String(u._id), u]));

    res.json(
      comentarios.map((c) => ({
        ...c,
        autor: usuariosMap[String(c.usuario_id)] || null,
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/usuarios", async (_req, res) => {
  try {
    const usuarios = await Usuario.find()
      .select("username nombre_completo rol email foto_perfil_url")
      .sort({ rol: 1, username: 1 })
      .lean();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
