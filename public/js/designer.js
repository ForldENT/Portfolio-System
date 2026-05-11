// ──────────────────────────────────────────────────────────────
//  public/js/designer.js  — 디자인 커스터마이저
//  portfolio.js의 setupOwner()에서 동적 로드됨
// ──────────────────────────────────────────────────────────────

/* ── 테마 정의 ── */
const THEMES = {
  dark:    { name:'다크 네이비',   emoji:'🌙', accent:'#1e88e5', bg:'#0d1b2a', bar:'#1e88e5',   lines:['#1e88e5','#ffffff','#546e7a'], lbg:'#1a2e45', lc:'#90a4ae', vars:{'--pg-hero-bg':'#0d1b2a','--pg-sec-a':'#ffffff','--pg-sec-b':'#f0f4f8','--pg-sec-c':'#0d1b2a','--pg-card':'#ffffff','--pg-border':'#e5e7eb','--pg-text':'#1a2e45','--pg-text-inv':'#ffffff','--pg-muted':'#90a4ae'} },
  cyber:   { name:'사이버펑크',    emoji:'⚡', accent:'#c026d3', bg:'#0a0a0f', bar:'#c026d3',   lines:['#c026d3','#7c3aed','#2d1b69'], lbg:'#12121f', lc:'#7b68cc', vars:{'--pg-hero-bg':'#0a0a0f','--pg-sec-a':'#0f0f1a','--pg-sec-b':'#070710','--pg-sec-c':'#0a0a0f','--pg-card':'#12121f','--pg-border':'#2d1b69','--pg-text':'#e0d7ff','--pg-text-inv':'#e0d7ff','--pg-muted':'#7b68cc'} },
  light:   { name:'라이트 클린',   emoji:'☀️', accent:'#2563eb', bg:'#1a1a2e', bar:'#2563eb',   lines:['#2563eb','#111827','#d1d5db'], lbg:'#f5f5f5', lc:'#6b7280', vars:{'--pg-hero-bg':'#1a1a2e','--pg-sec-a':'#ffffff','--pg-sec-b':'#f5f5f5','--pg-sec-c':'#1a1a2e','--pg-card':'#ffffff','--pg-border':'#e5e7eb','--pg-text':'#111827','--pg-text-inv':'#ffffff','--pg-muted':'#6b7280'} },
  retro:   { name:'레트로 게임',   emoji:'🕹️', accent:'#ff8c00', bg:'#1a0a00', bar:'#ff8c00',   lines:['#ff8c00','#ffe0a0','#5a3000'], lbg:'#2a1500', lc:'#a07040', vars:{'--pg-hero-bg':'#1a0a00','--pg-sec-a':'#1f1200','--pg-sec-b':'#150900','--pg-sec-c':'#1a0a00','--pg-card':'#2a1500','--pg-border':'#5a3000','--pg-text':'#ffe0a0','--pg-text-inv':'#ffe0a0','--pg-muted':'#a07040'} },
  nature:  { name:'네이처 그린',   emoji:'🌿', accent:'#2e7d32', bg:'#0d2a1a', bar:'#2e7d32',   lines:['#4caf50','#a5d6a7','#1b3a20'], lbg:'#f0faf0', lc:'#66a86a', vars:{'--pg-hero-bg':'#0d2a1a','--pg-sec-a':'#ffffff','--pg-sec-b':'#f0faf0','--pg-sec-c':'#0d2a1a','--pg-card':'#ffffff','--pg-border':'#c8e6c9','--pg-text':'#1b3a20','--pg-text-inv':'#e8f5e9','--pg-muted':'#66a86a'} },
  minimal: { name:'울트라 미니멀', emoji:'◻️', accent:'#111111', bg:'#111111', bar:'#ffffff',   lines:['#ffffff','#aaaaaa','#555555'], lbg:'#fafafa', lc:'#999999', vars:{'--pg-hero-bg':'#111111','--pg-sec-a':'#ffffff','--pg-sec-b':'#fafafa','--pg-sec-c':'#111111','--pg-card':'#ffffff','--pg-border':'#eeeeee','--pg-text':'#111111','--pg-text-inv':'#ffffff','--pg-muted':'#999999'} },
};

