// ──────────────────────────────────────────────────────────────
//  public/js/portfolio.js  — 포트폴리오 페이지 프론트엔드
// ──────────────────────────────────────────────────────────────

/* ── 전역 상태 ── */
const G = {
  username: null,   // URL에서 추출
  me:       null,   // 로그인한 나
  isOwner:  false,  // 내 페이지 여부
  portfolio: null,  // 포트폴리오 데이터
  filter:   'all',
};

/* ── 유틸 ── */
const $      = id => document.getElementById(id);
const ytId   = url => { const m=(url||'').match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{11})/); return m?m[1]:null; };
const toast  = (msg, type='info') => {
  const el = document.createElement('div');
  el.className = `toast ${type}`; el.textContent = msg;
  $('toast-wrap').appendChild(el);
  setTimeout(() => el.remove(), 3000);
};

function openModal(n) {
  const P = G.portfolio;
  if (n==='profile') { $('p-name').value=P.name||''; $('p-site').value=P.siteTitle||''; $('p-badge').value=P.badge||''; $('p-desc').value=P.desc||''; $('p-tags').value=(P.tags||[]).join(', '); }
  if (n==='about')   { $('a-text').value=P.aboutText||''; $('a-school').value=P.school||''; $('a-grade').value=P.grade||''; $('a-interest').value=P.interest||''; $('a-goal').value=P.goal||''; }
  if (n==='contact') { $('c-desc').value=P.contactDesc||''; $('c-email').value=P.email||''; $('c-github').value=P.github||''; $('c-insta').value=P.instagram||''; }
  $(`modal-${n}`).classList.add('open');
}
function closeModal(n) { $(`modal-${n}`)?.classList.remove('open'); }

// 모달 닫기 이벤트
document.addEventListener('click', e => {
  const x = e.target.closest('[data-close]');
  if (x) closeModal(x.dataset.close);
  document.querySelectorAll('.modal-overlay').forEach(o => { if (e.target===o) o.classList.remove('open'); });
});

/* ── 초기화 ── */
async function init() {
  G.username = location.pathname.split('/u/')[1]?.split('/')[0];
  if (!G.username) return;

  // 로그인 확인
  const me = await fetch('/auth/me').then(r=>r.json());
  if (me.loggedIn) G.me = me;

  // 포트폴리오 데이터 로드
  const data = await fetch(`/api/users/${G.username}`).then(r=>r.json());
  if (data.error) { alert('유저를 찾을 수 없습니다.'); return; }

  G.portfolio = data.portfolio;
  G.isOwner   = G.me && G.me.username === G.username;

  renderAll();
  if (G.isOwner) setupOwner();
}

