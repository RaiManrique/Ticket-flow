const express = require('express');
const upload = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Usamos requireAuth para asegurar que solo usuarios registrados puedan subir archivos
router.post('/', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }

  res.status(200).json({
    mensaje: 'Archivo subido correctamente',
    url: req.file.location, // S3/DO Spaces devuelve la URL en 'location'
    nombre: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
});

// Manejo de errores específicos de multer en esta ruta
router.use((err, req, res, next) => {
  if (err.message === 'Formato de archivo no soportado. Solo se permiten imágenes y videos.') {
    return res.status(400).json({ error: err.message });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'El archivo excede el límite de 10MB' });
  }
  next(err);
});

module.exports = router;
