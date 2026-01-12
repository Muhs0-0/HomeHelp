import dotenv from 'dotenv';
// Load environment variables as early as possible
dotenv.config();

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cloudinary from 'cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Cloudinary for production
if (process.env.DEV_MODE !== 'true') {
  cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Create uploads directory if it doesn't exist (for dev mode only)
const uploadsDir = path.join(__dirname, '../uploads/workers');
if (process.env.DEV_MODE === 'true' && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage - use local disk in dev, memory in prod (for Cloudinary)
let storage;
if (process.env.DEV_MODE === 'true') {
  // Local file storage for development
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${req.user.userId}_${Date.now()}`;
      cb(null, `worker_${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  });
} else {
  // Memory storage for production (file will be uploaded to Cloudinary)
  storage = multer.memoryStorage();
}

// File filter - only accept images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
  }
};

// Create multer upload instance
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Middleware to get image URL based on environment
export const getImageUrl = (filename, req) => {
  if (process.env.DEV_MODE === 'true') {
    // Local development
    return `http://localhost:${process.env.PORT || 5000}/uploads/workers/${filename}`;
  } else {
    // Cloudinary URL (already set by uploadToCloudinary)
    return filename;
  }
};

// Middleware to upload to Cloudinary (only in production)
export const uploadToCloudinary = async (req, res, next) => {
  if (process.env.DEV_MODE !== 'true' && req.file) {
    try {
      const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.v2.uploader.upload_stream(
          {
            folder: 'homehelp/workers',
            public_id: `worker_${req.user.userId}_${Date.now()}`,
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        uploadStream.end(req.file.buffer);
      });

      const result = await uploadPromise;
      // Store Cloudinary URL in req.file for downstream middleware
      req.file.cloudinaryUrl = result.secure_url;
    } catch (error) {
      return next(error);
    }
  }
  next();
};

export default upload;