const FONTS = [
  { id:'pretendard', name:'Pretendard',    preview:'가나다 ABC 123', title:"'Nanum Myeongjo',serif",    body:"'Pretendard',sans-serif",     url: null },
  { id:'noto',       name:'Noto Sans KR',  preview:'가나다 ABC 123', title:"'Noto Serif KR',serif",     body:"'Noto Sans KR',sans-serif",   url:'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&family=Noto+Serif+KR:wght@700&display=swap' },
  { id:'gothic',     name:'Gothic A1',     preview:'가나다 ABC 123', title:"'Black Han Sans',sans-serif",body:"'Gothic A1',sans-serif",      url:'https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Gothic+A1:wght@400;700&display=swap' },
  { id:'gamja',      name:'감자꽃 손글씨', preview:'가나다 ABC 123', title:"'Gamja Flower',cursive",    body:"'Nanum Gothic',sans-serif",   url:'https://fonts.googleapis.com/css2?family=Gamja+Flower&family=Nanum+Gothic:wght@400;700&display=swap' },
  { id:'ibm',        name:'IBM Plex',      preview:'가나다 ABC 123', title:"'IBM Plex Serif',serif",    body:"'IBM Plex Sans KR',sans-serif",url:'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;700&family=IBM+Plex+Serif:wght@700&display=swap' },
];

const LAYOUTS = [
  { id:'default', label:'기본형',   cols:[1,1,1],   css:'repeat(auto-fill,minmax(280px,1fr))' },
  { id:'wide',    label:'와이드',   cols:[2,1],     css:'repeat(auto-fill,minmax(340px,1fr))' },
  { id:'masonry', label:'매스너리', cols:[1,1],     css:'repeat(2,1fr)' },
  { id:'list',    label:'리스트',   cols:[1],       css:'1fr' },
  { id:'compact', label:'컴팩트',   cols:[1,1,1,1], css:'repeat(auto-fill,minmax(200px,1fr))' },
  { id:'feature', label:'피처드',   cols:[3,1,1],   css:'repeat(auto-fill,minmax(260px,1fr))' },
];

const BG_PATTERNS = [
  { id:'none',     label:'없음' },
  { id:'dots',     label:'점 패턴' },
  { id:'grid',     label:'그리드' },
  { id:'diagonal', label:'대각선' },
  { id:'noise',    label:'노이즈' },
  { id:'gradient', label:'그라디언트' },
];

const SECTIONS_META = [
  { id:'about',     label:'자기소개',         icon:'👤' },
  { id:'portfolio', label:'포트폴리오',        icon:'🎨' },
  { id:'resume',    label:'자기소개서 & 서류', icon:'📄' },
  { id:'projects',  label:'프로젝트',          icon:'📦' },
  { id:'contact',   label:'연락처',            icon:'📬' },
];

const PRESETS = ['#1e88e5','#e94560','#9c27b0','#00897b','#2e7d32','#f57f17','#e65100','#ec407a','#0097a7','#5c6bc0','#ff6f00','#37474f'];

/* ── 현재 디자인 상태 ── */
const DEFAULT_ORDER = ['about','portfolio','resume','projects','contact'];
const ALL_SECTION_IDS = SECTIONS_META.map(s => s.id);

let DS = Object.assign({
  theme:'dark', accentColor:'#1e88e5', font:'pretendard',
  layout:'default', bgPattern:'none', heroHeight:92, cardRadius:12,
  animOn:true, shadowOn:true, borderOn:true,
  sectionOrder: [...DEFAULT_ORDER],
}, G.portfolio?.design || {});

// DB에 저장된 sectionOrder에 누락된 섹션이 있으면 자동으로 추가
(function fixSectionOrder() {
  const order = DS.sectionOrder || [];
  ALL_SECTION_IDS.forEach(id => {
    if (!order.includes(id)) {
      // contact 바로 앞에 삽입 (없으면 맨 뒤)
      const contactIdx = order.indexOf('contact');
      if (contactIdx > -1) order.splice(contactIdx, 0, id);
      else order.push(id);
    }
  });
  DS.sectionOrder = order;
})();

let liveTimer = null;
const showLive = () => {
  document.getElementById('live-badge').classList.add('show');
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => document.getElementById('live-badge').classList.remove('show'), 1600);
};

/* ── FAB 표시 및 이벤트 ── */
const fab = document.getElementById('design-fab');
fab.classList.add('visible');
fab.onclick = () => { openDP(); renderDP(); };
document.getElementById('dp-close').onclick  = closeDP;
document.getElementById('dp-overlay').onclick = closeDP;