/* ── 전체 렌더 ── */
function renderAll() {
  const P  = G.portfolio;
  const dz = P.design || {};

  // CSS 변수
  document.documentElement.style.setProperty('--accent',    dz.accentColor || '#1e88e5');
  document.documentElement.style.setProperty('--radius',    (dz.cardRadius || 12) + 'px');
  document.documentElement.style.setProperty('--hero-h',    (dz.heroHeight  || 92) + 'vh');

  // 메타
  document.title = P.siteTitle || '포트폴리오';
  $('nav-logo').textContent   = P.siteTitle || '포트폴리오';
  $('hero-badge').textContent = P.badge || '';
  const [f, ...r] = (P.name||'').split(' ');
  $('hero-name').innerHTML = r.length ? `${f} <span>${r.join(' ')}</span>` : `<span>${f}</span>`;
  $('hero-desc').textContent = P.desc || '';
  $('hero-tags').innerHTML   = (P.tags||[]).map(t=>`<span class="hero-tag">${t}</span>`).join('');

  // 소개
  $('about-text').innerHTML       = (P.aboutText||'').replace(/\n/g,'<br>');
  $('fact-school').textContent    = P.school   || '-';
  $('fact-grade').textContent     = P.grade    || '-';
  $('fact-interest').textContent  = P.interest || '-';
  $('fact-goal').textContent      = P.goal     || '-';

  // 사진
  if (P.photoSrc) {
    $('photo-ph').style.display   = 'none';
    $('about-photo').src          = P.photoSrc;
    $('about-photo').style.display = 'block';
  } else {
    $('photo-ph').style.display   = 'flex';
    $('about-photo').style.display = 'none';
  }

  // 연락처
  $('contact-desc').textContent = P.contactDesc || '';
  $('contact-links').innerHTML  = [
    P.email     && `<a href="mailto:${P.email}" class="contact-link">📧 ${P.email}</a>`,
    P.github    && `<a href="${P.github}" target="_blank" class="contact-link">🐱 GitHub</a>`,
    P.instagram && `<a href="${P.instagram}" target="_blank" class="contact-link">📸 Instagram</a>`,
  ].filter(Boolean).join('');

  $('footer-txt').textContent = `© ${new Date().getFullYear()} ${P.name||''} 포트폴리오`;

  renderWorks();
  renderDocs();

  // 디자인 적용 (designer.js의 함수 — 로드된 경우에만)
  if (typeof applyDesignAll === 'function') applyDesignAll(dz);
  if (dz.sectionOrder) applySectionOrder(dz.sectionOrder);
}

/* ── 작품 렌더 ── */
const TYPE_LABEL = { image:'이미지', youtube:'유튜브', video:'영상', pdf:'PDF' };
const TYPE_ICON  = { image:'🖼️', youtube:'▶️', video:'🎬', pdf:'📄' };

