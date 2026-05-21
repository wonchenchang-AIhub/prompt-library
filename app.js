/* ═══════════════════════════════════════════════════════════════════════
   app.js  ·  AI 提示詞資料庫 · Mobile App Version
   架構：
     ① 首頁：分類 Tab + 卡片清單
     ② 最近使用：localStorage 記錄最近 20 個
     ③ 收藏：localStorage 星號收藏
     ④ 詳情 Sheet：滑動式全屏 bottom sheet
     提示詞複製（藍）與案例複製（綠）完全分離
═══════════════════════════════════════════════════════════════════════ */

/* ── State ──────────────────────────────────────────────── */
let currentCat  = 'all';
let searchQuery = '';
let currentView = 'home';   // 'home' | 'recent' | 'fav'
let sheetPromptId = null;

/* ── Case Cache (avoid innerHTML injection) ─────────────── */
window.__caseCache = [];
let __modalCaseCache = [];

function storeCasePrompt(text) {
  window.__caseCache.push(text);
  return window.__caseCache.length - 1;
}

/* ── LocalStorage helpers ───────────────────────────────── */
const LS = {
  get: k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

// Copy counts
function getCopyCount(id) { return (LS.get('prompt_counts') || {})[id] || 0; }
function incCopyCount(id) {
  const c = LS.get('prompt_counts') || {};
  c[id] = (c[id] || 0) + 1;
  LS.set('prompt_counts', c);
  return c[id];
}
function fmt(n) { return n >= 1000 ? (n/1000).toFixed(1)+'k' : String(n); }

// Recent
const RECENT_KEY = 'prompt_recent';
function getRecent() { return LS.get(RECENT_KEY) || []; }
function addRecent(id) {
  let r = getRecent().filter(x => x !== id);
  r.unshift(id);
  LS.set(RECENT_KEY, r.slice(0, 20));
}

// Favourites
const FAV_KEY = 'prompt_favs';
function getFavs() { return LS.get(FAV_KEY) || []; }
function toggleFav(id) {
  let f = getFavs();
  if (f.includes(id)) { f = f.filter(x => x !== id); }
  else { f.unshift(id); }
  LS.set(FAV_KEY, f);
  return f.includes(id);
}
function isFav(id) { return getFavs().includes(id); }

/* ── Helpers ────────────────────────────────────────────── */
function catInfo(key) {
  return (typeof CATEGORIES !== 'undefined' && CATEGORIES[key])
    ? CATEGORIES[key]
    : { label: key, icon: '◉', class: '' };
}
function getCases(pid) {
  return (typeof CASES_BY_PROMPT !== 'undefined' && CASES_BY_PROMPT[pid])
    ? CASES_BY_PROMPT[pid] : [];
}
function previewText(content) {
  return content.replace(/#+\s/g,'').replace(/[│|]/g,'').replace(/\n+/g,' ').trim();
}
function caseTagCls(type) {
  if (type === 'practice') return 'practice';
  return '';
}
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Copy utilities ─────────────────────────────────────── */
function copyText(text) {
  return navigator.clipboard.writeText(text).catch(() => {
    // Fallback for older WebKit
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  });
}

function flashBtn(btn, doneHtml, origHtml, ms = 2000) {
  btn.innerHTML = doneHtml;
  setTimeout(() => { btn.innerHTML = origHtml; }, ms);
}

/* ── Render card list ───────────────────────────────────── */
function renderCards(list) {
  window.__caseCache = [];
  const grid = document.getElementById('cardGrid');
  if (!list || !list.length) {
    grid.innerHTML = `<div class="no-results">
      <div class="no-results-icon">◎</div>
      <p>找不到符合的提示詞</p>
    </div>`;
    return;
  }

  grid.innerHTML = list.map((p, i) => {
    const cat   = catInfo(p.cat);
    const cnt   = getCopyCount(p.id);
    const cases = getCases(p.id);
    const badgeCls = cnt > 0 ? 'card-copies-badge has-copies' : 'card-copies-badge';
    const badgeTxt = cnt > 0 ? `⎘ ${fmt(cnt)}` : '';

    const caseItems = cases.map(c => {
      const idx = storeCasePrompt(c.prompt);
      return `
      <div class="case-item-card">
        <div class="case-item-header">
          <span class="case-type-tag ${caseTagCls(c.type)}">${c.typeLabel}</span>
          <button class="case-copy-btn" onclick="cardCopyCase(event,this,${idx})">⎘ 複製案例</button>
        </div>
        <div class="case-title">${escHtml(c.title)}</div>
        <div class="case-scene">${escHtml(c.scene)}</div>
      </div>`;
    }).join('');

    const casesSection = cases.length ? `
      <button class="card-cases-toggle" onclick="toggleCardCases(event,this)">
        <span class="card-cases-toggle-icon">▶</span>
        📋 實戰案例
        <span class="card-cases-count">${cases.length}</span>
      </button>
      <div class="card-cases-list">${caseItems}</div>` : '';

    return `
    <div class="prompt-card ${cat.class}" style="animation-delay:${Math.min(i*.03,.4)}s" data-id="${p.id}">
      <div class="card-main" onclick="openSheet(${p.id})">
        <div class="card-cat-dot"></div>
        <div class="card-body">
          <div class="card-cat-label">${cat.icon} ${cat.label}</div>
          <div class="card-title">${escHtml(p.title)}</div>
          <div class="card-preview">${escHtml(previewText(p.content))}</div>
        </div>
        <svg class="card-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
      <div class="card-actions">
        <button class="card-copy-btn" onclick="cardCopyPrompt(event,this,${p.id})">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          複製提示詞
        </button>
        ${cnt > 0 ? `<span class="${badgeCls}">${badgeTxt}</span>` : ''}
      </div>
      ${casesSection}
    </div>`;
  }).join('');
}

/* ── Filter & render ────────────────────────────────────── */
function applyFilter() {
  const q = searchQuery.toLowerCase();
  let list = PROMPTS.filter(p => {
    const matchCat = currentCat === 'all' || p.cat === currentCat;
    const matchQ   = !q || p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
    return matchCat && matchQ;
  });
  document.getElementById('count-all').textContent = PROMPTS.length;
  renderCards(list);
}

/* ── Card copy prompt (blue) ────────────────────────────── */
function cardCopyPrompt(e, btn, id) {
  e.stopPropagation();
  const p = PROMPTS.find(x => x.id === id);
  if (!p) return;
  copyText(p.content).then(() => {
    const n = incCopyCount(id);
    btn.classList.add('copied-prompt');
    flashBtn(btn,
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> 已複製！',
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> 複製提示詞'
    );
    setTimeout(() => btn.classList.remove('copied-prompt'), 2000);
    // Update badge
    const card = document.querySelector(`.prompt-card[data-id="${id}"]`);
    if (card) {
      let badge = card.querySelector('.card-copies-badge');
      if (!badge) {
        badge = document.createElement('span');
        card.querySelector('.card-actions').appendChild(badge);
      }
      badge.className = 'card-copies-badge has-copies';
      badge.textContent = `⎘ ${fmt(n)}`;
    }
    addRecent(id);
  });
}

/* ── Card copy case (green) ─────────────────────────────── */
function cardCopyCase(e, btn, idx) {
  e.stopPropagation();
  const text = window.__caseCache[idx] || '';
  if (!text) return;
  copyText(text).then(() => {
    btn.classList.add('copied-case');
    const orig = btn.textContent;
    btn.textContent = '✓ 已複製';
    setTimeout(() => { btn.classList.remove('copied-case'); btn.textContent = orig; }, 2000);
  });
}

/* ── Toggle card cases ──────────────────────────────────── */
function toggleCardCases(e, btn) {
  e.stopPropagation();
  const list = btn.nextElementSibling;
  const open = btn.classList.toggle('open');
  list.classList.toggle('open', open);
}

/* ── Open detail sheet ──────────────────────────────────── */
function openSheet(id) {
  __modalCaseCache = [];
  const p = PROMPTS.find(x => x.id === id);
  if (!p) return;
  sheetPromptId = id;
  addRecent(id);

  const cat = catInfo(p.cat);
  // header
  const catTag = document.getElementById('sheetCat');
  catTag.textContent = `${cat.icon} ${cat.label}`;
  catTag.style.cssText = `background:${getCatLtColor(p.cat)};color:${getCatColor(p.cat)};`;
  document.getElementById('sheetTitle').textContent = p.title;

  // fav button
  const favBtn = document.getElementById('sheetFav');
  favBtn.classList.toggle('faved', isFav(id));

  // content
  document.getElementById('sheetContent').textContent = p.content;

  // cases
  const cases = getCases(id);
  const casesEl = document.getElementById('sheetCases');
  if (cases.length) {
    let html = `<div class="cases-section-title">📋 實戰案例 · 點擊複製使用</div>`;
    html += cases.map(c => {
      const idx = __modalCaseCache.length;
      __modalCaseCache.push(c.prompt);
      return `
      <div class="sheet-case-item">
        <div class="sheet-case-header">
          <span class="case-type-tag ${caseTagCls(c.type)}">${c.typeLabel}</span>
          <div class="sheet-case-title">${escHtml(c.title)}</div>
          <button class="sheet-case-copy" onclick="sheetCopyCase(this,${idx})">⎘ 複製</button>
        </div>
        <div class="sheet-case-section">
          <div class="sheet-case-section-label">📍 情境</div>
          <div class="sheet-case-text">${escHtml(c.scene)}</div>
        </div>
        <div class="sheet-case-section">
          <div class="sheet-case-section-label">🔧 準備</div>
          <div class="sheet-case-text">${escHtml(c.prep || '')}</div>
        </div>
        <div class="sheet-case-prompt-wrap">
          <div class="sheet-case-section-label" style="margin-bottom:6px">📋 完整提示詞</div>
          <pre class="sheet-case-prompt" data-midx="${idx}"></pre>
        </div>
      </div>`;
    }).join('');
    casesEl.innerHTML = html;
    // fill pre via textContent (safe)
    casesEl.querySelectorAll('.sheet-case-prompt[data-midx]').forEach(pre => {
      pre.textContent = __modalCaseCache[parseInt(pre.dataset.midx)] || '';
    });
  } else {
    casesEl.innerHTML = '';
  }

  // main copy btn
  const copyBtn = document.getElementById('copyMainBtn');
  copyBtn.classList.remove('copied-prompt');
  copyBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> 複製提示詞`;

  // open
  document.getElementById('detailSheet').classList.add('open');
  document.getElementById('sheetBackdrop').classList.add('show');
  document.body.style.overflow = 'hidden';

  // reset scroll
  setTimeout(() => { document.getElementById('sheetBody').scrollTop = 0; }, 10);
}

/* ── Close sheet ────────────────────────────────────────── */
function closeSheet() {
  document.getElementById('detailSheet').classList.remove('open');
  document.getElementById('sheetBackdrop').classList.remove('show');
  document.body.style.overflow = '';
  sheetPromptId = null;
}

document.getElementById('sheetBack').addEventListener('click', closeSheet);
document.getElementById('sheetBackdrop').addEventListener('click', closeSheet);

/* ── Sheet: copy prompt (blue) ──────────────────────────── */
document.getElementById('copyMainBtn').addEventListener('click', () => {
  if (!sheetPromptId) return;
  const p = PROMPTS.find(x => x.id === sheetPromptId);
  if (!p) return;
  copyText(p.content).then(() => {
    const n = incCopyCount(sheetPromptId);
    const btn = document.getElementById('copyMainBtn');
    btn.classList.add('copied-prompt');
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> 已複製！`;
    setTimeout(() => {
      btn.classList.remove('copied-prompt');
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> 複製提示詞`;
    }, 2200);
    // toast
    const toast = document.getElementById('copyToast');
    toast.textContent = `✓ 已複製（第 ${n} 次）`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2400);
    addRecent(sheetPromptId);
    // refresh recent view if open
    if (currentView === 'recent') renderRecent();
  });
});

/* ── Sheet: copy case (green) ───────────────────────────── */
function sheetCopyCase(btn, idx) {
  const text = __modalCaseCache[idx] || '';
  if (!text) return;
  copyText(text).then(() => {
    btn.classList.add('copied-case');
    btn.textContent = '✓ 已複製';
    setTimeout(() => { btn.classList.remove('copied-case'); btn.textContent = '⎘ 複製'; }, 2000);
  });
}

/* ── Sheet: fav toggle ──────────────────────────────────── */
document.getElementById('sheetFav').addEventListener('click', () => {
  if (!sheetPromptId) return;
  const now = toggleFav(sheetPromptId);
  document.getElementById('sheetFav').classList.toggle('faved', now);
  if (currentView === 'fav') renderFav();
});

/* ── Sheet drag to dismiss ──────────────────────────────── */
(function() {
  const sheet = document.getElementById('detailSheet');
  const handle = document.getElementById('sheetHandleArea');
  let startY = 0, startT = 0, isDragging = false;

  function onStart(e) {
    if (!sheet.classList.contains('open')) return;
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    startT = Date.now();
    isDragging = true;
    sheet.style.transition = 'none';
  }
  function onMove(e) {
    if (!isDragging) return;
    const dy = (e.touches ? e.touches[0].clientY : e.clientY) - startY;
    if (dy > 0) sheet.style.transform = `translateY(${dy}px)`;
  }
  function onEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    sheet.style.transition = '';
    const dy = (e.changedTouches ? e.changedTouches[0].clientY : e.clientY) - startY;
    const dt = Date.now() - startT;
    if (dy > 120 || (dy > 60 && dt < 250)) {
      closeSheet();
      sheet.style.transform = '';
    } else {
      sheet.style.transform = '';
    }
  }
  handle.addEventListener('touchstart', onStart, { passive: true });
  handle.addEventListener('touchmove', onMove, { passive: true });
  handle.addEventListener('touchend', onEnd);
  handle.addEventListener('mousedown', onStart);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onEnd);
})();

/* ── Category tabs ──────────────────────────────────────── */
document.getElementById('catTabs').addEventListener('click', e => {
  const tab = e.target.closest('.cat-tab');
  if (!tab) return;
  document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  currentCat = tab.dataset.cat;
  applyFilter();
  tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
});

/* ── Search ─────────────────────────────────────────────── */
const searchOverlay = document.getElementById('searchOverlay');
const searchInput   = document.getElementById('searchInput');
const searchClear   = document.getElementById('searchClear');

document.getElementById('searchTrigger').addEventListener('click', () => {
  searchOverlay.classList.add('open');
  searchInput.focus();
});

searchInput.addEventListener('input', e => {
  searchQuery = e.target.value;
  searchClear.classList.toggle('show', !!searchQuery);
  if (currentView === 'home') applyFilter();
  else { switchViewTo('home'); applyFilter(); }
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  searchClear.classList.remove('show');
  applyFilter();
  searchOverlay.classList.remove('open');
});

// close search overlay when tapping outside
document.addEventListener('click', e => {
  if (searchOverlay.classList.contains('open') &&
      !searchOverlay.contains(e.target) &&
      e.target.id !== 'searchTrigger') {
    searchOverlay.classList.remove('open');
  }
});

/* ── Tab bar / views ────────────────────────────────────── */
function switchViewTo(view) {
  currentView = view;
  const cardList = document.getElementById('cardGrid');
  const tabsWrap = document.getElementById('catTabsWrap');
  // show/hide cat tabs
  tabsWrap.style.display = view === 'home' ? '' : 'none';
  cardList.style.display = view === 'home' ? 'flex' : 'none';
}

function switchView(view, btn) {
  currentView = view;
  document.querySelectorAll('.tab-bar-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const cardList = document.getElementById('cardGrid');
  const tabsWrap = document.getElementById('catTabsWrap');

  // Remove old view panels
  document.querySelectorAll('.view-panel').forEach(p => p.remove());

  if (view === 'home') {
    tabsWrap.style.display = '';
    cardList.style.display = 'flex';
  } else {
    tabsWrap.style.display = 'none';
    cardList.style.display = 'none';
    const panel = document.createElement('div');
    panel.className = 'view-panel active';
    panel.id = view + 'Panel';
    document.getElementById('app').insertBefore(panel, document.querySelector('.tab-bar'));
    if (view === 'recent') renderRecent(panel);
    else renderFav(panel);
  }
}

/* ── Render recent view ─────────────────────────────────── */
function renderRecent(panel) {
  const el = panel || document.getElementById('recentPanel');
  if (!el) return;
  const ids = getRecent();
  const prompts = ids.map(id => PROMPTS.find(p => p.id === id)).filter(Boolean);
  if (!prompts.length) {
    el.innerHTML = `<div class="empty-view">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <p>尚無最近使用的提示詞</p>
    </div>`;
    return;
  }
  el.innerHTML = '<div style="font-size:12px;color:var(--text-3);margin-bottom:10px;font-weight:600;">最近使用</div>';
  const tmp = document.createElement('div');
  tmp.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
  el.appendChild(tmp);
  window.__caseCache = [];
  tmp.innerHTML = prompts.map((p, i) => buildCardHtml(p, i)).join('');
}

/* ── Render fav view ────────────────────────────────────── */
function renderFav(panel) {
  const el = panel || document.getElementById('favPanel');
  if (!el) return;
  const ids = getFavs();
  const prompts = ids.map(id => PROMPTS.find(p => p.id === id)).filter(Boolean);
  if (!prompts.length) {
    el.innerHTML = `<div class="empty-view">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      <p>尚無收藏的提示詞<br>在詳情頁點擊 ☆ 收藏</p>
    </div>`;
    return;
  }
  el.innerHTML = '<div style="font-size:12px;color:var(--text-3);margin-bottom:10px;font-weight:600;">收藏清單</div>';
  const tmp = document.createElement('div');
  tmp.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
  el.appendChild(tmp);
  window.__caseCache = [];
  tmp.innerHTML = prompts.map((p, i) => buildCardHtml(p, i)).join('');
}

/* ── Shared card HTML builder ───────────────────────────── */
function buildCardHtml(p, i) {
  const cat   = catInfo(p.cat);
  const cnt   = getCopyCount(p.id);
  const cases = getCases(p.id);
  const caseItems = cases.map(c => {
    const idx = storeCasePrompt(c.prompt);
    return `
    <div class="case-item-card">
      <div class="case-item-header">
        <span class="case-type-tag ${caseTagCls(c.type)}">${c.typeLabel}</span>
        <button class="case-copy-btn" onclick="cardCopyCase(event,this,${idx})">⎘ 複製案例</button>
      </div>
      <div class="case-title">${escHtml(c.title)}</div>
      <div class="case-scene">${escHtml(c.scene)}</div>
    </div>`;
  }).join('');
  const casesSection = cases.length ? `
    <button class="card-cases-toggle" onclick="toggleCardCases(event,this)">
      <span class="card-cases-toggle-icon">▶</span>📋 實戰案例
      <span class="card-cases-count">${cases.length}</span>
    </button>
    <div class="card-cases-list">${caseItems}</div>` : '';
  return `
  <div class="prompt-card ${cat.class}" style="animation-delay:${Math.min(i*.03,.4)}s" data-id="${p.id}">
    <div class="card-main" onclick="openSheet(${p.id})">
      <div class="card-cat-dot"></div>
      <div class="card-body">
        <div class="card-cat-label">${cat.icon} ${cat.label}</div>
        <div class="card-title">${escHtml(p.title)}</div>
        <div class="card-preview">${escHtml(previewText(p.content))}</div>
      </div>
      <svg class="card-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
    <div class="card-actions">
      <button class="card-copy-btn" onclick="cardCopyPrompt(event,this,${p.id})">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        複製提示詞
      </button>
      ${cnt > 0 ? `<span class="card-copies-badge has-copies">⎘ ${fmt(cnt)}</span>` : ''}
    </div>
    ${casesSection}
  </div>`;
}

/* ── Category color helpers ─────────────────────────────── */
function getCatColor(cat) {
  const map = {
    preset:'#7c3aed',decision:'#2563eb',proposal:'#0891b2',comms:'#db2777',
    writing:'#059669','ai-roles':'#ea580c',coach:'#be123c',life:'#b45309',
    routine:'#0f766e',research:'#7e22ce',tools:'#0369a1'
  };
  return map[cat] || '#2563eb';
}
function getCatLtColor(cat) {
  const map = {
    preset:'#f5f3ff',decision:'#eff6ff',proposal:'#ecfeff',comms:'#fdf2f8',
    writing:'#ecfdf5','ai-roles':'#fff7ed',coach:'#fff1f2',life:'#fffbeb',
    routine:'#f0fdfa',research:'#faf5ff',tools:'#f0f9ff'
  };
  return map[cat] || '#eff6ff';
}

/* ── Init ───────────────────────────────────────────────── */
applyFilter();
