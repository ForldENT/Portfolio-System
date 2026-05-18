// ──────────────────────────────────────────────────────────────
//  server/cloudinary.js  — streamifier 없이 Buffer 직접 업로드
// ──────────────────────────────────────────────────────────────
const cloudinary = require('cloudinary').v2;
const multer     = require('multer');
const path       = require('path');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── 메모리 스토리지
const memStorage = multer.memoryStorage();

const uploadImage = multer({
  storage: memStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    /jpeg|jpg|png|gif|webp/i.test(path.extname(file.originalname))
      ? cb(null, true) : cb(new Error('이미지 파일만 업로드 가능합니다.'));
  },
});

const uploadFile = multer({
  storage: memStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    /jpeg|jpg|png|gif|webp|pdf|mp4|webm|zip|alz|rar|7z|tar|gz|ppt|pptx/i.test(
      path.extname(file.originalname)
    ) ? cb(null, true) : cb(new Error('지원하지 않는 파일 형식입니다.'));
  },
});

// ── Buffer → Cloudinary 업로드 (streamifier 없이 직접 처리)
function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    }).end(buffer);  // ← streamifier 대신 .end(buffer) 사용
  });
}

module.exports = { uploadImage, uploadFile, uploadBufferToCloudinary };
