// ──────────────────────────────────────────────────────────────
//  server/index.js  — 메인 서버 (보안 강화 버전)
// ──────────────────────────────────────────────────────────────
require('dotenv').config();
const express  = require('express');
const session  = require('express-session');
const passport = require('passport');
const path     = require('path');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production' ||
               (process.env.APP_URL||'').startsWith('https://');

// Render, Heroku 등 프록시 서버 신뢰 설정 (HTTPS 쿠키 정상 작동에 필수)
app.set('trust proxy', 1);

// 폴더 자동 생성
['data', 'public/uploads'].forEach(d => {
  const full = path.join(__dirname, '..', d);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

// ── 보안 헤더 ────────────────────────────────────────────────
app.use((req, res, next) => {
  // XSS 방어
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // 클릭재킹 방어 (iframe 삽입 차단)
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // MIME 타입 스니핑 차단
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Referrer 정책
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // HTTPS 강제 (프로덕션)
  if (isProd) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // CSP 비활성화 (GitHub OAuth, Cloudinary 등 외부 서비스 호환성 문제로 제거)
  // 나머지 보안 헤더들이 XSS, 클릭재킹 등을 충분히 방어함
  next();
});

// ── 요청 크기 제한 ────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));           // JSON은 5MB로 제한
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// ── 세션 설정 (쿠키 보안 강화) ───────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_change_me_in_production',
  resave: false,
  saveUninitialized: false,
  name: 'portfolio.sid',   // 기본 'connect.sid' 대신 커스텀 이름
  cookie: {
    maxAge:   7 * 24 * 60 * 60 * 1000,  // 7일
    httpOnly: true,    // ★ JS에서 쿠키 접근 불가 → XSS 쿠키 탈취 차단
    secure:   false,   // Render 프록시 환경에서는 false (trust proxy로 대체)
    sameSite: 'lax',   // ★ 외부 사이트 쿠키 전송 제한 → CSRF 차단
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// ── Rate Limiting (무차별 공격 방어) ─────────────────────────
const requestCounts = new Map();
app.use('/api', (req, res, next) => {
  const ip  = req.ip || req.connection.remoteAddress || 'unknown';
  const key = `${ip}_${Math.floor(Date.now() / 60000)}`; // 1분 단위
  const cnt = (requestCounts.get(key) || 0) + 1;
  requestCounts.set(key, cnt);
  // 오래된 항목 정리 (메모리 누수 방지)
  if (requestCounts.size > 10000) {
    const oldKey = `${ip}_${Math.floor(Date.now() / 60000) - 2}`;
    requestCounts.delete(oldKey);
  }
  if (cnt > 200) { // 1분에 200회 초과 시 차단
    return res.status(429).json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' });
  }
  next();
});

// ── MongoDB 연결 후 서버 시작 ─────────────────────────────────
async function startServer() {
  const { connectDB, User } = require('./mongoose');
  const db = require('./db');

  const connected = await connectDB();
  db.initMongo(connected, User);

  if (connected) {
    console.log('💾 데이터 저장소: MongoDB Atlas');
  } else {
    console.log('💾 데이터 저장소: 로컬 JSON 파일 (data/users.json)');
  }

  require('./passport')(passport);

  app.use('/auth', require('./routes/auth'));
  app.use('/api',  require('./routes/api'));
  app.use('/',     require('./routes/pages'));

  app.listen(PORT, () => {
    console.log('\n🚀 서버 실행: http://localhost:' + PORT);
    console.log(`🔒 보안 모드: ${isProd ? '프로덕션 (HTTPS)' : '개발 (HTTP)'}\n`);
  });
}

startServer().catch(console.error);
