// ──────────────────────────────────────────────────────────────
//  server/routes/api.js  — Cloudinary 연동 버전
// ──────────────────────────────────────────────────────────────
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuid } = require('uuid');
const db       = require('../db');
const { sanitizePortfolioUpdate, sanitizeWork, sanitizeDoc, sanitizeProject, escapeHtml } = require('../sanitize');
const router  = express.Router();

// ── Cloudinary or 로컬 multer 자동 선택 ──────────────────────
let uploadImage, uploadFile;

if (process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY    &&
    process.env.CLOUDINARY_API_SECRET) {
  // Cloudinary 사용
  const cl = require('../cloudinary');
  uploadImage = cl.uploadImage;
  uploadFile  = cl.uploadFile;
  console.log('☁️  파일 업로드: Cloudinary');
} else {
  // 로컬 저장 (fallback)
  const uploadDir = path.join(__dirname, '../../public/uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename:    (req, file, cb) => cb(null, (req.user?.username||'user') + '_' + uuid() + path.extname(file.originalname)),
  });
  const local = multer({ storage, limits: { fileSize: 50*1024*1024 } });
  uploadImage = local;
  uploadFile  = local;
  console.log('📁 파일 업로드: 로컬 저장');
}

// ── 파일 URL 추출 헬퍼 ────────────────────────────────────────
// Cloudinary는 req.file.path, 로컬은 /uploads/파일명
function getFileUrl(req) {
  if (!req.file) return null;
  // Cloudinary 업로드 시 path에 https://... URL이 들어있음
  if (req.file.path && req.file.path.startsWith('http')) return req.file.path;
  // 로컬 업로드 시 filename만 있음
  return '/uploads/' + req.file.filename;
}

// ── 인증 미들웨어 ─────────────────────────────────────────────
const auth = (req, res, next) =>
  req.isAuthenticated() ? next() : res.status(401).json({ error: '로그인이 필요합니다.' });

const isAdmin = (username) => {
  const admins = (process.env.ADMIN_USERS||'').split(',').map(a=>a.trim().toLowerCase());
  return admins.includes((username||'').toLowerCase());
};
const adminAuth = (req, res, next) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: '로그인이 필요합니다.' });
  if (!isAdmin(req.user.username)) return res.status(403).json({ error: '관리자만 접근 가능합니다.' });
  next();
};

// ── 소유자 확인 미들웨어 ──────────────────────────────────────
// 작품/서류/프로젝트가 실제 로그인한 유저의 것인지 확인
async function verifyWorkOwner(req, res, next) {
  try {
    const u = await db.getUserById(req.user.id);
    if (!u) return res.status(404).json({ error: '유저를 찾을 수 없습니다.' });
    const work = (u.portfolio.works||[]).find(w => String(w.id) === String(req.params.id));
    if (!work) return res.status(403).json({ error: '권한이 없거나 존재하지 않는 작품입니다.' });
    req.targetUser = u;
    next();
  } catch(e) { res.status(500).json({ error: e.message }); }
}

async function verifyDocOwner(req, res, next) {
  try {
    const u = await db.getUserById(req.user.id);
    if (!u) return res.status(404).json({ error: '유저를 찾을 수 없습니다.' });
    const doc = (u.portfolio.docs||[]).find(d => String(d.id) === String(req.params.id));
    if (!doc) return res.status(403).json({ error: '권한이 없거나 존재하지 않는 서류입니다.' });
    req.targetUser = u;
    next();
  } catch(e) { res.status(500).json({ error: e.message }); }
}

async function verifyProjectOwner(req, res, next) {
  try {
    const u = await db.getUserById(req.user.id);
    if (!u) return res.status(404).json({ error: '유저를 찾을 수 없습니다.' });
    const proj = (u.portfolio.projects||[]).find(p => String(p.id) === String(req.params.id));
    if (!proj) return res.status(403).json({ error: '권한이 없거나 존재하지 않는 프로젝트입니다.' });
    req.targetUser = u;
    next();
  } catch(e) { res.status(500).json({ error: e.message }); }
}