function openDP() { document.getElementById('dp-panel').classList.add('open'); document.getElementById('dp-overlay').classList.add('open'); }
function closeDP() { document.getElementById('dp-panel').classList.remove('open'); document.getElementById('dp-overlay').classList.remove('open'); }

/* ── 탭 전환 ── */
document.querySelectorAll('.dp-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.dp-tab').forEach(t => t.classList.toggle('active', t===tab));
    document.querySelectorAll('.dp-pane').forEach(p => p.style.display = 'none');
    document.getElementById('pane-' + tab.dataset.tab).style.display = '';
  });
});

/* ── 패널 전체 렌더 ── */
function renderDP() {
  renderThemeGrid(); renderColorPane(); renderFontList();
  renderLayoutGrid(); renderBgGrid(); renderSectionOrder(); syncControls();
}

function renderThemeGrid() {
  document.getElementById('theme-grid').innerHTML = Object.entries(THEMES).map(([id, t]) => `
    <div class="theme-card ${DS.theme===id?'selected':''}" data-tid="${id}"
         onclick="applyTheme('${id}');document.querySelectorAll('.theme-card').forEach(c=>c.classList.toggle('selected',c.dataset.tid==='${id}'))">
      <div class="t-prev" style="background:${t.bg}">
        <div class="t-bar" style="background:${t.bar}"></div>
        <div class="t-hero">${t.lines.map((c,i)=>`<div class="t-line" style="background:${c};width:${60-i*14}%;opacity:${1-i*.2}"></div>`).join('')}</div>
      </div>
      <div class="t-lbl" style="background:${t.lbg};color:${t.lc}">${t.emoji} ${t.name}</div>
    </div>`).join('');
}

function renderColorPane() {
  document.getElementById('acc-dot').style.background = DS.accentColor;
  document.getElementById('acc-hex').textContent      = DS.accentColor;
  document.getElementById('acc-picker').value         = DS.accentColor;
  document.getElementById('presets').innerHTML = PRESETS.map(c =>
    `<div class="preset-dot" style="background:${c}" data-pc="${c}" title="${c}"></div>`
  ).join('');
}

function renderFontList() {
  document.getElementById('font-list').innerHTML = FONTS.map(f => `
    <div class="font-opt ${DS.font===f.id?'selected':''}" data-fid="${f.id}"
         onclick="applyFont('${f.id}');document.querySelectorAll('.font-opt').forEach(x=>x.classList.toggle('selected',x.dataset.fid==='${f.id}'))">
      <div>
        <div class="fn" style="font-family:${f.body}">${f.name}</div>
        <div class="fp" style="font-family:${f.body}">${f.preview}</div>
      </div>
      <div class="f-chk">✓</div>
    </div>`).join('');
}

function renderLayoutGrid() {
  document.getElementById('layout-grid').innerHTML = LAYOUTS.map(l => `
    <div class="layout-opt ${DS.layout===l.id?'selected':''}" data-lid="${l.id}"
         onclick="applyLayout('${l.id}');document.querySelectorAll('.layout-opt').forEach(x=>x.classList.toggle('selected',x.dataset.lid==='${l.id}'))">
      <div class="lt">${l.cols.map(w=>`<div class="lt-c" style="flex:${w}"></div>`).join('')}</div>
      <div class="ll">${l.label}</div>
    </div>`).join('');
}

function renderBgGrid() {
  const hex = DS.accentColor, base = THEMES[DS.theme]?.bg || '#0d1b2a';
  const bgs = {
    none:     `background:${base}`,
    dots:     `background:${base};background-image:radial-gradient(${hex}55 1px,transparent 1px);background-size:18px 18px`,
    grid:     `background:${base};background-image:linear-gradient(${hex}22 1px,transparent 1px),linear-gradient(90deg,${hex}22 1px,transparent 1px);background-size:28px 28px`,
    diagonal: `background:${base};background-image:repeating-linear-gradient(45deg,${hex}18 0,${hex}18 1px,transparent 0,transparent 50%);background-size:16px 16px`,
    noise:    `background:${base}`,
    gradient: `background:linear-gradient(135deg,${base} 0%,${hex}44 50%,${base} 100%)`,
  };
  document.getElementById('bg-grid').innerHTML = BG_PATTERNS.map(bg => `
    <div class="bg-opt ${DS.bgPattern===bg.id?'selected':''}" data-bid="${bg.id}"
         style="${bgs[bg.id]||''}"
         onclick="applyBgPattern('${bg.id}');document.querySelectorAll('.bg-opt').forEach(x=>x.classList.toggle('selected',x.dataset.bid==='${bg.id}'))">
      ${bg.label}
    </div>`).join('');
}

