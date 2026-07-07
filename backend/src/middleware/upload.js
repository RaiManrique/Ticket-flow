const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');

const s3Config = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: 'sfo3', // Extraído del endpoint del usuario
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET
  }
});

const deleteFileFromSpaces = async (fileUrl) => {
  if (!fileUrl || !fileUrl.startsWith('http')) return;
  try {
    const urlObj = new URL(fileUrl);
    const key = urlObj.pathname.substring(1); // remove leading slash
    
    await s3Config.send(new DeleteObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: key
    }));
    console.log(`Archivo eliminado de Spaces: ${key}`);
  } catch (error) {
    console.error("Error al eliminar archivo de Spaces:", error);
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '/tmp');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Límite de 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Formato de archivo no soportado. Solo se permiten imágenes y videos.'), false);
    }
  }
});

module.exports = { upload, s3Config, deleteFileFromSpaces };
