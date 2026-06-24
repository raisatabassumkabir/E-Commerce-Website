const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const AppError = require('../utils/AppError');
const fs = require('fs');
const path = require('path');

// Check if Cloudinary is configured with real credentials
const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                              process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
                              process.env.CLOUDINARY_API_KEY !== 'your_api_key';

let productStorage;
let avatarStorage;

if (isCloudinaryConfigured) {
  // ── Cloudinary storage engine for product images ───────────────────────────────
  productStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'ecommerce/products',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [
        { width: 1200, height: 1500, crop: 'limit', quality: 'auto' },
        { fetch_format: 'auto' },
      ],
    },
  });

  // ── Cloudinary storage engine for avatar images ────────────────────────────────
  avatarStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'ecommerce/avatars',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 200, height: 200, crop: 'thumb', gravity: 'face' }],
    },
  });
} else {
  // Fallback: Local disk storage
  console.log('⚠️  Cloudinary keys are placeholders. Falling back to local disk storage.');
  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    },
  });

  productStorage = diskStorage;
  avatarStorage = diskStorage;
}

// ── File filter: images only ───────────────────────────────────────────────────
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files are allowed.', 400), false);
  }
};

const uploadProductImages = multer({
  storage: productStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 6 }, // 5MB per image, max 6 images
});

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});

module.exports = { uploadProductImages, uploadAvatar };