function renderWorks() {
  const grid = $('work-grid');
  const list = G.filter==='all' ? G.portfolio.works : G.portfolio.works.filter(w=>w.category===G.filter);
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="ei">🎨</div><p>${G.isOwner?'"+ 작품 추가"로 첫 작품을 올려보세요!':'아직 작품이 없습니다.'}</p></div>`;
    return;
  }
  grid.innerHTML = list.map(w => {
    const yid   = w.type==='youtube' ? ytId(w.src) : null;
    const thumb = yid
      ? `<img src="https://img.youtube.com/vi/${yid}/hqdefault.jpg" alt="${w.title}"/>`
      : (w.src && (w.type==='image'||w.type==='video'))
      ? `<img src="${w.src}" alt="${w.title}"/>`
      : `<span style="font-size:2.2rem">${TYPE_ICON[w.type]||'📁'}</span>`;
    const editBtns = G.isOwner ? `
      <div class="card-actions" style="display:flex">
        <button class="card-action-btn" onclick="event.stopPropagation();editWork('${w.id}')">✏️</button>
        <button class="card-action-btn" style="color:#ff7070" onclick="event.stopPropagation();delWork('${w.id}')">🗑️</button>
      </div>` : '';
    return `
      <div class="work-card" onclick="viewWork('${w.id}')">
        <div class="work-thumb">${thumb}<span class="work-badge">${TYPE_LABEL[w.type]||w.type}</span></div>
        <div class="work-body">
          <h3 class="work-title">${w.title}</h3>
          <p class="work-desc">${w.desc||''}</p>
          <div class="work-tags">${(w.tags||[]).map(t=>`<span class="work-tag">${t}</span>`).join('')}</div>
        </div>
        ${editBtns}
      </div>`;
  }).join('');
}

/* ── 서류 렌더 ── */
function renderDocs() {
  const list = $('doc-list');
  const ICO  = { pdf:'📄', ppt:'📊', img:'🖼️' };
  if (!G.portfolio.docs.length) {
    list.innerHTML = `<div class="empty-state"><div class="ei">📂</div><p>${G.isOwner?'"+ 서류 추가"로 등록해보세요!':'등록된 서류가 없습니다.'}</p></div>`;
    return;
  }
  list.innerHTML = G.portfolio.docs.map(d => `
    <div class="doc-item">
      <div class="doc-icon ${d.type}">${ICO[d.type]||'📎'}</div>
      <div class="doc-info">
        <div class="doc-name">${d.name}</div>
        <div class="doc-meta">${d.type.toUpperCase()}${d.desc?' · '+d.desc:''}</div>
      </div>
      <div class="doc-actions">
        ${d.src ? `<a href="${d.src}" target="_blank" class="btn btn-primary btn-sm">보기</a>` : ''}
        ${G.isOwner ? `<button class="btn btn-danger btn-sm" onclick="delDoc('${d.id}')">삭제</button>` : ''}
      </div>
    </div>`).join('');
}

/* ── 필터 ── */
$('filter-row').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn'); if (!btn) return;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b===btn));
  G.filter = btn.dataset.f; renderWorks();
});

/* ── 오너 전용 세팅 ── */
function setupOwner() {
  // 편집 버튼 표시
  document.querySelectorAll('.edit-only').forEach(el => el.style.display = '');

  // 사진 변경
  const overlay = $('photo-overlay');
  overlay.style.display = 'flex';
  overlay.addEventListener('click', () => $('photo-file').click());
  $('photo-file').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append('photo', file);
    toast('사진 업로드 중...', 'info');
    const res = await fetch('/api/portfolio/photo', { method:'POST', body:fd }).then(r=>r.json());
    if (res.ok) { G.portfolio.photoSrc = res.url; renderAll(); toast('사진 변경됨!', 'success'); }
    else toast(res.error||'업로드 실패', 'error');
    e.target.value = '';
  });

  // 네비 편집 버튼
  $('nav-edit-btn').onclick = () => openModal('profile');

  // 저장 버튼들
  $('save-profile').onclick = saveProfile;
  $('save-about').onclick   = saveAbout;
  $('save-work').onclick    = saveWork;
  $('save-doc').onclick     = saveDoc;
  $('save-contact').onclick = saveContact;

  // 작품 추가 버튼
  $('btn-add-work').onclick = openWorkAdd;

  // 서류 추가 버튼
  $('btn-add-doc').onclick = () => openModal('doc');

  // 연락처 수정 버튼
  $('btn-edit-contact').onclick = () => openModal('contact');

  // 소개 수정 버튼
  $('btn-edit-about').onclick = () => openModal('about');

  // 작품 파일 업로드
  $('w-upload-zone').addEventListener('click', () => $('w-file').click());
  $('w-file').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    window._wFile = f; $('w-fn').textContent = '✅ ' + f.name;
    // 이미지 미리보기
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => { if ($('w-cur-img')) $('w-cur-img').src = ev.target.result; };
      reader.readAsDataURL(f);
    }
  });

  // 서류 파일 업로드
  $('d-upload-zone').addEventListener('click', () => $('d-file').click());
  $('d-file').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    window._dFile = f; $('d-fn').textContent = '✅ ' + f.name;
  });

  // 미디어 유형 변경
  $('w-type').addEventListener('change', toggleWType);

  // 디자이너 로드
  const s = document.createElement('script');
  s.src = '/js/designer.js'; document.body.appendChild(s);
}

/* ── 저장: 프로필 ── */
async function saveProfile() {
  const body = {
    name:      $('p-name').value,
    siteTitle: $('p-site').value,
    badge:     $('p-badge').value,
    desc:      $('p-desc').value,
    tags:      $('p-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
  };
  const res = await api('/api/portfolio', 'PATCH', body);
  if (res.ok) { G.portfolio = res.portfolio; renderAll(); closeModal('profile'); toast('프로필 저장됨!','success'); }
}

/* ── 저장: 소개 ── */
async function saveAbout() {
  const body = {
    aboutText: $('a-text').value, school: $('a-school').value,
    grade: $('a-grade').value, interest: $('a-interest').value, goal: $('a-goal').value,
  };
  const res = await api('/api/portfolio', 'PATCH', body);
  if (res.ok) { G.portfolio = res.portfolio; renderAll(); closeModal('about'); toast('소개 저장됨!','success'); }
}

/* ── 저장: 연락처 ── */
async function saveContact() {
  const body = {
    contactDesc: $('c-desc').value, email: $('c-email').value,
    github: $('c-github').value, instagram: $('c-insta').value,
  };
  const res = await api('/api/portfolio', 'PATCH', body);
  if (res.ok) { G.portfolio = res.portfolio; renderAll(); closeModal('contact'); toast('연락처 저장됨!','success'); }
}

/* ── 작품 유형 토글 ── */
function toggleWType() {
  const t = $('w-type').value;
  $('w-yt-g').style.display   = t==='youtube' ? '' : 'none';
  $('w-file-g').style.display = t!=='youtube' ? '' : 'none';
}

/* ── 작품 추가 모달 열기 ── */
function openWorkAdd() {
  window._editWorkId = null; window._wFile = null;
  $('work-ttl').textContent  = '작품 추가';
  $('w-save-btn').textContent = '추가';
  $('w-id').value = ''; $('w-title').value = ''; $('w-desc').value = '';
  $('w-cat').value = 'design'; $('w-type').value = 'image';
  $('w-tags').value = ''; $('w-yt').value = ''; $('w-fn').textContent = '';
  $('w-cur-wrap').style.display = 'none';
  toggleWType(); openModal('work');
}

/* ── 작품 수정 모달 열기 ── */
function editWork(id) {
  const w = G.portfolio.works.find(x => x.id===id); if (!w) return;
  window._editWorkId = id; window._wFile = null;
  $('work-ttl').textContent  = '작품 수정';
  $('w-save-btn').textContent = '저장';
  $('w-id').value       = id;
  $('w-title').value    = w.title;
  $('w-desc').value     = w.desc || '';
  $('w-cat').value      = w.category || 'design';
  $('w-type').value     = w.type || 'image';
  $('w-tags').value     = (w.tags||[]).join(', ');
  $('w-fn').textContent = '';
  if (w.type==='youtube') {
    $('w-yt').value = w.src || '';
  } else if (w.src) {
    $('w-cur-wrap').style.display = 'flex';
    $('w-cur-img').src = w.src;
  } else {
    $('w-cur-wrap').style.display = 'none';
  }
  toggleWType(); openModal('work');
}

/* ── 작품 저장 ── */
async function saveWork() {
  const title = $('w-title').value.trim();
  if (!title) { toast('제목을 입력하세요', 'error'); return; }
  const id   = window._editWorkId;
  const type = $('w-type').value;

  if (id) {
    // 이미지 교체 (파일 있을 때)
    if (window._wFile && type !== 'youtube') {
      const fd = new FormData(); fd.append('file', window._wFile);
      const r = await fetch(`/api/works/${id}/image`, { method:'PATCH', body:fd }).then(r=>r.json());
      if (r.ok) { const w = G.portfolio.works.find(x=>x.id===id); if(w) w.src=r.src; }
    }
    // 텍스트 수정
    const res = await api(`/api/works/${id}`, 'PATCH', {
      title, desc: $('w-desc').value, category: $('w-cat').value, tags: $('w-tags').value,
    });
    if (res.ok) {
      const idx = G.portfolio.works.findIndex(x=>x.id===id);
      if (idx>=0) G.portfolio.works[idx] = res.work;
      renderWorks(); closeModal('work'); toast('작품 수정됨!','success');
    }
  } else {
    // 신규 추가
    const fd = new FormData();
    fd.append('title',    title);
    fd.append('desc',     $('w-desc').value);
    fd.append('category', $('w-cat').value);
    fd.append('type',     type);
    fd.append('tags',     $('w-tags').value);
    if (type==='youtube') fd.append('url', $('w-yt').value);
    else if (window._wFile) fd.append('file', window._wFile);
    else if ($('w-url-input')?.value?.trim()) fd.append('srcUrl', $('w-url-input').value.trim());

    toast('업로드 중...', 'info');
    const res = await fetch('/api/works', { method:'POST', body:fd }).then(r=>r.json());
    if (res.ok) {
      G.portfolio.works.push(res.work);
      renderWorks(); closeModal('work'); toast('작품 추가됨!','success');
    } else toast(res.error||'추가 실패', 'error');
  }
  window._editWorkId = null; window._wFile = null;
}

/* ── 작품 삭제 ── */
async function delWork(id) {
  if (!confirm('이 작품을 삭제할까요?')) return;
  const res = await api(`/api/works/${id}`, 'DELETE');
  if (res.ok) { G.portfolio.works = G.portfolio.works.filter(w=>w.id!==id); renderWorks(); toast('삭제됨','info'); }
}

/* ── 서류 저장 ── */
async function saveDoc() {
  const name = $('d-name').value.trim(); if (!name) { toast('이름을 입력하세요','error'); return; }
  const fd = new FormData();
  fd.append('name', name);
  fd.append('type', $('d-type').value);
  fd.append('desc', $('d-desc').value);
  fd.append('link', $('d-link').value);
  if (window._dFile) fd.append('file', window._dFile);
  toast('업로드 중...', 'info');
  const res = await fetch('/api/docs', { method:'POST', body:fd }).then(r=>r.json());
  if (res.ok) {
    G.portfolio.docs.push(res.doc); renderDocs(); closeModal('doc');
    toast('서류 추가됨!','success');
    $('d-name').value=''; $('d-link').value=''; $('d-desc').value=''; $('d-fn').textContent=''; window._dFile=null;
  } else toast(res.error||'추가 실패','error');
}

/* ── 서류 삭제 ── */
async function delDoc(id) {
  if (!confirm('삭제할까요?')) return;
  const res = await api(`/api/docs/${id}`, 'DELETE');
  if (res.ok) { G.portfolio.docs = G.portfolio.docs.filter(d=>d.id!==id); renderDocs(); toast('삭제됨','info'); }
}

/* ── 작품 뷰어 ── */
function viewWork(id) {
  const w = G.portfolio.works.find(x=>x.id===id); if (!w) return;
  $('viewer-ttl').textContent  = w.title;
  $('viewer-desc').textContent = w.desc || '';
  $('viewer-tags').innerHTML   = (w.tags||[]).map(t=>`<span class="work-tag">${t}</span>`).join('');
  const yid = w.type==='youtube' ? ytId(w.src) : null;
  let html = '';
  if (yid)                       html = `<div style="position:relative;padding-top:56.25%"><iframe src="https://www.youtube.com/embed/${yid}" style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:8px" allowfullscreen></iframe></div>`;
  else if (w.type==='video'&&w.src) html = `<video src="${w.src}" controls style="width:100%;border-radius:8px;max-height:480px"></video>`;
  else if (w.type==='pdf'&&w.src)   html = `<iframe src="${w.src}" style="width:100%;height:500px;border:0;border-radius:8px"></iframe>`;
  else if (w.src)                    html = `<img src="${w.src}" style="width:100%;border-radius:8px;max-height:520px;object-fit:contain"/>`;
  else                               html = `<div style="text-align:center;padding:2rem;color:#90a4ae">미리보기 없음</div>`;
  $('viewer-media').innerHTML = html;
  openModal('viewer');
}

/* ── 섹션 순서 DOM 적용 (designer.js에서도 호출) ── */
function applySectionOrder(order) {
  if (!order||!order.length) return;
  const footer = document.querySelector('footer');
  order.forEach(id => {
    const el = document.getElementById(id);
    if (el && footer) document.body.insertBefore(el, footer);
  });
}

/* ── API 헬퍼 ── */
async function api(url, method='GET', body=null) {
  const opts = { method, headers: { 'Content-Type':'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) toast(data.error||'오류가 발생했습니다.','error');
  return data;
}

/* ── 시작 ── */
init();
