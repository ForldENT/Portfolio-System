// ──────────────────────────────────────────────────────────────
//  public/js/portfolio.js  — 포트폴리오 (신규기능 5종 포함)
// ──────────────────────────────────────────────────────────────

const G = { username:null, me:null, isOwner:false, portfolio:null, filter:'all' };

const $     = id => document.getElementById(id);
const ytId  = url => { const m=(url||'').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/); return m?m[1]:null; };
const toast = (msg, type='info') => {
  const el = document.createElement('div');
  el.className=`toast ${type}`; el.textContent=msg;
  $('toast-wrap').appendChild(el);
  setTimeout(()=>el.remove(),3000);
};

function openModal(n) {
  const P = G.portfolio||{};
  if(n==='profile'){ $('p-name').value=P.name||''; $('p-site').value=P.siteTitle||''; $('p-badge').value=P.badge||''; $('p-desc').value=P.desc||''; $('p-tags').value=(P.tags||[]).join(', '); }
  if(n==='about'){   $('a-text').value=P.aboutText||''; $('a-school').value=P.school||''; $('a-grade').value=P.grade||''; $('a-interest').value=P.interest||''; $('a-goal').value=P.goal||''; }
  if(n==='contact'){ $('c-desc').value=P.contactDesc||''; $('c-email').value=P.email||''; $('c-phone').value=P.phone||''; $('c-github').value=P.github||''; $('c-youtube').value=P.youtube||''; $('c-insta').value=P.instagram||''; }
  $(`modal-${n}`).classList.add('open');
}
function closeModal(n){ $(`modal-${n}`)?.classList.remove('open'); }

document.addEventListener('click', e=>{
  const x=e.target.closest('[data-close]'); if(x) closeModal(x.dataset.close);
  document.querySelectorAll('.modal-overlay').forEach(o=>{ if(e.target===o) o.classList.remove('open'); });
});

// ── 초기화 ──────────────────────────────────────────────────
async function init() {
  G.username = location.pathname.split('/u/')[1]?.split('/')[0];
  if(!G.username) return;
  try { const me=await fetch('/auth/me').then(r=>r.json()); if(me.loggedIn) G.me=me; } catch{}
  try {
    const data=await fetch(`/api/users/${G.username}`).then(r=>r.json());
    if(data.error){ alert('유저를 찾을 수 없습니다.'); return; }
    G.portfolio=data.portfolio;
  } catch{ return; }
  G.isOwner = G.me && G.me.username.toLowerCase()===G.username.toLowerCase();
  renderAll();
  if(G.isOwner) setupOwner();
}

// ── 편집 버튼 표시 ──────────────────────────────────────────
function showEditButtons(){
  document.querySelectorAll('.edit-only').forEach(el=>{
    el.style.cssText='display:inline-flex!important;visibility:visible!important;opacity:1!important';
  });
  $('photo-overlay').style.cssText='display:flex!important;visibility:visible!important';
  $('banner-change-btn').style.cssText='display:flex!important;visibility:visible!important';
}

