/* ═══════════════════════════════════════════════════════════════════════════
   app.js  ·  提示詞資料庫
   按鈕設計：
     ① 複製提示詞（藍色）  ─ 複製主提示詞全文
     ② 複製案例（綠色）    ─ 複製案例情境提示詞
   兩者完全獨立，不互相干擾。
═══════════════════════════════════════════════════════════════════════════ */

/* ── State ─────────────────────────────────────────────────────────────── */
let currentCat = 'all';
let searchQuery = '';

/* ── Copy-count persistence ─────────────────────────────────────────────── */
const STORAGE_KEY = 'prompt_copy_counts';
function loadCounts() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function getCount(id) { return loadCounts()[id] || 0; }
function incrementCount(id) {
  const c = loadCounts();
  c[id] = (c[id] || 0) + 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  return c[id];
}
function fmt(n) { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n); }

/* ── Helpers ────────────────────────────────────────────────────────────── */
function catInfo(key) {
  return CATEGORIES[key] || { label: key, icon: '◉', class: '' };
}
function preview(content) {
  return content.replace(/#+\s/g, '').replace(/[│|]/g, '').replace(/\n+/g, ' ').trim();
}
function getCases(pid) {
  return (typeof CASES_BY_PROMPT !== 'undefined' && CASES_BY_PROMPT[pid])
    ? CASES_BY_PROMPT[pid] : [];
}
function caseTagClass(type) {
  if (type === 'workplace') return 'workplace';
  if (type === 'practice')  return 'practice';
  return '';
}

/* ── Copy utilities ─────────────────────────────────────────────────────── */
// 複製提示詞（藍色反饋）
function copyText(text, btn, doneLabel = '✓ 已複製', resetLabel = '⎘ 複製') {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.classList.add('copied-prompt');
    btn.innerHTML = doneLabel;
    setTimeout(() => {
      btn.classList.remove('copied-prompt');
      btn.innerHTML = resetLabel;
    }, 2000);
  });
}

// 複製案例（綠色反饋）
function copyCaseText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('copied-case');
    btn.textContent = '✓ 已複製';
    setTimeout(() => {
      btn.classList.remove('copied-case');
      btn.textContent = '⎘ 複製案例';
    }, 2000);
  });
}

