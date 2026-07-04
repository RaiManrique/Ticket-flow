const express = require('express');
const { upload, s3Config } = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');
const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const { PutObjectCommand } = require('@aws-sdk/client-s3');

const router = express.Router();

router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }

  const isImage = req.file.mimetype.startsWith('image/');
  const isVideo = req.file.mimetype.startsWith('video/');
  let processedFilePath = req.file.path;
  let finalMimeType = req.file.mimetype;
  let s3Key = 'uploads/' + path.basename(req.file.path);

  try {
    if (isImage) {
      processedFilePath = req.file.path + '.webp';
      await sharp(req.file.path)
        .resize({ width: 1280, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(processedFilePath);
      
      finalMimeType = 'image/webp';
      s3Key = s3Key + '.webp';
      await fs.unlink(req.file.path); // Eliminar original
    } else if (isVideo) {
      processedFilePath = req.file.path + '.mp4';
      await new Promise((resolve, reject) => {
        ffmpeg(req.file.path)
          .size('?x720')
          .videoBitrate('1000k')
          .output(processedFilePath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
      
      finalMimeType = 'video/mp4';
      s3Key = s3Key + '.mp4';
      await fs.unlink(req.file.path); // Eliminar original
    }

    const fileBuffer = await fs.readFile(processedFilePath);

    await s3Config.send(new PutObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: finalMimeType,
      ACL: 'public-read'
    }));

    await fs.unlink(processedFilePath); // Limpiar archivo procesado

    const location = `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT.replace('https://', '')}/${s3Key}`;

    res.status(200).json({
      mensaje: 'Archivo subido y optimizado correctamente',
      url: location,
      nombre: path.basename(s3Key),
      mimetype: finalMimeType
    });
  } catch (error) {
    console.error('Error al procesar archivo:', error);
    try {
      if (req.file.path) await fs.unlink(req.file.path).catch(() => {});
      if (processedFilePath !== req.file.path) await fs.unlink(processedFilePath).catch(() => {});
    } catch (cleanupErr) {}
    res.status(500).json({ error: 'Error interno al procesar el archivo' });
  }
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
