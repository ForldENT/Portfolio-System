// ──────────────────────────────────────────────────────────────
//  server/routes/api.js  — 포트폴리오 CRUD + 관리자 삭제
// ──────────────────────────────────────────────────────────────
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const { v4: uuid } = require('uuid');
const db      = require('../db');
const router  = express.Router();

// ── 미들웨어 ──────────────────────────────────────────────────
const auth = (req, res, next) =>
  req.isAuthenticated() ? next() : res.status(401).json({ error: '로그인이 필요합니다.' });

// 관리자 확인
const isAdmin = (username) => {
  const admins = (process.env.ADMIN_USERS || '').split(',').map(a => a.trim().toLowerCase());
  return admins.includes((username || '').toLowerCase());
};

const adminAuth = (req, res, next) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: '로그인이 필요합니다.' });
  if (!isAdmin(req.user.username)) return res.status(403).json({ error: '관리자만 접근 가능합니다.' });
  next();
};

// multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../public/uploads')),
  filename:    (req, file, cb) => cb(null, req.user.username + '_' + uuid() + path.extname(file.originalname)),
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif|webp|pdf|mp4|webm/i.test(path.extname(file.originalname));
    ok ? cb(null, true) : cb(new Error('지원하지 않는 파일 형식'));
  },
});

// ── 유저 목록 ─────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try { res.json(await db.getAllUsers()); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ── 관리자 여부 확인 ──────────────────────────────────────────
router.get('/admin/check', (req, res) => {
  if (!req.isAuthenticated()) return res.json({ isAdmin: false });
  res.json({ isAdmin: isAdmin(req.user.username) });
});

// ── 관리자: 유저 삭제 ─────────────────────────────────────────
router.delete('/admin/users/:username', adminAuth, async (req, res) => {
  try {
    const ok = await db.deleteUser(req.params.username);
    if (!ok) return res.status(404).json({ error: '유저를 찾을 수 없습니다.' });
    console.log(`🗑️ 관리자(${req.user.username})가 ${req.params.username} 삭제`);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── 유저 개인 데이터 ──────────────────────────────────────────
router.get('/users/:username', async (req, res) => {
  try {
    const u = await db.getUserByUsername(req.params.username);
    if (!u) return res.status(404).json({ error: '유저를 찾을 수 없습니다.' });
    res.json({ username: u.username, avatar: u.avatar, portfolio: u.portfolio });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── 포트폴리오 업데이트 ───────────────────────────────────────
router.patch('/portfolio', auth, async (req, res) => {
  try {
    const allowed = ['name','siteTitle','badge','desc','tags','aboutText','school','grade',
                     'interest','goal','contactDesc','email','github','instagram','design'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const u = await db.updatePortfolio(req.user.id, updates);
    if (!u) return res.status(404).json({ error: '유저 없음' });
    res.json({ ok: true, portfolio: u.portfolio });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── 프로필 사진 ───────────────────────────────────────────────
router.post('/portfolio/photo', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '파일 없음' });
    const url = '/uploads/' + req.file.filename;
    await db.updatePortfolio(req.user.id, { photoSrc: url });
    res.json({ ok: true, url });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── 작품 추가 ─────────────────────────────────────────────────
router.post('/works', auth, upload.single('file'), async (req, res) => {
  try {
    const { title, desc, category, type, url: ytUrl, tags } = req.body;
    if (!title) return res.status(400).json({ error: '제목을 입력하세요.' });
    let src = '';
    if (type === 'youtube' && ytUrl) {
      const m = (ytUrl||'').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
      src = m ? 'https://www.youtube.com/embed/' + m[1] : ytUrl;
    } else if (req.file) {
      src = '/uploads/' + req.file.filename;
    } else if (req.body.srcUrl) {
      src = req.body.srcUrl;
    }
    const work = {
      id: uuid(), title, desc: desc||'',
      category: category||'etc', type: type||'image', src,
      tags: tags ? tags.split(',').map(t=>t.trim()).filter(Boolean) : [],
      createdAt: new Date().toISOString(),
    };
    await db.addWork(req.user.id, work);
    res.json({ ok: true, work });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── 작품 수정 ─────────────────────────────────────────────────
router.patch('/works/:id', auth, async (req, res) => {
  try {
    const { title, desc, category, tags } = req.body;
    const upd = {};
    if (title)              upd.title    = title;
    if (desc !== undefined) upd.desc     = desc;
    if (category)           upd.category = category;
    if (tags)               upd.tags     = tags.split(',').map(t=>t.trim()).filter(Boolean);
    const updated = await db.updateWork(req.user.id, req.params.id, upd);
    if (!updated) return res.status(404).json({ error: '작품을 찾을 수 없습니다.' });
    res.json({ ok: true, work: updated });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── 작품 이미지 교체 ──────────────────────────────────────────
router.patch('/works/:id/image', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '파일 없음' });
    const src = '/uploads/' + req.file.filename;
    const updated = await db.updateWork(req.user.id, req.params.id, { src });
    if (!updated) return res.status(404).json({ error: '작품을 찾을 수 없습니다.' });
    res.json({ ok: true, src });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── 작품 삭제 ─────────────────────────────────────────────────
router.delete('/works/:id', auth, async (req, res) => {
  try {
    await db.deleteWork(req.user.id, req.params.id);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── 서류 추가 ─────────────────────────────────────────────────
router.post('/docs', auth, upload.single('file'), async (req, res) => {
  try {
    const { name, type, link, desc } = req.body;
    if (!name) return res.status(400).json({ error: '이름을 입력하세요.' });
    const src = req.file ? '/uploads/' + req.file.filename : (link||'');
    const doc = { id: uuid(), name, type: type||'pdf', src, desc: desc||'', createdAt: new Date().toISOString() };
    await db.addDoc(req.user.id, doc);
    res.json({ ok: true, doc });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── 서류 삭제 ─────────────────────────────────────────────────
router.delete('/docs/:id', auth, async (req, res) => {
  try {
    await db.deleteDoc(req.user.id, req.params.id);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
