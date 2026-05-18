// ──────────────────────────────────────────────────────────────
//  server/sanitize.js  — XSS 방어용 입력값 정화 유틸
// ──────────────────────────────────────────────────────────────

/**
 * HTML 특수문자를 엔티티로 변환해서 XSS 차단
 * <script>, <img onerror=...> 등 모든 HTML 태그 무력화
 */
// 필드별 최대 길이
const MAX_LEN = {
  name: 50, siteTitle: 80, badge: 30, desc: 200,
  aboutText: 2000, school: 50, grade: 20, interest: 100,
  goal: 100, contactDesc: 200, email: 100, phone: 20,
  tag: 30, docName: 100, projName: 100,
};

function escapeHtml(str, maxLen = 2000) {
  if (str === null || str === undefined) return '';
  return String(str)
    .slice(0, maxLen)         // 길이 제한
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * URL 허용 목록 검사 — javascript: 프로토콜 차단
 */
function sanitizeUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  // javascript:, data:, vbscript: 차단
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return '';
  return trimmed;
}

/**
 * 태그 배열 정화
 */
function sanitizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map(t => escapeHtml(String(t).trim())).filter(Boolean).slice(0, 10);
}

/**
 * 포트폴리오 업데이트 객체 전체 정화
 */
function sanitizePortfolioUpdate(body) {
  const clean = {};

  // 일반 텍스트 필드 (길이 제한 적용)
  const textFields = {
    name: MAX_LEN.name, siteTitle: MAX_LEN.siteTitle, badge: MAX_LEN.badge,
    desc: MAX_LEN.desc, aboutText: MAX_LEN.aboutText, school: MAX_LEN.school,
    grade: MAX_LEN.grade, interest: MAX_LEN.interest, goal: MAX_LEN.goal,
    contactDesc: MAX_LEN.contactDesc,
  };
  Object.entries(textFields).forEach(([k, maxLen]) => {
    if (body[k] !== undefined) clean[k] = escapeHtml(body[k], maxLen);
  });

  // URL 필드
  const urlFields = ['github','youtube','instagram','notion','bannerSrc','photoSrc'];
  urlFields.forEach(k => {
    if (body[k] !== undefined) clean[k] = sanitizeUrl(body[k]);
  });

  // 이메일
  if (body.email !== undefined) {
    clean.email = escapeHtml(body.email).replace(/[^a-zA-Z0-9@._\-+]/g, '');
  }

  // 전화번호
  if (body.phone !== undefined) {
    clean.phone = String(body.phone).replace(/[^0-9\-+() ]/g, '').slice(0, 20);
  }

  // 태그 배열
  if (body.tags !== undefined) {
    clean.tags = Array.isArray(body.tags)
      ? sanitizeTags(body.tags)
      : sanitizeTags(String(body.tags).split(','));
  }

  // design 객체 — 중첩 구조 허용하되 문자열 값만 정화
  if (body.design !== undefined && typeof body.design === 'object') {
    clean.design = sanitizeDesign(body.design);
  }

  // projects 배열
  if (body.projects !== undefined) {
    clean.projects = body.projects;
  }

  return clean;
}

/**
 * 작품 데이터 정화
 */
function sanitizeWork(body) {
  return {
    title:    escapeHtml(body.title || '', 100),
    desc:     escapeHtml(body.desc  || '', 500),
    category: ['design','dev','video','etc'].includes(body.category) ? body.category : 'etc',
    type:     ['image','youtube','video','pdf'].includes(body.type)   ? body.type     : 'image',
    tags:     sanitizeTags(
      typeof body.tags === 'string'
        ? body.tags.split(',')
        : (Array.isArray(body.tags) ? body.tags : [])
    ),
  };
}

/**
 * 서류/프로젝트 데이터 정화
 */
function sanitizeDoc(body) {
  return {
    name: escapeHtml(body.name || ''),
    desc: escapeHtml(body.desc || ''),
    type: ['pdf','ppt','img'].includes(body.type) ? body.type : 'pdf',
    link: sanitizeUrl(body.link || ''),
  };
}

