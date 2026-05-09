// ──────────────────────────────────────────────────────────────
//  server/routes/api.js  — 포트폴리오 데이터 CRUD API
// ──────────────────────────────────────────────────────────────
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const { v4: uuid } = require('uuid');
const db      = require('../db');
const router  = express.Router();

// 로그인 필요 미들웨어
const auth = (req, res, next) =>
  req.isAuthenticated() ? next() : res.status(401).json({ error: '로그인이 필요합니다.' });

// multer (이미지/파일 업로드)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../public/uploads')),
  filename:    (req, file, cb) => cb(null, `${req.user.username}_${uuid()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif|webp|pdf|mp4|webm/i.test(path.extname(file.originalname));
    ok ? cb(null, true) : cb(new Error('지원하지 않는 파일 형식'));
  },
});

// ── 유저 목록 / 개인 데이터 (공개) ────────────────────────────
router.get('/users',             (req, res) => res.json(db.getAllUsers()));
router.get('/users/:username',   (req, res) => {
  const u = db.getUserByUsername(req.params.username);
  if (!u) return res.status(404).json({ error: '유저를 찾을 수 없습니다.' });
  res.json({ username: u.username, avatar: u.avatar, portfolio: u.portfolio });
});

// ── 포트폴리오 텍스트 + 디자인 업데이트 ─────────────────────
router.patch('/portfolio', auth, (req, res) => {
  const allowed = [
    'name','siteTitle','badge','desc','tags','accent',
    'aboutText','school','grade','interest','goal',
    'contactDesc','email','github','instagram',
    'design',   // ← 디자인 커스터마이저 설정 전체
  ];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  const u = db.updatePortfolio(req.user.id, updates);
  if (!u) return res.status(404).json({ error: '유저 없음' });
  res.json({ ok: true, portfolio: u.portfolio });
});

// ── 프로필 사진 ───────────────────────────────────────────────
router.post('/portfolio/photo', auth, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일 없음' });
  const url = `/uploads/${req.file.filename}`;
  db.updatePortfolio(req.user.id, { photoSrc: url });
  res.json({ ok: true, url });
});

// ── 작품 추가 ─────────────────────────────────────────────────
router.post('/works', auth, upload.single('file'), (req, res) => {
  const { title, desc, category, type, url: ytUrl, tags } = req.body;
  if (!title) return res.status(400).json({ error: '제목을 입력하세요.' });

  let src = '';
  if (type === 'youtube' && ytUrl) {
    const m = (ytUrl||'').match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{11})/);
    src = m ? `https://www.youtube.com/embed/${m[1]}` : ytUrl;
  } else if (req.file) {
    src = `/uploads/${req.file.filename}`;
  } else if (req.body.srcUrl) {
    src = req.body.srcUrl;
  }

  const work = {
    id: uuid(), title, desc: desc||'',
    category: category||'etc', type: type||'image', src,
    tags: tags ? tags.split(',').map(t=>t.trim()).filter(Boolean) : [],
    createdAt: new Date().toISOString(),
  };
  db.addWork(req.user.id, work);
  res.json({ ok: true, work });
});

// ── 작품 수정 (텍스트) ────────────────────────────────────────
router.patch('/works/:id', auth, (req, res) => {
  const { title, desc, category, tags } = req.body;
  const upd = {};
  if (title)              upd.title    = title;
  if (desc !== undefined) upd.desc     = desc;
  if (category)           upd.category = category;
  if (tags)               upd.tags     = tags.split(',').map(t=>t.trim()).filter(Boolean);
  const updated = db.updateWork(req.user.id, req.params.id, upd);
  if (!updated) return res.status(404).json({ error: '작품을 찾을 수 없습니다.' });
  res.json({ ok: true, work: updated });
});

// ── 작품 이미지 교체 ──────────────────────────────────────────
router.patch('/works/:id/image', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일 없음' });
  const src = `/uploads/${req.file.filename}`;
  const updated = db.updateWork(req.user.id, req.params.id, { src });
  if (!updated) return res.status(404).json({ error: '작품을 찾을 수 없습니다.' });
  res.json({ ok: true, src });
});

// ── 작품 삭제 ─────────────────────────────────────────────────
router.delete('/works/:id', auth, (req, res) => {
  const ok = db.deleteWork(req.user.id, req.params.id);
  if (!ok) return res.status(404).json({ error: '작품을 찾을 수 없습니다.' });
  res.json({ ok: true });
});

// ── 서류 추가 ─────────────────────────────────────────────────
router.post('/docs', auth, upload.single('file'), (req, res) => {
  const { name, type, link, desc } = req.body;
  if (!name) return res.status(400).json({ error: '이름을 입력하세요.' });
  const src = req.file ? `/uploads/${req.file.filename}` : (link||'');
  const doc = { id: uuid(), name, type: type||'pdf', src, desc: desc||'', createdAt: new Date().toISOString() };
  db.addDoc(req.user.id, doc);
  res.json({ ok: true, doc });
});

// ── 서류 삭제 ─────────────────────────────────────────────────
router.delete('/docs/:id', auth, (req, res) => {
  const ok = db.deleteDoc(req.user.id, req.params.id);
  if (!ok) return res.status(404).json({ error: '서류를 찾을 수 없습니다.' });
  res.json({ ok: true });
});

module.exports = router;
