// ──────────────────────────────────────────────────────────────
//  server/mongoose.js  — MongoDB 연결 & 유저 스키마
// ──────────────────────────────────────────────────────────────
const mongoose = require('mongoose');

// ── 연결 ──────────────────────────────────────────────────────
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
const PortfolioSchema = new mongoose.Schema({
  name:        String,
  siteTitle:   String,
  badge:       String,
  desc:        String,
  tags:        [String],
  photoSrc:    String,
  aboutText:   String,
  school:      String,
  grade:       String,
  interest:    String,
  goal:        String,
  contactDesc: String,
  email:       String,
  github:      String,
  instagram:   String,
  works:       { type: mongoose.Schema.Types.Mixed, default: [] },
  docs:        { type: mongoose.Schema.Types.Mixed, default: [] },
  design:      { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const UserSchema = new mongoose.Schema({
  id:        { type: String, required: true, unique: true },
  username:  { type: String, required: true },
  avatar:    String,
  github:    String,
  portfolio: { type: PortfolioSchema, default: {} },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

module.exports = { connectDB, User };
