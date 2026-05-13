// ──────────────────────────────────────────────────────────────
//  server/cloudinary.js  — Cloudinary 업로드 설정
// ──────────────────────────────────────────────────────────────
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path   = require('path');

// Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 이미지용 스토리지 (사진, 배너)
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:    'portfolio/images',
    public_id: `${req.user?.username || 'user'}_${Date.now()}`,
    allowed_formats: ['jpg','jpeg','png','gif','webp'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  }),
});

// 파일용 스토리지 (PDF, 서류, 알집, 영상 등)
const fileStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.','');
    const isRaw = ['pdf','zip','alz','rar','7z','tar','gz','ppt','pptx'].includes(ext);
    return {
      folder:      'portfolio/files',
      public_id:   `${req.user?.username || 'user'}_${Date.now()}`,
      resource_type: isRaw ? 'raw' : 'auto',
      // 원본 파일명 유지 (다운로드 시 사용)
      use_filename: true,
      unique_filename: true,
    };
  },
});

// multer 인스턴스
const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif|webp/i.test(path.extname(file.originalname));
    ok ? cb(null, true) : cb(new Error('이미지 파일만 업로드 가능합니다.'));
  },
});

const uploadFile = multer({
  storage: fileStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif|webp|pdf|mp4|webm|zip|alz|rar|7z|tar|gz|ppt|pptx/i.test(
      path.extname(file.originalname)
    );
    ok ? cb(null, true) : cb(new Error('지원하지 않는 파일 형식입니다.'));
  },
});

// Cloudinary 사용 가능 여부 확인
function isCloudinaryEnabled() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

module.exports = { cloudinary, uploadImage, uploadFile, isCloudinaryEnabled };