// ── 전체 렌더 ──────────────────────────────────────────────
function renderAll() {
  const P=G.portfolio||{}, dz=P.design||{};
  document.documentElement.style.setProperty('--accent', dz.accentColor||'#1e88e5');
  document.documentElement.style.setProperty('--radius', (dz.cardRadius||12)+'px');
  document.documentElement.style.setProperty('--hero-h', (dz.heroHeight||92)+'vh');
  document.title=$('nav-logo').textContent=P.siteTitle||'포트폴리오';
  $('hero-badge').textContent=P.badge||'';
  const parts=(P.name||'이름').split(' ');
  $('hero-name').innerHTML=parts.length>1?`${parts[0]} <span>${parts.slice(1).join(' ')}</span>`:`<span>${parts[0]}</span>`;
  $('hero-desc').textContent=P.desc||'';
  $('hero-tags').innerHTML=(P.tags||[]).map(t=>`<span class="hero-tag">${t}</span>`).join('');

  // ① 배너 사진 적용
  const bg=$('hero-banner-bg');
  if(P.bannerSrc){ bg.style.backgroundImage=`url('${P.bannerSrc}')`; $('hero-overlay').style.opacity='1'; }
  else { bg.style.backgroundImage='none'; }

  // 자기소개
  $('about-text').innerHTML=(P.aboutText||'').replace(/\n/g,'<br>');
  $('fact-school').textContent=P.school||'-'; $('fact-grade').textContent=P.grade||'-';
  $('fact-interest').textContent=P.interest||'-'; $('fact-goal').textContent=P.goal||'-';

  // ② 프로필 사진 → 홈 목록 사진도 자동 반영 (서버 DB에서 갱신됨)
  if(P.photoSrc){
    $('photo-ph').style.display='none';
    $('about-photo').src=P.photoSrc; $('about-photo').style.display='block';
  } else {
    $('photo-ph').style.display='flex'; $('about-photo').style.display='none';
  }

  // ③ 연락처 (전화번호 + 유튜브 추가)
  $('contact-desc').textContent=P.contactDesc||'';
  $('contact-links').innerHTML=[
    P.email    && `<a href="mailto:${P.email}" class="contact-link">📧 ${P.email}</a>`,
    P.phone    && `<a href="tel:${P.phone}" class="contact-link">📞 ${P.phone}</a>`,
    P.github   && `<a href="${P.github}" target="_blank" class="contact-link">🐱 GitHub</a>`,
    P.youtube  && `<a href="${P.youtube}" target="_blank" class="contact-link">▶️ YouTube</a>`,
    P.instagram&& `<a href="${P.instagram}" target="_blank" class="contact-link">📸 Instagram</a>`,
  ].filter(Boolean).join('');

  $('footer-txt').textContent=`© ${new Date().getFullYear()} ${P.name||''} 포트폴리오`;
  renderWorks(); renderProjects(); renderDocs();
  if(typeof applyDesignAll==='function') applyDesignAll(dz);
  if(dz.sectionOrder) applySectionOrder(dz.sectionOrder);
}

// ── 작품 렌더 ──────────────────────────────────────────────
const TL={image:'이미지',youtube:'유튜브',video:'영상',pdf:'PDF'};
const TI={image:'🖼️',youtube:'▶️',video:'🎬',pdf:'📄'};

function renderWorks(){
  const grid=$('work-grid'), all=G.portfolio?.works||[];
  const list=G.filter==='all'?all:all.filter(w=>w.category===G.filter);
  if(!list.length){ grid.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><div class="ei">🎨</div><p>${G.isOwner?'"+ 작품 추가"로 첫 작품을 올려보세요!':'아직 작품이 없습니다.'}</p></div>`; return; }
  grid.innerHTML=list.map(w=>{
    const yid=w.type==='youtube'?ytId(w.src):null;
    const thumb=yid?`<img src="https://img.youtube.com/vi/${yid}/hqdefault.jpg" alt="${w.title}"/>`
      :(w.src&&(w.type==='image'||w.type==='video'))?`<img src="${w.src}" alt="${w.title}"/>`
      :`<span style="font-size:2.2rem">${TI[w.type]||'📁'}</span>`;
    const btns=G.isOwner?`<div class="card-actions" style="display:flex"><button class="card-action-btn" onclick="event.stopPropagation();editWork('${w.id}')">✏️</button><button class="card-action-btn" style="color:#ff7070" onclick="event.stopPropagation();delWork('${w.id}')">🗑️</button></div>`:'';
    return `<div class="work-card" onclick="viewWork('${w.id}')"><div class="work-thumb">${thumb}<span class="work-badge">${TL[w.type]||w.type}</span></div><div class="work-body"><h3 class="work-title">${w.title}</h3><p class="work-desc">${w.desc||''}</p><div class="work-tags">${(w.tags||[]).map(t=>`<span class="work-tag">${t}</span>`).join('')}</div></div>${btns}</div>`;
  }).join('');
}

// ④ 프로젝트 렌더 (알집 업로드)
function renderProjects(){
  const grid=$('project-grid'), projs=G.portfolio?.projects||[];
  if(!projs.length){
    grid.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><div class="ei">📦</div><p>${G.isOwner?'"+ 프로젝트 추가"로 프로젝트 파일을 올려보세요!':'등록된 프로젝트가 없습니다.'}</p></div>`;
    return;
  }
  grid.innerHTML=projs.map(p=>{
    const btns=G.isOwner?`<div class="project-actions" style="display:flex"><button class="card-action-btn" style="color:#ff7070" onclick="delProject('${p.id}')">🗑️</button></div>`:'';
    const dlBtn=p.src?`<a href="${p.src}" download class="project-dl">⬇️ 다운로드</a>`:
                p.link?`<a href="${p.link}" target="_blank" class="project-dl">🔗 열기</a>`:'';
    return `<div class="project-card"><div class="project-thumb">📦</div><div class="project-body"><h3 class="project-title">${p.name}</h3><p class="project-desc">${p.desc||''}</p><div class="project-tags">${(p.tags||[]).map(t=>`<span class="project-tag">${t}</span>`).join('')}</div>${dlBtn}</div>${btns}</div>`;
  }).join('');
}

