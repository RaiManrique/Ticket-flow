const express = require("express");
const { Publicacion, Comentario, Usuario } = require("../models");
const { requireAuth, requireStaff } = require("../middleware/auth");
const { requireObjectId } = require("../utils/validate");
const { deleteFileFromSpaces } = require("../middleware/upload");

const router = express.Router();

async function enrichPublicaciones(publicaciones) {
  const usuarioIds = [...new Set(publicaciones.map((p) => String(p.usuario_id)))];
  const usuarios = await Usuario.find({ _id: { $in: usuarioIds } })
    .select("_id username nombre_completo foto_perfil_url")
    .lean();

  const usuariosMap = Object.fromEntries(usuarios.map((u) => [String(u._id), u]));

  return publicaciones.map((pub) => ({
    ...pub,
    autor: usuariosMap[String(pub.usuario_id)] || null,
    total_likes: pub.usuarios_likes?.length || 0,
  }));
}

router.get("/publicaciones", async (_req, res) => {
  try {
    const publicaciones = await Publicacion.find()
      .sort({ fecha_publicacion: -1 })
      .limit(50)
      .lean();

    res.json(await enrichPublicaciones(publicaciones));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/publicaciones", requireAuth, async (req, res) => {
  const texto = String(req.body.texto || "").trim();
  const evento_id = req.body.evento_id || null;

  if (texto.length < 5) {
    return res.status(400).json({ error: "La publicacion debe tener al menos 5 caracteres" });
  }
  if (texto.length > 500) {
    return res.status(400).json({ error: "La publicacion no puede superar 500 caracteres" });
  }

  if (evento_id) {
    try {
      requireObjectId(evento_id, "evento_id");
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  }

  try {
    const media_urls = Array.isArray(req.body.media_urls) ? req.body.media_urls : [];
    const publicacion = await Publicacion.create({
      usuario_id: req.user._id,
      evento_id: evento_id || undefined,
      texto,
      media_urls,
      fecha_publicacion: new Date(),
      usuarios_likes: [],
    });

    const feed = await enrichPublicaciones([publicacion.toObject()]);
    res.status(201).json(feed[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/publicaciones/:id", requireAuth, async (req, res) => {
  try {
    requireObjectId(req.params.id, "publicacion_id");
    const { texto, media_urls } = req.body;
    const pub = await Publicacion.findById(req.params.id);
    if (!pub) return res.status(404).json({ error: "Publicacion no encontrada" });

    if (pub.usuario_id.toString() !== req.user._id.toString() && req.user.rol !== "admin") {
      return res.status(403).json({ error: "No tienes permiso para modificar esta publicacion" });
    }

    if (texto) {
      if (texto.trim().length < 5) {
        return res.status(400).json({ error: "La publicacion debe tener al menos 5 caracteres" });
      }
      pub.texto = texto.trim();
    }

    if (Array.isArray(media_urls)) {
      pub.media_urls = media_urls;
    }

    await pub.save();

    const feed = await enrichPublicaciones([pub.toObject()]);
    res.json(feed[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/publicaciones/:id", requireAuth, async (req, res) => {
  try {
    requireObjectId(req.params.id, "publicacion_id");
    const pub = await Publicacion.findById(req.params.id);
    if (!pub) return res.status(404).json({ error: "Publicacion no encontrada" });

    if (pub.usuario_id.toString() !== req.user._id.toString() && req.user.rol !== "admin") {
      return res.status(403).json({ error: "No tienes permiso para eliminar esta publicacion" });
    }

    await Publicacion.findByIdAndDelete(req.params.id);

    if (Array.isArray(pub.media_urls) && pub.media_urls.length > 0) {
      for (const url of pub.media_urls) {
        await deleteFileFromSpaces(url);
      }
    }

    res.json({ mensaje: "Publicacion eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/publicaciones/:id/like", requireAuth, async (req, res) => {
  try {
    requireObjectId(req.params.id, "publicacion_id");
    const userId = String(req.user._id);
    const pub = await Publicacion.findById(req.params.id);

    if (!pub) return res.status(404).json({ error: "Publicacion no encontrada" });

    const likes = pub.usuarios_likes?.map(String) || [];
    const liked = likes.includes(userId);

    if (liked) {
      pub.usuarios_likes = likes.filter((id) => id !== userId);
    } else {
      pub.usuarios_likes = [...likes, userId];
    }

    await pub.save();
    const feed = await enrichPublicaciones([pub.toObject()]);
    res.json({ liked: !liked, publicacion: feed[0] });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.get("/publicaciones/:id/comentarios", async (req, res) => {
  try {
    requireObjectId(req.params.id, "publicacion_id");
    const comentarios = await Comentario.find({ publicacion_id: req.params.id })
      .sort({ fecha_comentario: 1 })
      .lean();

    const usuarioIds = [...new Set(comentarios.map((c) => String(c.usuario_id)))];
    const usuarios = await Usuario.find({ _id: { $in: usuarioIds } })
      .select("_id username nombre_completo foto_perfil_url")
      .lean();

    const usuariosMap = Object.fromEntries(usuarios.map((u) => [String(u._id), u]));

    res.json(
      comentarios.map((c) => ({
        ...c,
        autor: usuariosMap[String(c.usuario_id)] || null,
      }))
    );
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post("/publicaciones/:id/comentarios", requireAuth, async (req, res) => {
  const texto = String(req.body.texto || "").trim();
  const media_urls = Array.isArray(req.body.media_urls) ? req.body.media_urls : [];

  if (texto.length < 2 && media_urls.length === 0) {
    return res.status(400).json({ error: "El comentario debe tener texto o una imagen/video" });
  }

  try {
    requireObjectId(req.params.id, "publicacion_id");
    const pub = await Publicacion.findById(req.params.id).select("_id");
    if (!pub) return res.status(404).json({ error: "Publicacion no encontrada" });

    const comentario = await Comentario.create({
      publicacion_id: req.params.id,
      usuario_id: req.user._id,
      texto,
      media_urls,
      fecha_comentario: new Date(),
    });

    res.status(201).json({
      ...comentario.toObject(),
      autor: {
        username: req.user.username,
        nombre_completo: req.user.nombre_completo,
        foto_perfil_url: req.user.foto_perfil_url,
      },
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.put("/publicaciones/:id/comentarios/:comentarioId", requireAuth, async (req, res) => {
  try {
    requireObjectId(req.params.id, "publicacion_id");
    requireObjectId(req.params.comentarioId, "comentario_id");
    
    const { texto, media_urls } = req.body;
    const comentario = await Comentario.findById(req.params.comentarioId);
    
    if (!comentario) return res.status(404).json({ error: "Comentario no encontrado" });
    if (comentario.usuario_id.toString() !== req.user._id.toString() && req.user.rol !== "admin") {
      return res.status(403).json({ error: "No tienes permiso para modificar este comentario" });
    }

    if (texto !== undefined) comentario.texto = String(texto).trim();
    if (Array.isArray(media_urls)) comentario.media_urls = media_urls;

    if (comentario.texto.length < 2 && comentario.media_urls.length === 0) {
      return res.status(400).json({ error: "El comentario debe tener texto o una imagen/video" });
    }

    await comentario.save();

    res.json({
      ...comentario.toObject(),
      autor: {
        username: req.user.username,
        nombre_completo: req.user.nombre_completo,
        foto_perfil_url: req.user.foto_perfil_url,
      },
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.delete("/publicaciones/:id/comentarios/:comentarioId", requireAuth, async (req, res) => {
  try {
    requireObjectId(req.params.id, "publicacion_id");
    requireObjectId(req.params.comentarioId, "comentario_id");
    
    const comentario = await Comentario.findById(req.params.comentarioId);
    if (!comentario) return res.status(404).json({ error: "Comentario no encontrado" });

    const pub = await Publicacion.findById(req.params.id);
    const isPubOwner = pub && pub.usuario_id.toString() === req.user._id.toString();

    if (comentario.usuario_id.toString() !== req.user._id.toString() && !isPubOwner && req.user.rol !== "admin") {
      return res.status(403).json({ error: "No tienes permiso para eliminar este comentario" });
    }

    await Comentario.findByIdAndDelete(req.params.comentarioId);

    if (Array.isArray(comentario.media_urls) && comentario.media_urls.length > 0) {
      for (const url of comentario.media_urls) {
        await deleteFileFromSpaces(url);
      }
    }

    res.json({ mensaje: "Comentario eliminado correctamente" });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.get("/usuarios", requireAuth, requireStaff, async (_req, res) => {
  try {
    const usuarios = await Usuario.find()
      .select("username nombre_completo rol email foto_perfil_url fecha_registro")
      .sort({ rol: 1, username: 1 })
      .lean();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