function renderSectionOrder() {
  const order = DS.sectionOrder || SECTIONS_META.map(s=>s.id);
  document.getElementById('so-list').innerHTML = order.map((id, idx) => {
    const m = SECTIONS_META.find(s=>s.id===id) || { id, label:id, icon:'📌' };
    return `
      <div class="so-item" draggable="true" data-sid="${id}" data-idx="${idx}">
        <span class="so-handle">☰</span>
        <span class="so-icon">${m.icon}</span>
        <span class="so-lbl">${m.label}</span>
        <span class="so-arrows">
          <button class="so-btn" onclick="moveSection('${id}',-1)">↑</button>
          <button class="so-btn" onclick="moveSection('${id}',1)">↓</button>
        </span>
      </div>`;
  }).join('');
  bindSectionDrag();
}

function bindSectionDrag() {
  let src = null;
  document.getElementById('so-list').querySelectorAll('.so-item').forEach(item => {
    item.addEventListener('dragstart', e => { src = item.dataset.sid; item.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; });
    item.addEventListener('dragend',   () => { item.classList.remove('dragging'); document.querySelectorAll('.so-item').forEach(i=>i.classList.remove('over')); });
    item.addEventListener('dragover',  e => { e.preventDefault(); document.querySelectorAll('.so-item').forEach(i=>i.classList.remove('over')); item.classList.add('over'); });
    item.addEventListener('drop', e => {
      e.preventDefault();
      const tgt = item.dataset.sid; if (src===tgt) return;
      const arr = DS.sectionOrder, si = arr.indexOf(src), ti = arr.indexOf(tgt);
      arr.splice(si,1); arr.splice(ti,0,src);
      applySectionOrder(arr); renderSectionOrder(); showLive();
    });
  });
}

function moveSection(id, dir) {
  const arr = DS.sectionOrder, i = arr.indexOf(id);
  if (dir===-1 && i>0)              [arr[i-1],arr[i]] = [arr[i],arr[i-1]];
  if (dir===1  && i<arr.length-1)   [arr[i+1],arr[i]] = [arr[i],arr[i+1]];
  applySectionOrder(arr); renderSectionOrder(); showLive();
}

function syncControls() {
  document.getElementById('sl-hero').value   = DS.heroHeight;  document.getElementById('vl-hero').textContent   = DS.heroHeight+'vh';
  document.getElementById('sl-radius').value = DS.cardRadius;  document.getElementById('vl-radius').textContent = DS.cardRadius+'px';
  document.getElementById('sl-hover').value  = 4;              document.getElementById('vl-hover').textContent  = '4px';
  document.getElementById('tog-anim').checked   = DS.animOn;
  document.getElementById('tog-shadow').checked = DS.shadowOn;
  document.getElementById('tog-border').checked = DS.borderOn;
}

/* ── 슬라이더/토글 이벤트 ── */
document.getElementById('acc-picker').addEventListener('input', e => {
  DS.accentColor = e.target.value;
  document.getElementById('acc-dot').style.background = e.target.value;
  document.getElementById('acc-hex').textContent = e.target.value;
  document.documentElement.style.setProperty('--accent', e.target.value);
  renderBgGrid(); showLive();
});

document.addEventListener('click', e => {
  const pd = e.target.closest('[data-pc]'); if (!pd) return;
  DS.accentColor = pd.dataset.pc;
  document.documentElement.style.setProperty('--accent', pd.dataset.pc);
  document.getElementById('acc-dot').style.background = pd.dataset.pc;
  document.getElementById('acc-hex').textContent      = pd.dataset.pc;
  document.getElementById('acc-picker').value         = pd.dataset.pc;
  renderBgGrid(); showLive();
});

