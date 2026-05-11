// ──────────────────────────────────────────────────────────────
//  server/db.js  — MongoDB 우선, 없으면 JSON 파일 사용
// ──────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');

let useMongo = false;
let User     = null;

function initMongo(connected, UserModel) {
  useMongo = connected;
  User     = UserModel;
}

// JSON 파일 DB (fallback)
const DB_PATH  = path.join(__dirname, '../data/users.json');
const readJSON  = () => { try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch { return { users: {} }; } };
const writeJSON = d  => { fs.mkdirSync(path.dirname(DB_PATH), { recursive: true }); fs.writeFileSync(DB_PATH, JSON.stringify(d, null, 2)); };

// 기본 포트폴리오
function defaultPortfolio(profile) {
  return {
    name:        profile.displayName || profile.username,
    siteTitle:   profile.username + '의 포트폴리오',
    badge:       '학생 포트폴리오',
    desc:        '안녕하세요! 포트폴리오를 수정해주세요.',
    tags:        ['게임 개발', '디자인'],
    photoSrc:    (profile.photos && profile.photos[0] && profile.photos[0].value) || '',
    aboutText:   '자기소개를 입력해주세요.',
    school: '', grade: '', interest: '', goal: '',
    contactDesc: '연락은 아래 링크를 이용해주세요.',
    email: '', phone: '', github: 'https://github.com/' + profile.username, youtube: '', instagram: '',
    works: [], docs: [], projects: [],
    design: {
      theme: 'dark', accentColor: '#1e88e5', font: 'pretendard',
      layout: 'default', bgPattern: 'none', heroHeight: 92, cardRadius: 12,
      animOn: true, shadowOn: true, borderOn: true,
      sectionOrder: ['about', 'portfolio', 'resume', 'contact'],
    },
  };
}

async function getUserById(id) {
  if (useMongo) return await User.findOne({ id: String(id) }).lean() || null;
  return readJSON().users[String(id)] || null;
}

async function getUserByUsername(username) {
  if (useMongo) return await User.findOne({ username: new RegExp('^' + username + '$', 'i') }).lean() || null;
  return Object.values(readJSON().users).find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
}

async function getAllUsers() {
  let users;
  if (useMongo) {
    users = await User.find({}).lean();
  } else {
    users = Object.values(readJSON().users);
  }
  return users.map(u => ({
    id:       u.id,
    username: u.username,
    // photoSrc(직접 업로드 사진)가 있으면 우선 사용, 없으면 GitHub 프로필 사진
    avatar:   (u.portfolio && u.portfolio.photoSrc) || u.avatar || '',
    name:     (u.portfolio && u.portfolio.name)   || u.username,
    school:   (u.portfolio && u.portfolio.school) || '',
    goal:     (u.portfolio && u.portfolio.goal)   || '',
  }));
}

async function createUser(data) {
  if (useMongo) {
    const u = new User(data);
    await u.save();
    return u.toObject();
  }
  const db = readJSON();
  db.users[String(data.id)] = data;
  writeJSON(db);
  return data;
}

async function updatePortfolio(userId, updates) {
  if (useMongo) {
    const setObj = {};
    Object.keys(updates).forEach(k => { setObj['portfolio.' + k] = updates[k]; });
    return await User.findOneAndUpdate({ id: String(userId) }, { $set: setObj }, { new: true }).lean();
  }
  const db = readJSON();
  const u  = db.users[String(userId)];
  if (!u) return null;
  u.portfolio = Object.assign({}, u.portfolio, updates);
  writeJSON(db);
  return u;
}

async function addWork(userId, work) {
  if (useMongo) {
    await User.updateOne({ id: String(userId) }, { $push: { 'portfolio.works': work } });
    return work;
  }
  const db = readJSON(); const u = db.users[String(userId)]; if (!u) return null;
  u.portfolio.works = u.portfolio.works || [];
  u.portfolio.works.push(work); writeJSON(db); return work;
}

async function updateWork(userId, workId, upd) {
  if (useMongo) {
    const u = await User.findOne({ id: String(userId) }).lean(); if (!u) return null;
    const works = u.portfolio.works || [];
    const idx = works.findIndex(w => String(w.id) === String(workId)); if (idx < 0) return null;
    Object.assign(works[idx], upd);
    await User.updateOne({ id: String(userId) }, { $set: { 'portfolio.works': works } });
    return works[idx];
  }
  const db = readJSON(); const u = db.users[String(userId)]; if (!u) return null;
  const idx = (u.portfolio.works||[]).findIndex(w => String(w.id)===String(workId)); if (idx < 0) return null;
  u.portfolio.works[idx] = Object.assign({}, u.portfolio.works[idx], upd);
  writeJSON(db); return u.portfolio.works[idx];
}

async function deleteWork(userId, workId) {
  if (useMongo) {
    await User.updateOne({ id: String(userId) }, { $pull: { 'portfolio.works': { id: String(workId) } } });
    return true;
  }
  const db = readJSON(); const u = db.users[String(userId)]; if (!u) return false;
  u.portfolio.works = (u.portfolio.works||[]).filter(w => String(w.id)!==String(workId));
  writeJSON(db); return true;
}

async function addDoc(userId, doc) {
  if (useMongo) {
    await User.updateOne({ id: String(userId) }, { $push: { 'portfolio.docs': doc } });
    return doc;
  }
  const db = readJSON(); const u = db.users[String(userId)]; if (!u) return null;
  u.portfolio.docs = u.portfolio.docs || [];
  u.portfolio.docs.push(doc); writeJSON(db); return doc;
}

async function deleteDoc(userId, docId) {
  if (useMongo) {
    await User.updateOne({ id: String(userId) }, { $pull: { 'portfolio.docs': { id: String(docId) } } });
    return true;
  }
  const db = readJSON(); const u = db.users[String(userId)]; if (!u) return false;
  u.portfolio.docs = (u.portfolio.docs||[]).filter(d => String(d.id)!==String(docId));
  writeJSON(db); return true;
}


async function deleteUser(username) {
  if (useMongo) {
    const res = await User.deleteOne({ username: new RegExp('^' + username + '$', 'i') });
    return res.deletedCount > 0;
  }
  const db = readJSON();
  const user = Object.values(db.users).find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) return false;
  delete db.users[String(user.id)];
  writeJSON(db);
  return true;
}

module.exports = { initMongo, getUserById, getUserByUsername, getAllUsers, createUser, deleteUser, updatePortfolio, addWork, updateWork, deleteWork, addDoc, deleteDoc, defaultPortfolio };
