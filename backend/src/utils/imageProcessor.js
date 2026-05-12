// backend/utils/imageProcessor.js
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const processImage = async (originalPath, filename) => {
  try {
    const webpDir = path.join(__dirname, '../../public/uploads/dishes/webp');
    const webpFilename = filename.replace(path.extname(filename), '.webp');
    const webpPath = path.join(webpDir, webpFilename);

    // Convert to WebP with optimization
    await sharp(originalPath)
      .webp({ quality: 80 }) // Adjust quality as needed
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .toFile(webpPath);

    return {
      originalUrl: `/uploads/dishes/original/${filename}`,
      webpUrl: `/uploads/dishes/webp/${webpFilename}`
    };
  } catch (error) {
    console.error('Image processing error:', error);
    throw error;
  }
};