document.getElementById('sl-hero').addEventListener('input',   e => { DS.heroHeight=+e.target.value; document.getElementById('vl-hero').textContent=DS.heroHeight+'vh'; document.documentElement.style.setProperty('--hero-h',DS.heroHeight+'vh'); showLive(); });
document.getElementById('sl-radius').addEventListener('input', e => { DS.cardRadius=+e.target.value; document.getElementById('vl-radius').textContent=DS.cardRadius+'px'; document.documentElement.style.setProperty('--radius',DS.cardRadius+'px'); showLive(); });
document.getElementById('sl-hover').addEventListener('input',  e => { const v=+e.target.value; document.getElementById('vl-hover').textContent=v+'px'; document.documentElement.style.setProperty('--card-hover','-'+v+'px'); showLive(); });
document.getElementById('tog-anim').addEventListener('change',   e => { DS.animOn=e.target.checked;   applyAnim();          showLive(); });
document.getElementById('tog-shadow').addEventListener('change', e => { DS.shadowOn=e.target.checked; applyShadow();        showLive(); });
document.getElementById('tog-border').addEventListener('change', e => { DS.borderOn=e.target.checked; applyBorderToggle();  showLive(); });
document.getElementById('tog-scroll').addEventListener('change', e => { applyScrollFade(e.target.checked); showLive(); });
document.getElementById('tog-particle').addEventListener('change', e => { applyParticle(e.target.checked); showLive(); });

/* ── 디자인 적용 함수들 ── */
function applyTheme(id) {
  const t = THEMES[id]; if (!t) return; DS.theme=id; DS.accentColor=t.accent;
  Object.entries(t.vars).forEach(([k,v]) => document.documentElement.style.setProperty(k,v));
  document.documentElement.style.setProperty('--accent', t.accent);
  document.getElementById('hero').style.background      = t.vars['--pg-hero-bg'];
  document.getElementById('about').style.background     = t.vars['--pg-sec-a'];
  document.getElementById('portfolio').style.background = t.vars['--pg-sec-b'];
  document.getElementById('resume').style.background    = t.vars['--pg-sec-a'];
  document.getElementById('contact').style.background   = t.vars['--pg-sec-c'];
  document.querySelectorAll('.sec-title').forEach(el => el.style.color = t.vars['--pg-text']);
  document.querySelectorAll('.about-text,.fact-val,.work-title,.doc-name').forEach(el => el.style.color = t.vars['--pg-text']);
  document.querySelectorAll('.work-card,.fact,.doc-item').forEach(el => { el.style.background=t.vars['--pg-card']; el.style.borderColor=t.vars['--pg-border']; });
  document.querySelector('.nav').style.background = t.vars['--pg-hero-bg'] + 'ee';
  applyBgPattern(DS.bgPattern); showLive();
}

function applyFont(id) {
  const f = FONTS.find(x=>x.id===id); if (!f) return; DS.font=id;
  if (f.url) {
    let lk = document.getElementById('dp-font-lk'); if(lk) lk.remove();
    lk = document.createElement('link'); lk.id='dp-font-lk'; lk.rel='stylesheet'; lk.href=f.url;
    document.head.appendChild(lk);
  }
  document.body.style.fontFamily = f.body;
  document.querySelectorAll('.hero-name,.sec-title,h1,h2,h3').forEach(el => el.style.fontFamily=f.title);
  showLive();
}

function applyLayout(id) {
  const l = LAYOUTS.find(x=>x.id===id); DS.layout=id;
  document.getElementById('work-grid').style.gridTemplateColumns = l ? l.css : 'repeat(auto-fill,minmax(280px,1fr))';
  showLive();
}

function applyBgPattern(id) {
  if (id !== undefined) DS.bgPattern = id;
  const hex = DS.accentColor, base = THEMES[DS.theme]?.bg || '#0d1b2a';
  const p = {
    none:     `background:${base}`,
    dots:     `background:${base};background-image:radial-gradient(${hex}55 1px,transparent 1px);background-size:20px 20px`,
    grid:     `background:${base};background-image:linear-gradient(${hex}22 1px,transparent 1px),linear-gradient(90deg,${hex}22 1px,transparent 1px);background-size:30px 30px`,
    diagonal: `background:${base};background-image:repeating-linear-gradient(45deg,${hex}18 0,${hex}18 1px,transparent 0,transparent 50%);background-size:18px 18px`,
    noise:    `background:${base}`,
    gradient: `background:linear-gradient(135deg,${base} 0%,${hex}44 50%,${base} 100%)`,
  };
  document.getElementById('hero').setAttribute('style', (p[DS.bgPattern]||p.none) + ';overflow:hidden;position:relative');
  showLive();
}