// 서류 렌더
function renderDocs(){
  const list=$('doc-list'), docs=G.portfolio?.docs||[];
  const ICO={pdf:'📄',ppt:'📊',img:'🖼️'};
  if(!docs.length){ list.innerHTML=`<div class="empty-state"><div class="ei">📂</div><p>${G.isOwner?'"+ 서류 추가"로 등록해보세요!':'등록된 서류가 없습니다.'}</p></div>`; return; }
  list.innerHTML=docs.map(d=>`
    <div class="doc-item">
      <div class="doc-icon ${d.type}">${ICO[d.type]||'📎'}</div>
      <div class="doc-info"><div class="doc-name">${d.name}</div><div class="doc-meta">${d.type.toUpperCase()}${d.desc?' · '+d.desc:''}</div></div>
      <div class="doc-actions">
        ${d.src?`<a href="${d.src}" target="_blank" class="btn btn-primary btn-sm">보기</a>`:''}
        ${G.isOwner?`<button class="btn btn-danger btn-sm" onclick="delDoc('${d.id}')">삭제</button>`:''}
      </div>
    </div>`).join('');
}

$('filter-row').addEventListener('click',e=>{
  const btn=e.target.closest('.filter-btn'); if(!btn) return;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.toggle('active',b===btn));
  G.filter=btn.dataset.f; renderWorks();
});

// ── 오너 세팅 ────────────────────────────────────────────────
function setupOwner(){
  showEditButtons();

  $('nav-edit-btn').onclick=()=>openModal('profile');
  $('save-profile').onclick=saveProfile;
  $('save-about').onclick=saveAbout;
  $('w-save-btn').onclick=saveWork;
  $('save-doc').onclick=saveDoc;
  $('save-contact').onclick=saveContact;
  $('proj-save-btn').onclick=saveProject;

  $('btn-add-work').onclick=openWorkAdd;
  $('btn-add-doc').onclick=()=>openModal('doc');
  $('btn-edit-about').onclick=()=>openModal('about');
  $('btn-edit-contact').onclick=()=>openModal('contact');
  $('btn-add-project').onclick=openProjectAdd;

  // ① 배너 사진 변경
  $('banner-change-btn').onclick = () => $('banner-file').click();
  $('banner-file').addEventListener('change',async e=>{
    const f=e.target.files[0]; if(!f) return;
    const fd=new FormData(); fd.append('photo',f);
    toast('배너 업로드 중...','info');
    const res=await fetch('/api/portfolio/banner',{method:'POST',body:fd}).then(r=>r.json());
    if(res.ok){ G.portfolio.bannerSrc=res.url; renderAll(); toast('배너 변경됨!','success'); }
    else toast(res.error||'업로드 실패','error');
    e.target.value='';
  });

  // ② 프로필 사진 변경 (홈 화면에도 자동 반영 — DB에서 읽음)
  $('photo-overlay').addEventListener('click',()=>$('photo-file').click());
  $('photo-file').addEventListener('change',async e=>{
    const f=e.target.files[0]; if(!f) return;
    const fd=new FormData(); fd.append('photo',f);
    toast('사진 업로드 중...','info');
    const res=await fetch('/api/portfolio/photo',{method:'POST',body:fd}).then(r=>r.json());
    if(res.ok){ G.portfolio.photoSrc=res.url; renderAll(); toast('사진 변경됨! 홈 화면에도 반영됩니다.','success'); }
    else toast(res.error||'업로드 실패','error');
    e.target.value='';
  });

  // 작품 파일
  $('w-upload-zone').addEventListener('click',()=>$('w-file').click());
  $('w-file').addEventListener('change',e=>{
    const f=e.target.files[0]; if(!f) return;
    window._wFile=f; $('w-fn').textContent='✅ '+f.name;
    if(f.type.startsWith('image/')){ const r=new FileReader(); r.onload=ev=>{ const ci=$('w-cur-img'); if(ci) ci.src=ev.target.result; }; r.readAsDataURL(f); }
  });
  $('w-type').addEventListener('change',toggleWType);

  // 서류 파일
  $('d-upload-zone').addEventListener('click',()=>$('d-file').click());
  $('d-file').addEventListener('change',e=>{ const f=e.target.files[0]; if(!f) return; window._dFile=f; $('d-fn').textContent='✅ '+f.name; });

  // ④ 프로젝트 파일
  $('proj-upload-zone').addEventListener('click',()=>$('proj-file').click());
  $('proj-file').addEventListener('change',e=>{ const f=e.target.files[0]; if(!f) return; window._projFile=f; $('proj-fn').textContent='✅ '+f.name; });

  // 디자이너 로드
  const s=document.createElement('script'); s.src='/js/designer.js';
  s.onload=()=>{ if(typeof applyDesignAll==='function') applyDesignAll(G.portfolio?.design||{}); };
  document.body.appendChild(s);
}

