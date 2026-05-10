// ──────────────────────────────────────────────────────────────
//  server/index.js  — 메인 서버 (MongoDB 연동)
// ──────────────────────────────────────────────────────────────
require('dotenv').config();
const express  = require('express');
const session  = require('express-session');
const passport = require('passport');
const path     = require('path');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// 폴더 자동 생성
['data', 'public/uploads'].forEach(d => {
  const full = path.join(__dirname, '..', d);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

// 미들웨어
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
  resave: false, saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
}));
app.use(passport.initialize());
app.use(passport.session());

// MongoDB 연결 후 서버 시작
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
    console.log('\n🚀 서버 실행: http://localhost:' + PORT + '\n');
  });
}

startServer().catch(console.error);