function applyAnim() {
  let s = document.getElementById('dp-anim-s'); if (!s) { s=document.createElement('style'); s.id='dp-anim-s'; document.head.appendChild(s); }
  s.textContent = DS.animOn ? '' : '*,*::before,*::after{animation-duration:.001ms!important;transition-duration:.001ms!important}';
}
function applyShadow() {
  let s = document.getElementById('dp-shadow-s'); if (!s) { s=document.createElement('style'); s.id='dp-shadow-s'; document.head.appendChild(s); }
  s.textContent = DS.shadowOn ? '' : '.work-card,.doc-item{box-shadow:none!important}';
}
function applyBorderToggle() {
  let s = document.getElementById('dp-border-s'); if (!s) { s=document.createElement('style'); s.id='dp-border-s'; document.head.appendChild(s); }
  s.textContent = DS.borderOn ? '' : '.work-card,.doc-item{border:none!important}';
}
function applyScrollFade(on) {
  document.querySelectorAll('section').forEach((s, i) => {
    if (on) { s.style.opacity='0'; s.style.transform='translateY(18px)'; s.style.transition='opacity .6s ease,transform .6s ease'; setTimeout(()=>{ s.style.opacity='1'; s.style.transform='translateY(0)'; }, i*80); }
    else    { s.style.opacity=''; s.style.transform=''; s.style.transition=''; }
  });
}
function applyParticle(on) {
  const ex = document.getElementById('dp-canvas'); if (ex) ex.remove();
  if (!on) return;
  const hero = document.getElementById('hero');
  const cv = document.createElement('canvas'); cv.id='dp-canvas'; cv.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:0';
  hero.insertBefore(cv, hero.firstChild);
  const ctx = cv.getContext('2d'), ps = [];
  const resize = () => { cv.width=hero.offsetWidth; cv.height=hero.offsetHeight; }; resize();
  window.addEventListener('resize', resize);
  const hex = DS.accentColor;
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  for (let i=0; i<50; i++) ps.push({ x:Math.random()*cv.width, y:Math.random()*cv.height, r:Math.random()*2+1, dx:(Math.random()-.5)*.4, dy:(Math.random()-.5)*.4, a:Math.random()*.5+.2 });
  (function anim() {
    if (!document.getElementById('dp-canvas')) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ps.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle = `rgba(${r},${g},${b},${p.a})`; ctx.fill();
      p.x+=p.dx; p.y+=p.dy;
      if(p.x<0) p.x=cv.width; if(p.x>cv.width) p.x=0;
      if(p.y<0) p.y=cv.height; if(p.y>cv.height) p.y=0;
    });
    requestAnimationFrame(anim);
  })();
}

/* ── 전체 적용 (외부에서도 호출 가능) ── */
function applyDesignAll(dz) {
  if (!dz) return;
  DS = Object.assign(DS, dz);
  if (dz.theme)      applyTheme(dz.theme);
  if (dz.font)       applyFont(dz.font);
  if (dz.layout)     applyLayout(dz.layout);
  if (dz.bgPattern)  applyBgPattern(dz.bgPattern);
  applyAnim(); applyShadow(); applyBorderToggle();
  document.documentElement.style.setProperty('--accent',  dz.accentColor || '#1e88e5');
  document.documentElement.style.setProperty('--radius',  (dz.cardRadius || 12) + 'px');
  document.documentElement.style.setProperty('--hero-h',  (dz.heroHeight  || 92) + 'vh');
}

/* ── 저장 / 초기화 ── */
async function saveDesign() {
  const btn = document.getElementById('dp-save-btn');
  btn.textContent = '저장 중...'; btn.disabled = true;
  const res = await api('/api/portfolio', 'PATCH', { design: DS });
  if (res.ok) {
    G.portfolio.design = { ...DS };
    btn.textContent = '✅ 저장됨!';
    setTimeout(() => { btn.textContent = '💾 저장'; btn.disabled = false; }, 2000);
  } else {
    btn.textContent = '❌ 실패'; btn.disabled = false;
    setTimeout(() => { btn.textContent = '💾 저장'; }, 2000);
  }
}

function resetDesign() {
  if (!confirm('디자인을 기본값으로 초기화할까요?')) return;
  DS = { theme:'dark', accentColor:'#1e88e5', font:'pretendard', layout:'default', bgPattern:'none', heroHeight:92, cardRadius:12, animOn:true, shadowOn:true, borderOn:true, sectionOrder:['about','portfolio','resume','projects','contact'] };
  applyDesignAll(DS); renderDP(); showLive(); toast('초기화 완료!','info');
}