// ── 파일 MIME 타입 검사 미들웨어 ─────────────────────────────
// 확장자만 바꾼 위장 파일 차단 (파일 시그니처로 실제 타입 확인)
function verifyFileMime(req, res, next) {
  if (!req.file) return next();
  const buf = req.file.buffer;
  // 파일 버퍼가 없는 경우 (Cloudinary 등) 건너뜀
  if (!buf) return next();
  // 위험한 파일 시그니처 차단 (HTML, PHP, JS 등 실행 파일)
  const str = buf.slice(0, 100).toString('utf8', 0, 100).toLowerCase();
  const dangerous = ['<html','<script','<?php','#!/','import ','require(','module.exports'];
  if (dangerous.some(sig => str.includes(sig))) {
    return res.status(400).json({ error: '허용되지 않는 파일 형식입니다.' });
  }
  next();
}



// ── 유저 목록 ─────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try { res.json(await db.getAllUsers()); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ── 관리자 확인 ──────────────────────────────────────────────
router.get('/admin/check', (req, res) => {
  if (!req.isAuthenticated()) return res.json({ isAdmin: false });
  res.json({ isAdmin: isAdmin(req.user.username) });
});

// ── 관리자: 유저 삭제 ─────────────────────────────────────────
router.delete('/admin/users/:username', adminAuth, async (req, res) => {
  try {
    // 자기 자신은 삭제 불가
    if (req.user.username.toLowerCase() === req.params.username.toLowerCase()) {
      return res.status(400).json({ error: '자기 자신의 계정은 삭제할 수 없습니다.' });
    }
    const ok = await db.deleteUser(req.params.username);
    if (!ok) return res.status(404).json({ error: '유저를 찾을 수 없습니다.' });
    console.log(`🗑️ 관리자(${req.user.username})가 ${req.params.username} 삭제`);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── 유저 개별 조회 ────────────────────────────────────────────
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
    // XSS 방어: 모든 입력값 정화
    const updates = sanitizePortfolioUpdate(req.body);
    const u = await db.updatePortfolio(req.user.id, updates);
    if (!u) return res.status(404).json({ error: '유저 없음' });
    res.json({ ok: true, portfolio: u.portfolio });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── 프로필 사진 업로드 ────────────────────────────────────────
router.post('/portfolio/photo', auth, uploadImage.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '파일 없음' });
    const url = getFileUrl(req);
    await db.updatePortfolio(req.user.id, { photoSrc: url });
    res.json({ ok: true, url });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── 배너 사진 업로드 ──────────────────────────────────────────
router.post('/portfolio/banner', auth, uploadImage.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '파일 없음' });
    const url = getFileUrl(req);
    await db.updatePortfolio(req.user.id, { bannerSrc: url });
    res.json({ ok: true, url });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── 작품 추가 ─────────────────────────────────────────────────
router.post('/works', auth, uploadFile.single('file'), async (req, res) => {
  try {
    const safe = sanitizeWork(req.body);
    if (!safe.title) return res.status(400).json({ error: '제목을 입력하세요.' });
    const { url: ytUrl } = req.body;
    let src = '';
    if (safe.type === 'youtube' && ytUrl) {
      const m = (ytUrl||'').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
      src = m ? 'https://www.youtube.com/embed/' + m[1] : '';
    } else if (req.file) {
      src = getFileUrl(req);
    } else if (req.body.srcUrl) {
      src = req.body.srcUrl;
    }
    const work = {
      id: uuid(),
      title:    safe.title,
      desc:     safe.desc,
      category: safe.category,
      type:     safe.type,
      src,
      tags:     safe.tags,
      createdAt: new Date().toISOString(),
    };
    await db.addWork(req.user.id, work);
    res.json({ ok: true, work });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── 작품 수정 ─────────────────────────────────────────────────
router.patch('/works/:id', auth, verifyWorkOwner, async (req, res) => {
  try {
    const safe = sanitizeWork(req.body);
    const upd = {};
    if (safe.title)             upd.title    = safe.title;
    if (req.body.desc !== undefined) upd.desc = safe.desc;
    if (safe.category)          upd.category = safe.category;
    if (req.body.tags)          upd.tags     = safe.tags;
    const updated = await db.updateWork(req.user.id, req.params.id, upd);
    if (!updated) return res.status(404).json({ error: '작품을 찾을 수 없습니다.' });
    res.json({ ok: true, work: updated });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── 작품 이미지 교체 ──────────────────────────────────────────
router.patch('/works/:id/image', auth, verifyWorkOwner, uploadFile.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '파일 없음' });
    const src = getFileUrl(req);
    const updated = await db.updateWork(req.user.id, req.params.id, { src });
    if (!updated) return res.status(404).json({ error: '작품을 찾을 수 없습니다.' });
    res.json({ ok: true, src });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── 작품 삭제 ─────────────────────────────────────────────────
router.delete('/works/:id', auth, verifyWorkOwner, async (req, res) => {
  try {
    await db.deleteWork(req.user.id, req.params.id);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── 서류 추가 ─────────────────────────────────────────────────
router.post('/docs', auth, uploadFile.single('file'), async (req, res) => {
  try {
    const safe = sanitizeDoc(req.body);
    if (!safe.name) return res.status(400).json({ error: '이름을 입력하세요.' });
    const src = req.file ? getFileUrl(req) : safe.link;
    const doc = {
      id: uuid(),
      name: safe.name,
      type: safe.type,
      src,
      desc: safe.desc,
      createdAt: new Date().toISOString(),
    };
    await db.addDoc(req.user.id, doc);
    res.json({ ok: true, doc });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── 서류 삭제 ─────────────────────────────────────────────────
router.delete('/docs/:id', auth, verifyDocOwner, async (req, res) => {
  try {
    await db.deleteDoc(req.user.id, req.params.id);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── 프로젝트 추가 ─────────────────────────────────────────────
router.post('/projects', auth, uploadFile.single('file'), async (req, res) => {
  try {
    const safe = sanitizeProject(req.body);
    if (!safe.name) return res.status(400).json({ error: '이름을 입력하세요.' });
    const src = req.file ? getFileUrl(req) : '';
    const project = {
      id: uuid(),
      name: safe.name,
      desc: safe.desc,
      src,
      link: safe.link,
      tags: safe.tags,
      createdAt: new Date().toISOString(),
    };
    const u = await db.getUserById(req.user.id);
    if (!u) return res.status(404).json({ error: '유저 없음' });
    const projects = u.portfolio.projects || [];
    projects.push(project);
    await db.updatePortfolio(req.user.id, { projects });
    res.json({ ok: true, project });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── 프로젝트 삭제 ─────────────────────────────────────────────
router.delete('/projects/:id', auth, verifyProjectOwner, async (req, res) => {
  try {
    const u = await db.getUserById(req.user.id);
    if (!u) return res.status(404).json({ error: '유저 없음' });
    const projects = (u.portfolio.projects||[]).filter(p => String(p.id) !== String(req.params.id));
    await db.updatePortfolio(req.user.id, { projects });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── 포트폴리오 HTML 다운로드 ──────────────────────────────────
router.get('/users/:username/download', async (req, res) => {
  try {
    const u = await db.getUserByUsername(req.params.username);
    if (!u) return res.status(404).json({ error: '유저를 찾을 수 없습니다.' });
    const P  = u.portfolio || {};
    const dz = P.design || {};

    const typeLabel = { image:'이미지', youtube:'유튜브', video:'영상', pdf:'PDF' };
    const typeIcon  = { image:'🖼️', youtube:'▶️', video:'🎬', pdf:'📄' };

    const worksHTML = (P.works||[]).map(w => {
      const ytMatch = (w.src||'').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
      const ytId = ytMatch ? ytMatch[1] : null;
      const thumb = ytId
        ? `<img src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg" alt="${w.title}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0"/>`
        : w.src ? `<img src="${w.src}" alt="${w.title}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0"/>` : `<span style="font-size:2.2rem">${typeIcon[w.type]||'📁'}</span>`;
      const viewerContent = ytId
        ? `<div style="position:relative;padding-top:56.25%"><iframe src="https://www.youtube.com/embed/${ytId}" style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:8px" allowfullscreen></iframe></div>`
        : w.src ? `<img src="${w.src}" style="width:100%;border-radius:8px;max-height:520px;object-fit:contain"/>` : '';
      return `
        <div class="work-card" onclick="showViewer('${w.id}')">
          <div class="work-thumb" data-cat="${w.category||'etc'}">${thumb}<span class="work-badge">${typeLabel[w.type]||w.type}</span></div>
          <div class="work-body">
            <h3 class="work-title">${w.title||''}</h3>
            <p class="work-desc">${w.desc||''}</p>
            <div class="work-tags">${(w.tags||[]).map(t=>`<span class="work-tag">${t}</span>`).join('')}</div>
          </div>
        </div>
        <div id="viewer-${w.id}" style="display:none">
          <div class="viewer-content">${viewerContent}</div>
          <p style="color:#90a4ae;margin-top:.8rem">${w.desc||''}</p>
          <div style="display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.6rem">${(w.tags||[]).map(t=>`<span class="work-tag">${t}</span>`).join('')}</div>
        </div>`;
    }).join('');

    const docsHTML = (P.docs||[]).map(d => {
      const ico = {pdf:'📄',ppt:'📊',img:'🖼️'}[d.type]||'📎';
      return `
        <div class="doc-item">
          <div class="doc-icon ${d.type}">${ico}</div>
          <div class="doc-info"><div class="doc-name">${d.name||''}</div><div class="doc-meta">${(d.type||'').toUpperCase()}${d.desc?' · '+d.desc:''}</div></div>
          ${d.src?`<a href="${d.src}" target="_blank" class="btn-view">보기</a>`:''}
        </div>`;
    }).join('');

    const projectsHTML = (P.projects||[]).map(p => {
      const dlBtn = p.src ? `<a href="${p.src}" download class="btn-view">⬇️ 다운로드</a>`
                   : p.link ? `<a href="${p.link}" target="_blank" class="btn-view">🔗 열기</a>` : '';
      return `
        <div class="doc-item">
          <div class="doc-icon" style="background:#e3f2fd">📦</div>
          <div class="doc-info"><div class="doc-name">${p.name||''}</div><div class="doc-meta">${p.desc||''}</div></div>
          ${dlBtn}
        </div>`;
    }).join('');

    const contactLinks = [
      P.email    && `<a href="mailto:${P.email}" class="contact-link">📧 ${P.email}</a>`,
      P.phone    && `<a href="tel:${P.phone}" class="contact-link">📞 ${P.phone}</a>`,
      P.github   && `<a href="${P.github}" target="_blank" class="contact-link">🐱 GitHub</a>`,
      P.youtube  && `<a href="${P.youtube}" target="_blank" class="contact-link">▶️ YouTube</a>`,
      P.instagram&& `<a href="${P.instagram}" target="_blank" class="contact-link">📸 Instagram</a>`,
    ].filter(Boolean).join('');

    const accent   = dz.accentColor || '#1e88e5';
    const nameParts= (P.name||u.username).split(' ');
    const nameHTML = nameParts.length > 1
      ? `${nameParts[0]} <span style="color:${accent}">${nameParts.slice(1).join(' ')}</span>`
      : `<span style="color:${accent}">${nameParts[0]}</span>`;
    const tagsHTML = (P.tags||[]).map(t=>`<span class="hero-tag">${t}</span>`).join('');

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${P.siteTitle||u.username+'의 포트폴리오'}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@700;800&family=Pretendard:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--accent:${accent}}
html{scroll-behavior:smooth}
body{font-family:'Pretendard',sans-serif;background:#f0f4f8;color:#1a2e45;line-height:1.7}
.nav{position:sticky;top:0;z-index:100;height:58px;background:rgba(13,27,42,.93);backdrop-filter:blur(14px);border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;padding:0 2rem}
.nav-logo{font-family:'Nanum Myeongjo',serif;font-size:1.1rem;font-weight:700;color:#fff;text-decoration:none}
.nav-links{display:flex;gap:1.4rem;list-style:none}
.nav-links a{color:rgba(255,255,255,.65);text-decoration:none;font-size:.88rem}
.hero{min-height:92vh;position:relative;display:flex;align-items:center;justify-content:center;background:${P.bannerSrc?`url('${P.bannerSrc}') center/cover`:'#0d1b2a'};overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;background:rgba(0,0,0,.45)}
.hero-inner{position:relative;text-align:center;max-width:740px;padding:2rem 1.5rem;z-index:1}
.hero-badge{display:inline-block;background:rgba(30,136,229,.12);border:1px solid rgba(30,136,229,.35);color:var(--accent);font-size:.72rem;font-weight:700;padding:.28rem .9rem;border-radius:20px;margin-bottom:1.5rem;letter-spacing:1px;text-transform:uppercase}
.hero-name{font-family:'Nanum Myeongjo',serif;font-size:clamp(3rem,8vw,5.5rem);font-weight:800;color:#fff;line-height:1.1;margin-bottom:1rem}
.hero-desc{font-size:1.05rem;color:rgba(255,255,255,.6);margin-bottom:2rem}
.hero-tags{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center}
.hero-tag{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);color:rgba(255,255,255,.8);padding:.28rem .75rem;border-radius:20px;font-size:.82rem}
section{padding:5rem 1.5rem}
.sec-white{background:#fff}.sec-gray{background:#f0f4f8}.sec-dark{background:#0d1b2a}
.sec-inner{max-width:960px;margin:0 auto}
.sec-label{font-size:.7rem;letter-spacing:2px;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:.4rem}
.sec-title{font-family:'Nanum Myeongjo',serif;font-size:clamp(1.8rem,4vw,2.8rem);font-weight:700;color:#1a2e45;margin-bottom:1.8rem}
.sec-dark .sec-title{color:#fff}
.about-grid{display:grid;grid-template-columns:1fr 2fr;gap:3.5rem;align-items:start}
.about-photo{width:100%;border-radius:12px;object-fit:cover}
.photo-placeholder{width:100%;aspect-ratio:3/4;background:linear-gradient(145deg,#e8e4de,#d4cec6);border-radius:12px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:.9rem}
.about-text{font-size:1rem;line-height:1.9;margin-bottom:1.2rem}
.about-facts{display:grid;grid-template-columns:1fr 1fr;gap:.7rem;margin-bottom:1rem}
.fact{background:#f0f4f8;border-radius:8px;padding:.7rem .9rem}
.fact-lbl{display:block;font-size:.72rem;color:#90a4ae;margin-bottom:.15rem;font-weight:600}
.fact-val{font-size:.92rem;font-weight:600}
.filter-row{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1.5rem}
.filter-btn{background:#fff;border:1px solid #e5e7eb;color:#90a4ae;padding:.32rem .85rem;border-radius:20px;font-size:.82rem;cursor:pointer;font-family:inherit;transition:all .18s}
.filter-btn.active{background:#1a2e45;color:#fff;border-color:#1a2e45}
.work-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.4rem}
.work-card{background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;cursor:pointer;transition:transform .2s,box-shadow .2s}
.work-card:hover{transform:translateY(-4px);box-shadow:0 8px 28px rgba(0,0,0,.12)}
.work-thumb{width:100%;aspect-ratio:16/10;background:linear-gradient(135deg,#e8f0fe,#d4e6f1);display:flex;align-items:center;justify-content:center;font-size:2.2rem;position:relative;overflow:hidden}
.work-badge{position:absolute;top:9px;left:9px;background:#1a2e45;color:#fff;font-size:.66rem;font-weight:700;padding:.2rem .5rem;border-radius:4px}
.work-body{padding:1rem}
.work-title{font-size:.96rem;font-weight:700;margin-bottom:.3rem}
.work-desc{font-size:.82rem;color:#90a4ae;margin-bottom:.7rem;line-height:1.55}
.work-tags,.project-tags{display:flex;flex-wrap:wrap;gap:.35rem}
.work-tag,.project-tag{background:#f0f4f8;color:#90a4ae;font-size:.7rem;padding:.17rem .5rem;border-radius:4px}
.doc-list{display:flex;flex-direction:column;gap:.8rem}
.doc-item{display:flex;align-items:center;gap:1rem;background:#f0f4f8;border-radius:10px;padding:1rem 1.2rem;border:1px solid #e5e7eb}
.doc-icon{width:42px;height:42px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.25rem;flex-shrink:0}
.doc-icon.pdf{background:#fee2e2}.doc-icon.ppt{background:#fef3c7}.doc-icon.img{background:#dbeafe}
.doc-info{flex:1}
.doc-name{font-size:.92rem;font-weight:600}
.doc-meta{font-size:.76rem;color:#90a4ae;margin-top:.15rem}
.btn-view{background:var(--accent);color:#fff;border:none;border-radius:6px;padding:.4rem .9rem;font-size:.82rem;cursor:pointer;text-decoration:none;font-family:inherit}
.contact-links{display:flex;flex-wrap:wrap;gap:.9rem;justify-content:center}
.contact-link{display:flex;align-items:center;gap:.5rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);color:#fff;text-decoration:none;padding:.6rem 1.2rem;border-radius:8px;font-size:.9rem}
.modal-bg{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:999;align-items:center;justify-content:center;padding:1rem}
.modal-bg.open{display:flex}
.modal-box{background:#162030;border:1px solid #2a4060;border-radius:16px;padding:2rem;width:100%;max-width:820px;max-height:90vh;overflow-y:auto;position:relative}
.modal-close{position:absolute;top:1rem;right:1rem;background:none;border:none;color:#90a4ae;font-size:1.5rem;cursor:pointer}
.empty-state{text-align:center;padding:3rem;color:#90a4ae;border:2px dashed #e5e7eb;border-radius:12px}
@media(max-width:680px){.about-grid{grid-template-columns:1fr}.work-grid{grid-template-columns:1fr}.about-facts{grid-template-columns:1fr}.nav-links{display:none}}
</style>
</head>
<body>
<nav class="nav">
  <span class="nav-logo">${P.siteTitle||u.username+'의 포트폴리오'}</span>
  <ul class="nav-links">
    <li><a href="#about">소개</a></li><li><a href="#portfolio">포트폴리오</a></li>
    <li><a href="#resume">서류</a></li><li><a href="#projects">프로젝트</a></li>
    <li><a href="#contact">연락처</a></li>
  </ul>
</nav>
<section class="hero" id="hero">
  <div class="hero-inner">
    <span class="hero-badge">${P.badge||'학생 포트폴리오'}</span>
    <h1 class="hero-name">${nameHTML}</h1>
    <p class="hero-desc">${P.desc||''}</p>
    <div class="hero-tags">${tagsHTML}</div>
  </div>
</section>
<section id="about" class="sec-white">
  <div class="sec-inner">
    <p class="sec-label">About Me</p><h2 class="sec-title">자기소개</h2>
    <div class="about-grid">
      <div>${P.photoSrc?`<img class="about-photo" src="${P.photoSrc}" alt="프로필"/>`:'<div class="photo-placeholder">📷</div>'}</div>
      <div>
        <p class="about-text">${(P.aboutText||'').replace(/\n/g,'<br>')}</p>
        <div class="about-facts">
          <div class="fact"><span class="fact-lbl">학교</span><span class="fact-val">${P.school||'-'}</span></div>
          <div class="fact"><span class="fact-lbl">학년</span><span class="fact-val">${P.grade||'-'}</span></div>
          <div class="fact"><span class="fact-lbl">관심 분야</span><span class="fact-val">${P.interest||'-'}</span></div>
          <div class="fact"><span class="fact-lbl">목표</span><span class="fact-val">${P.goal||'-'}</span></div>
        </div>
      </div>
    </div>
  </div>
</section>
<section id="portfolio" class="sec-gray">
  <div class="sec-inner">
    <p class="sec-label">Portfolio</p><h2 class="sec-title">포트폴리오</h2>
    <div class="filter-row" id="filter-row">
      <button class="filter-btn active" data-f="all">전체</button>
      <button class="filter-btn" data-f="design">디자인</button>
      <button class="filter-btn" data-f="dev">개발</button>
      <button class="filter-btn" data-f="video">영상</button>
      <button class="filter-btn" data-f="etc">기타</button>
    </div>
    <div class="work-grid" id="work-grid">
      ${(P.works||[]).length ? worksHTML : '<div class="empty-state"><div style="font-size:2.5rem;margin-bottom:.7rem">🎨</div><p>아직 작품이 없습니다.</p></div>'}
    </div>
  </div>
</section>
<section id="resume" class="sec-white">
  <div class="sec-inner">
    <p class="sec-label">Documents</p><h2 class="sec-title">자기소개서 &amp; 서류</h2>
    <div class="doc-list">${(P.docs||[]).length ? docsHTML : '<div class="empty-state"><div style="font-size:2.5rem;margin-bottom:.7rem">📂</div><p>등록된 서류가 없습니다.</p></div>'}</div>
  </div>
</section>
<section id="projects" class="sec-gray">
  <div class="sec-inner">
    <p class="sec-label">Projects</p><h2 class="sec-title">프로젝트</h2>
    <div class="doc-list">${(P.projects||[]).length ? projectsHTML : '<div class="empty-state"><div style="font-size:2.5rem;margin-bottom:.7rem">📦</div><p>등록된 프로젝트가 없습니다.</p></div>'}</div>
  </div>
</section>
<section id="contact" class="sec-dark">
  <div class="sec-inner" style="text-align:center">
    <p class="sec-label" style="color:${accent}">Contact</p>
    <h2 class="sec-title">연락처</h2>
    <p style="color:#90a4ae;margin:1rem auto 2rem;max-width:460px">${P.contactDesc||''}</p>
    <div class="contact-links">${contactLinks}</div>
  </div>
</section>
<footer style="background:#060e18;color:#546e7a;text-align:center;padding:1.2rem;font-size:.78rem">
  © ${new Date().getFullYear()} ${P.name||u.username} 포트폴리오
</footer>
<div class="modal-bg" id="viewer-modal">
  <div class="modal-box">
    <button class="modal-close" onclick="closeViewer()">×</button>
    <h3 id="viewer-title" style="color:#fff;margin-bottom:1rem"></h3>
    <div id="viewer-body"></div>
  </div>
</div>
<script>
document.getElementById('filter-row').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn'); if(!btn) return;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.toggle('active',b===btn));
  const f = btn.dataset.f;
  document.querySelectorAll('.work-card').forEach(c => {
    const cat = c.querySelector('.work-thumb')?.dataset?.cat || 'etc';
    c.style.display = (f==='all' || cat===f) ? '' : 'none';
  });
});
function showViewer(id) {
  const content = document.getElementById('viewer-'+id);
  if(!content) return;
  document.getElementById('viewer-body').innerHTML = content.querySelector('.viewer-content')?.innerHTML || '';
  document.getElementById('viewer-modal').classList.add('open');
}
function closeViewer() {
  document.getElementById('viewer-modal').classList.remove('open');
  document.getElementById('viewer-body').innerHTML = '';
}
document.getElementById('viewer-modal').addEventListener('click', e => {
  if(e.target === document.getElementById('viewer-modal')) closeViewer();
});
</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${u.username}_portfolio.html"`);
    res.send(html);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