function sanitizeProject(body) {
  return {
    name: escapeHtml(body.name || ''),
    desc: escapeHtml(body.desc || ''),
    link: sanitizeUrl(body.link || ''),
    tags: sanitizeTags(
      typeof body.tags === 'string'
        ? body.tags.split(',')
        : (Array.isArray(body.tags) ? body.tags : [])
    ),
  };
}

/**
 * design 객체 정화 (sectionOrder 배열, 숫자, 불리언, 색상값 허용)
 */
function sanitizeDesign(design) {
  if (!design || typeof design !== 'object') return {};
  const clean = {};
  const allowedThemes = ['dark','cyber','light','retro','nature','minimal'];
  const allowedFonts  = ['pretendard','noto','gothic','gamja','ibm'];
  const allowedLayouts= ['default','wide','masonry','list','compact','feature'];

  if (design.theme      && allowedThemes.includes(design.theme))   clean.theme      = design.theme;
  if (design.font       && allowedFonts.includes(design.font))     clean.font       = design.font;
  if (design.layout     && allowedLayouts.includes(design.layout)) clean.layout     = design.layout;
  if (design.bgPattern  && typeof design.bgPattern === 'string')   clean.bgPattern  = design.bgPattern.replace(/[^a-z]/g,'');
  if (design.accentColor && /^#[0-9a-fA-F]{3,8}$/.test(design.accentColor)) clean.accentColor = design.accentColor;
  if (typeof design.heroHeight  === 'number') clean.heroHeight  = Math.min(Math.max(design.heroHeight,  50), 100);
  if (typeof design.cardRadius  === 'number') clean.cardRadius  = Math.min(Math.max(design.cardRadius,  0),  30);
  if (typeof design.animOn      === 'boolean') clean.animOn     = design.animOn;
  if (typeof design.shadowOn    === 'boolean') clean.shadowOn   = design.shadowOn;
  if (typeof design.borderOn    === 'boolean') clean.borderOn   = design.borderOn;
  if (Array.isArray(design.sectionOrder)) {
    const allowed = ['about','portfolio','resume','projects','contact'];
    clean.sectionOrder = design.sectionOrder.filter(s => allowed.includes(s));
  }
  // 커스텀 폰트
  if (design.font === 'custom') clean.font = 'custom';
  if (design.customFontName && typeof design.customFontName === 'string')
    clean.customFontName = design.customFontName.slice(0, 60).replace(/[<>"']/g, '');
  if (design.customFontUrl && typeof design.customFontUrl === 'string') {
    const url = design.customFontUrl.trim();
    if (url.startsWith('https://fonts.googleapis.com/') || url.startsWith('https://fonts.gstatic.com/'))
      clean.customFontUrl = url;
  }
  // 호버 높이
  if (typeof design.hoverHeight === 'number')
    clean.hoverHeight = Math.min(Math.max(design.hoverHeight, 0), 20);
  // 글자 크기
  if (typeof design.bodySizeFont  === 'number') clean.bodySizeFont  = Math.min(Math.max(design.bodySizeFont,  12), 22);
  if (typeof design.titleSizeFont === 'number') clean.titleSizeFont = Math.min(Math.max(design.titleSizeFont, 20), 60);
  // 글자 색상
  if (design.bodyColor  && /^#[0-9a-fA-F]{3,8}$/.test(design.bodyColor))  clean.bodyColor  = design.bodyColor;
  if (design.titleColor && /^#[0-9a-fA-F]{3,8}$/.test(design.titleColor)) clean.titleColor = design.titleColor;
  if (design.mutedColor && /^#[0-9a-fA-F]{3,8}$/.test(design.mutedColor)) clean.mutedColor = design.mutedColor;
  return clean;
}

module.exports = { escapeHtml, sanitizeUrl, sanitizeTags, sanitizePortfolioUpdate, sanitizeWork, sanitizeDoc, sanitizeProject };
