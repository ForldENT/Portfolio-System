// ──────────────────────────────────────────────────────────────
//  server/db.js  — JSON 파일 기반 데이터베이스
// ──────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const DB   = path.join(__dirname, '../data/users.json');

const read  = () => { try { return JSON.parse(fs.readFileSync(DB, 'utf8')); } catch { return { users: {} }; } };
const write = d => fs.writeFileSync(DB, JSON.stringify(d, null, 2));

// 기본 포트폴리오 데이터 (신규 가입 시)
function defaultPortfolio(profile) {
  return {
    name:        profile.displayName || profile.username,
    siteTitle:   `${profile.username}의 포트폴리오`,
    badge:       '학생 포트폴리오',
    desc:        '안녕하세요! 포트폴리오를 수정해주세요.',
    tags:        ['게임 개발', '디자인'],
    photoSrc:    profile.photos?.[0]?.value || '',
    aboutText:   '자기소개를 입력해주세요.',
    school: '', grade: '', interest: '', goal: '',
    contactDesc: '연락은 아래 링크를 이용해주세요.',
    email: '', github: `https://github.com/${profile.username}`, instagram: '',
    works: [], docs: [],
    design: {
      theme: 'dark', accentColor: '#1e88e5', font: 'pretendard',
      layout: 'default', bgPattern: 'none', heroHeight: 92, cardRadius: 12,
      animOn: true, shadowOn: true, borderOn: true,
      sectionOrder: ['about', 'portfolio', 'resume', 'contact'],
    },
  };
}

module.exports = {
  getUserById:      id  => read().users[String(id)] || null,
  getUserByUsername: un => Object.values(read().users).find(u => u.username === un) || null,
  getAllUsers: () => Object.values(read().users).map(u => ({
    id: u.id, username: u.username, avatar: u.avatar,
    name: u.portfolio?.name || u.username,
    school: u.portfolio?.school || '',
    goal:   u.portfolio?.goal   || '',
  })),
  createUser(data) {
    const db = read();
    db.users[String(data.id)] = data;
    write(db); return data;
  },
  updatePortfolio(userId, updates) {
    const db = read(); const u = db.users[String(userId)];
    if (!u) return null;
    u.portfolio = { ...u.portfolio, ...updates };
    write(db); return u;
  },
  addWork(userId, work) {
    const db = read(); const u = db.users[String(userId)];
    if (!u) return null;
    u.portfolio.works = u.portfolio.works || [];
    u.portfolio.works.push(work); write(db); return work;
  },
  updateWork(userId, workId, upd) {
    const db = read(); const u = db.users[String(userId)];
    if (!u) return null;
    const i = (u.portfolio.works||[]).findIndex(w => String(w.id)===String(workId));
    if (i < 0) return null;
    u.portfolio.works[i] = { ...u.portfolio.works[i], ...upd };
    write(db); return u.portfolio.works[i];
  },
  deleteWork(userId, workId) {
    const db = read(); const u = db.users[String(userId)];
    if (!u) return false;
    u.portfolio.works = (u.portfolio.works||[]).filter(w => String(w.id)!==String(workId));
    write(db); return true;
  },
  addDoc(userId, doc) {
    const db = read(); const u = db.users[String(userId)];
    if (!u) return null;
    u.portfolio.docs = u.portfolio.docs || [];
    u.portfolio.docs.push(doc); write(db); return doc;
  },
  deleteDoc(userId, docId) {
    const db = read(); const u = db.users[String(userId)];
    if (!u) return false;
    u.portfolio.docs = (u.portfolio.docs||[]).filter(d => String(d.id)!==String(docId));
    write(db); return true;
  },
  defaultPortfolio,
};
