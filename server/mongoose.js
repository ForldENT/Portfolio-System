// ──────────────────────────────────────────────────────────────
//  server/mongoose.js  — MongoDB 연결 & 유저 스키마
// ──────────────────────────────────────────────────────────────
const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('⚠️  MONGODB_URI 없음 → JSON 파일 DB 사용');
    return false;
  }
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB 연결 성공!');
    return true;
  } catch (e) {
    console.error('❌ MongoDB 연결 실패:', e.message);
    return false;
  }
}

// ── 유저 스키마 ───────────────────────────────────────────────
// Mixed 타입으로 선언해서 어떤 필드든 자유롭게 저장 가능
const PortfolioSchema = new mongoose.Schema({
  name:        String,
  siteTitle:   String,
  badge:       String,
  desc:        String,
  tags:        [String],
  photoSrc:    String,
  bannerSrc:   String,   // ← 배너 사진
  aboutText:   String,
  school:      String,
  grade:       String,
  interest:    String,
  goal:        String,
  contactDesc: String,
  email:       String,
  phone:       String,   // ← 전화번호
  github:      String,
  youtube:     String,   // ← 유튜브
  instagram:   String,
  works:       { type: mongoose.Schema.Types.Mixed, default: [] },
  docs:        { type: mongoose.Schema.Types.Mixed, default: [] },
  projects:    { type: mongoose.Schema.Types.Mixed, default: [] }, // ← 프로젝트
  design:      { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  _id: false,
  strict: false,  // ← 스키마에 없는 필드도 저장 허용 (향후 추가 필드 대비)
});

const UserSchema = new mongoose.Schema({
  id:        { type: String, required: true, unique: true },
  username:  { type: String, required: true },
  avatar:    String,
  github:    String,
  portfolio: { type: PortfolioSchema, default: {} },
}, {
  timestamps: true,
  strict: false,
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

module.exports = { connectDB, User };
