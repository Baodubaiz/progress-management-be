import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { AppError } from '../utils/app-error';

// Base directory for uploaded files
const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

/**
 * Creates a Multer upload instance for a specific sub-folder
 * @param subFolder Sub-folder inside /uploads (e.g. 'avatars', 'attachments')
 * @param maxSizeInMB Max file size in Megabytes (default 5MB)
 */
export const createUploader = (subFolder: string = 'general', maxSizeInMB: number = 5) => {
  const destinationDir = path.join(UPLOADS_ROOT, subFolder);

  // Ensure directory exists
  if (!fs.existsSync(destinationDir)) {
    fs.mkdirSync(destinationDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destinationDir);
    },
    filename: (req, file, cb) => {
      // Sanitize extension and generate unique filename
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
  });

  const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          'Invalid file type. Only JPG, JPEG, PNG, WEBP, and GIF images are allowed.',
          400
        )
      );
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxSizeInMB * 1024 * 1024, // in bytes
    },
  });
};

/**
 * Pre-configured upload middleware for User Avatars
 */
export const uploadAvatar = createUploader('avatars', 5);

/**
 * Helper to delete a local file safely (e.g., when updating or deleting user)
 */
export const removeLocalFile = (relativeFilePath?: string | null): void => {
  if (!relativeFilePath) return;

  // Only delete files that are inside the /uploads directory
  if (relativeFilePath.startsWith('/uploads/') || relativeFilePath.startsWith('uploads/')) {
    const cleanPath = relativeFilePath.replace(/^\/?uploads\//, '');
    const absolutePath = path.join(UPLOADS_ROOT, cleanPath);

    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch (err) {
        console.error('Failed to delete file:', absolutePath, err);
      }
    }
  }
};