function toggleWType(){
  const t=$('w-type').value;
  $('w-yt-g').style.display=t==='youtube'?'':'none';
  $('w-file-g').style.display=t!=='youtube'?'':'none';
}

// ── 저장: 프로필 ─────────────────────────────────────────────
async function saveProfile(){
  const res=await api('/api/portfolio','PATCH',{
    name:$('p-name').value, siteTitle:$('p-site').value,
    badge:$('p-badge').value, desc:$('p-desc').value,
    tags:$('p-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
  });
  if(res.ok){ G.portfolio=Object.assign({},G.portfolio,res.portfolio); renderAll(); closeModal('profile'); toast('프로필 저장됨!','success'); }
}

// ── 저장: 소개 ───────────────────────────────────────────────
async function saveAbout(){
  const res=await api('/api/portfolio','PATCH',{
    aboutText:$('a-text').value, school:$('a-school').value,
    grade:$('a-grade').value, interest:$('a-interest').value, goal:$('a-goal').value,
  });
  if(res.ok){ G.portfolio=Object.assign({},G.portfolio,res.portfolio); renderAll(); closeModal('about'); toast('소개 저장됨!','success'); }
}

// ③ 저장: 연락처 (전화번호 + 유튜브)
async function saveContact(){
  const updates = {
    contactDesc: $('c-desc').value,
    email:       $('c-email').value,
    phone:       $('c-phone').value,
    github:      $('c-github').value,
    youtube:     $('c-youtube').value,
    instagram:   $('c-insta').value,
  };
  const res = await api('/api/portfolio','PATCH', updates);
  if(res.ok){
    // 서버 응답으로 받은 portfolio로 업데이트 (없는 필드는 기존 값 유지)
    G.portfolio = Object.assign({}, G.portfolio, res.portfolio || updates);
    // phone, youtube가 res.portfolio에 없을 경우 직접 세팅
    if(!G.portfolio.phone)   G.portfolio.phone   = updates.phone;
    if(!G.portfolio.youtube) G.portfolio.youtube = updates.youtube;
    renderAll();
    closeModal('contact');
    toast('연락처 저장됨!','success');
  }
}

// ── 작품 추가/수정 ───────────────────────────────────────────
function openWorkAdd(){
  window._editWorkId=null; window._wFile=null;
  $('work-ttl').textContent='작품 추가'; $('w-save-btn').textContent='추가';
  $('w-id').value=$('w-title').value=$('w-desc').value=$('w-tags').value=$('w-yt').value='';
  $('w-fn').textContent=''; $('w-cat').value='design'; $('w-type').value='image';
  $('w-cur-wrap').style.display='none'; toggleWType(); openModal('work');
}
function editWork(id){
  const w=G.portfolio.works.find(x=>x.id===id); if(!w) return;
  window._editWorkId=id; window._wFile=null;
  $('work-ttl').textContent='작품 수정'; $('w-save-btn').textContent='저장';
  $('w-id').value=id; $('w-title').value=w.title; $('w-desc').value=w.desc||'';
  $('w-cat').value=w.category||'design'; $('w-type').value=w.type||'image';
  $('w-tags').value=(w.tags||[]).join(', '); $('w-fn').textContent='';
  if(w.type==='youtube'){ $('w-yt').value=w.src||''; }
  else if(w.src){ $('w-cur-wrap').style.display='flex'; $('w-cur-img').src=w.src; }
  else { $('w-cur-wrap').style.display='none'; }
  toggleWType(); openModal('work');
}
async function saveWork(){
  const title=$('w-title').value.trim(); if(!title){ toast('제목을 입력하세요','error'); return; }
  const id=window._editWorkId, type=$('w-type').value;
  if(id){
    if(window._wFile&&type!=='youtube'){
      const fd=new FormData(); fd.append('file',window._wFile);
      const r=await fetch(`/api/works/${id}/image`,{method:'PATCH',body:fd}).then(r=>r.json());
      if(r.ok){ const w=G.portfolio.works.find(x=>x.id===id); if(w) w.src=r.src; }
    }
    const res=await api(`/api/works/${id}`,'PATCH',{ title, desc:$('w-desc').value, category:$('w-cat').value, tags:$('w-tags').value });
    if(res.ok){ const idx=G.portfolio.works.findIndex(x=>x.id===id); if(idx>=0) G.portfolio.works[idx]=res.work; renderWorks(); closeModal('work'); toast('작품 수정됨!','success'); }
  } else {
    const fd=new FormData();
    fd.append('title',title); fd.append('desc',$('w-desc').value);
    fd.append('category',$('w-cat').value); fd.append('type',type); fd.append('tags',$('w-tags').value);
    if(type==='youtube') fd.append('url',$('w-yt').value);
    else if(window._wFile) fd.append('file',window._wFile);
    else if($('w-url-input')?.value?.trim()) fd.append('srcUrl',$('w-url-input').value.trim());
    toast('업로드 중...','info');
    const res=await fetch('/api/works',{method:'POST',body:fd}).then(r=>r.json());
    if(res.ok){ G.portfolio.works.push(res.work); renderWorks(); closeModal('work'); toast('작품 추가됨!','success'); }
    else toast(res.error||'추가 실패','error');
  }
  window._editWorkId=null; window._wFile=null;
}
async function delWork(id){
  if(!confirm('이 작품을 삭제할까요?')) return;
  const res=await api(`/api/works/${id}`,'DELETE');
  if(res.ok){ G.portfolio.works=G.portfolio.works.filter(w=>w.id!==id); renderWorks(); toast('삭제됨','info'); }
}

// ④ 프로젝트 추가/삭제
function openProjectAdd(){
  window._projFile=null;
  $('proj-ttl').textContent='프로젝트 추가'; $('proj-save-btn').textContent='추가';
  $('proj-id').value=$('proj-name').value=$('proj-desc').value=$('proj-tags').value=$('proj-link').value='';
  $('proj-fn').textContent=''; openModal('project');
}
async function saveProject(){
  const name=$('proj-name').value.trim(); if(!name){ toast('이름을 입력하세요','error'); return; }
  const fd=new FormData();
  fd.append('name',name); fd.append('desc',$('proj-desc').value);
  fd.append('tags',$('proj-tags').value); fd.append('link',$('proj-link').value);
  if(window._projFile) fd.append('file',window._projFile);
  toast('업로드 중...','info');
  const res=await fetch('/api/projects',{method:'POST',body:fd}).then(r=>r.json());
  if(res.ok){
    if(!G.portfolio.projects) G.portfolio.projects=[];
    G.portfolio.projects.push(res.project); renderProjects(); closeModal('project');
    $('proj-name').value=$('proj-desc').value=$('proj-tags').value=$('proj-link').value='';
    $('proj-fn').textContent=''; window._projFile=null;
    toast('프로젝트 추가됨!','success');
  } else toast(res.error||'추가 실패','error');
}
async function delProject(id){
  if(!confirm('삭제할까요?')) return;
  const res=await api(`/api/projects/${id}`,'DELETE');
  if(res.ok){ G.portfolio.projects=G.portfolio.projects.filter(p=>p.id!==id); renderProjects(); toast('삭제됨','info'); }
}

// 서류 저장/삭제
async function saveDoc(){
  const name=$('d-name').value.trim(); if(!name){ toast('이름을 입력하세요','error'); return; }
  const fd=new FormData();
  fd.append('name',name); fd.append('type',$('d-type').value);
  fd.append('desc',$('d-desc').value); fd.append('link',$('d-link').value);
  if(window._dFile) fd.append('file',window._dFile);
  toast('업로드 중...','info');
  const res=await fetch('/api/docs',{method:'POST',body:fd}).then(r=>r.json());
  if(res.ok){
    G.portfolio.docs.push(res.doc); renderDocs(); closeModal('doc');
    $('d-name').value=$('d-link').value=$('d-desc').value=''; $('d-fn').textContent=''; window._dFile=null;
    toast('서류 추가됨!','success');
  } else toast(res.error||'추가 실패','error');
}
async function delDoc(id){
  if(!confirm('삭제할까요?')) return;
  const res=await api(`/api/docs/${id}`,'DELETE');
  if(res.ok){ G.portfolio.docs=G.portfolio.docs.filter(d=>d.id!==id); renderDocs(); toast('삭제됨','info'); }
}

// 작품 뷰어
function viewWork(id){
  const w=G.portfolio?.works?.find(x=>x.id===id); if(!w) return;
  $('viewer-ttl').textContent=w.title; $('viewer-desc').textContent=w.desc||'';
  $('viewer-tags').innerHTML=(w.tags||[]).map(t=>`<span class="work-tag">${t}</span>`).join('');
  const yid=w.type==='youtube'?ytId(w.src):null;
  let html='';
  if(yid) html=`<div style="position:relative;padding-top:56.25%"><iframe src="https://www.youtube.com/embed/${yid}" style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:8px" allowfullscreen></iframe></div>`;
  else if(w.type==='video'&&w.src) html=`<video src="${w.src}" controls style="width:100%;border-radius:8px"></video>`;
  else if(w.type==='pdf'&&w.src) html=`<iframe src="${w.src}" style="width:100%;height:500px;border:0;border-radius:8px"></iframe>`;
  else if(w.src) html=`<img src="${w.src}" style="width:100%;border-radius:8px;max-height:520px;object-fit:contain"/>`;
  else html=`<div style="text-align:center;padding:2rem;color:#90a4ae">미리보기 없음</div>`;
  $('viewer-media').innerHTML=html; openModal('viewer');
}

// 섹션 순서 — 누락된 섹션 자동 보완 후 적용
function applySectionOrder(order){
  if(!order||!order.length) return;
  const ALL = ['about','portfolio','resume','projects','contact'];
  // DB에 없는 섹션은 contact 바로 앞에 자동 추가
  ALL.forEach(id => {
    if(!order.includes(id)){
      const ci = order.indexOf('contact');
      if(ci > -1) order.splice(ci, 0, id);
      else order.push(id);
    }
  });
  const footer = document.querySelector('footer');
  order.forEach(id => { const el=document.getElementById(id); if(el&&footer) document.body.insertBefore(el,footer); });
}

// API 헬퍼
async function api(url,method='GET',body=null){
  const opts={method,headers:{'Content-Type':'application/json'}};
  if(body) opts.body=JSON.stringify(body);
  const res=await fetch(url,opts); const data=await res.json();
  if(!res.ok) toast(data.error||'오류가 발생했습니다.','error');
  return data;
}

init();