/* ── Card rendering ─────────────────────────────────────────────────────── */
function renderCards() {
  const grid = document.getElementById('cardGrid');
  const q    = searchQuery.toLowerCase();

  const filtered = PROMPTS.filter(p => {
    const matchCat = currentCat === 'all' || p.cat === currentCat;
    const matchQ   = !q || p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  document.getElementById('count-all').textContent = PROMPTS.length;

  if (!filtered.length) {
    grid.innerHTML = `<div class="no-results"><span>◎</span><p>找不到符合「${searchQuery}」的提示詞</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map((p, i) => {
    const cat    = catInfo(p.cat);
    const cnt    = getCount(p.id);
    const badge  = cnt > 0
      ? `<span class="card-copies" title="已複製 ${cnt} 次">⎘ ${fmt(cnt)}</span>`
      : `<span class="card-copies card-copies-zero">⎘ 0</span>`;

    /* ── 卡片底部：複製提示詞按鈕（藍）+ 字元數 ── */
    const footer = `
      <div class="card-footer">
        <span class="card-chars">${p.content.length.toLocaleString()} 字元</span>
        <div class="card-footer-actions">
          ${badge}
          <button class="card-copy-prompt-btn"
            onclick="cardCopyPrompt(event,this,${p.id})"
            title="複製提示詞全文">
            ⎘ 複製提示詞
          </button>
        </div>
      </div>`;

    /* ── 案例折疊區（綠色按鈕）── */
    const cases  = getCases(p.id);
    const casesHTML = cases.length ? `
      <div class="card-cases">
        <button class="cases-toggle" onclick="toggleCases(event,this)">
          <span class="cases-toggle-icon">▶</span>
          <span class="cases-toggle-label">📋 實戰案例</span>
          <span class="cases-toggle-count">${cases.length}</span>
        </button>
        <div class="cases-list">
          ${cases.map(c => `
            <div class="case-item">
              <div class="case-item-header">
                <span class="case-tag ${caseTagClass(c.type)}">${c.typeLabel}</span>
                <button class="case-copy-btn"
                  onclick="cardCopyCase(event,this,${JSON.stringify(c.prompt).replace(/</g,'&lt;')})">
                  ⎘ 複製案例
                </button>
              </div>
              <div class="case-title">${c.title}</div>
              <div class="case-scene">${c.scene}</div>
            </div>`).join('')}
        </div>
      </div>` : '';

    return `
      <div class="card ${cat.class}" style="animation-delay:${Math.min(i*.04,.4)}s" data-id="${p.id}">
        <div class="card-top" onclick="openModal(${p.id})" style="cursor:pointer;">
          <span class="card-cat">${cat.icon} ${cat.label}</span>
          <span class="card-arrow">↗</span>
        </div>
        <div class="card-title" onclick="openModal(${p.id})" style="cursor:pointer;">${p.title}</div>
        <div class="card-preview" onclick="openModal(${p.id})" style="cursor:pointer;">${preview(p.content)}</div>
        ${footer}
        ${casesHTML}
      </div>`;
  }).join('');
}

/* 卡片上：複製提示詞（藍） */
function cardCopyPrompt(e, btn, id) {
  e.stopPropagation();
  const p = PROMPTS.find(x => x.id === id);
  if (!p) return;
  navigator.clipboard.writeText(p.content).then(() => {
    const newCnt = incrementCount(id);
    // 按鈕反饋
    btn.classList.add('copied-prompt');
    btn.textContent = '✓ 已複製！';
    setTimeout(() => {
      btn.classList.remove('copied-prompt');
      btn.textContent = '⎘ 複製提示詞';
    }, 2000);
    // 更新徽章
    const card  = document.querySelector(`.card[data-id="${id}"]`);
    if (card) {
      const badge = card.querySelector('.card-copies');
      if (badge) {
        badge.textContent = `⎘ ${fmt(newCnt)}`;
        badge.title = `已複製 ${newCnt} 次`;
        badge.classList.remove('card-copies-zero');
        badge.classList.add('card-copies-bump');
        setTimeout(() => badge.classList.remove('card-copies-bump'), 500);
      }
    }
  });
}

/* 卡片上：複製案例（綠） */
function cardCopyCase(e, btn, text) {
  e.stopPropagation();
  copyCaseText(text, btn);
}

/* 折疊開關 */
function toggleCases(e, btn) {
  e.stopPropagation();
  const list = btn.nextElementSibling;
  const open = btn.classList.toggle('open');
  list.classList.toggle('open', open);
}

/* ── Modal ──────────────────────────────────────────────────────────────── */
function openModal(id) {
  const p = PROMPTS.find(x => x.id === id);
  if (!p) return;
  const cat = catInfo(p.cat);

  /* header */
  const catTag = document.getElementById('modalCat');
  catTag.textContent = `${cat.icon} ${cat.label}`;
  catTag.className   = `modal-cat-tag ${cat.class}`;
  document.getElementById('modalTitle').textContent = p.title;

  /* body */
  document.getElementById('modalContent').textContent = p.content;

  /* copy count */
  const cnt = getCount(id);
  document.getElementById('modalCopyCount').textContent = cnt > 0 ? `已複製 ${cnt} 次` : '';

  /* cases panel */
  const cases       = getCases(id);
  const casesPanelEl = document.getElementById('modalCases');
  const casesListEl  = document.getElementById('modalCasesList');

  if (cases.length) {
    casesPanelEl.style.display = 'block';
    casesListEl.innerHTML = cases.map(c => `
      <div class="modal-case-item">

        <!-- 案例標頭：標籤 + 標題 + ② 複製案例按鈕（綠） -->
        <div class="modal-case-header">
          <span class="case-tag ${caseTagClass(c.type)}">${c.typeLabel}</span>
          <span class="modal-case-title">${c.title}</span>
          <button class="modal-case-copy"
            onclick="modalCopyCase(this, ${JSON.stringify(c.prompt).replace(/</g,'&lt;')})">
            ⎘ 複製案例
          </button>
        </div>

        <div class="modal-case-section">
          <div class="modal-case-section-label">📍 適用場景</div>
          <div class="modal-case-text">${c.scene}</div>
        </div>
        <div class="modal-case-section">
          <div class="modal-case-section-label">🔧 使用前準備</div>
          <div class="modal-case-text">${c.prep}</div>
        </div>
        ${c.tips && c.tips.length ? `
        <div class="modal-case-section">
          <div class="modal-case-section-label">💡 進階練習</div>
          <div class="modal-case-text">${c.tips.map(t => '• ' + t).join('\n')}</div>
        </div>` : ''}
        <div class="modal-case-section">
          <div class="modal-case-section-label">📋 完整案例提示詞</div>
          <pre class="modal-case-prompt">${c.prompt.replace(/</g,'&lt;')}</pre>
        </div>

      </div>`).join('');
  } else {
    casesPanelEl.style.display = 'none';
    casesListEl.innerHTML = '';
  }

  const overlay = document.getElementById('modalOverlay');
  overlay.classList.add('open');
  overlay.dataset.promptId = id;
  document.body.style.overflow = 'hidden';
  document.getElementById('copyConfirm').classList.remove('show');
}

/* Modal：① 複製提示詞（藍，在 footer） */
document.getElementById('copyBtn').addEventListener('click', () => {
  const id = parseInt(document.getElementById('modalOverlay').dataset.promptId);
  const p  = PROMPTS.find(x => x.id === id);
  if (!p) return;

  navigator.clipboard.writeText(p.content).then(() => {
    const newCnt = incrementCount(id);

    /* footer 反饋 */
    const btn = document.getElementById('copyBtn');
    btn.classList.add('copied-prompt');
    btn.innerHTML = '<span class="copy-icon">✓</span> 已複製！';
    setTimeout(() => {
      btn.classList.remove('copied-prompt');
      btn.innerHTML = '<span class="copy-icon">⎘</span> 複製提示詞';
    }, 2200);

    /* 次數顯示 */
    const confirm = document.getElementById('copyConfirm');
    confirm.textContent = `第 ${newCnt} 次複製`;
    confirm.classList.add('show');
    setTimeout(() => confirm.classList.remove('show'), 2400);
    document.getElementById('modalCopyCount').textContent = `已複製 ${newCnt} 次`;

    /* 卡片徽章同步 */
    const card = document.querySelector(`.card[data-id="${id}"]`);
    if (card) {
      const badge = card.querySelector('.card-copies');
      if (badge) {
        badge.textContent = `⎘ ${fmt(newCnt)}`;
        badge.title = `已複製 ${newCnt} 次`;
        badge.classList.remove('card-copies-zero');
        badge.classList.add('card-copies-bump');
        setTimeout(() => badge.classList.remove('card-copies-bump'), 500);
      }
      const cpBtn = card.querySelector('.card-copy-prompt-btn');
      if (cpBtn) {
        cpBtn.classList.add('copied-prompt');
        cpBtn.textContent = '✓ 已複製！';
        setTimeout(() => {
          cpBtn.classList.remove('copied-prompt');
          cpBtn.textContent = '⎘ 複製提示詞';
        }, 2200);
      }
    }
  });
});

/* Modal：② 複製案例（綠，在案例面板） */
function modalCopyCase(btn, text) {
  copyCaseText(text, btn);
}

/* ── Close modal ────────────────────────────────────────────────────────── */
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ── Category nav ───────────────────────────────────────────────────────── */
document.getElementById('catNav').addEventListener('click', e => {
  const btn = e.target.closest('.cat-btn');
  if (!btn) return;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentCat = btn.dataset.cat;
  renderCards();
});

/* ── Search ─────────────────────────────────────────────────────────────── */
document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value;
  renderCards();
});

/* ── Init ───────────────────────────────────────────────────────────────── */
renderCards();
