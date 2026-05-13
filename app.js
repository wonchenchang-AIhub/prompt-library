/* ── State ───────────────────────────── */
let currentCat = 'all';
let searchQuery = '';

/* ── Download Count Storage ──────────── */
const STORAGE_KEY = 'prompt_copy_counts';

function loadCounts() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function getCount(id) { return loadCounts()[id] || 0; }
function incrementCount(id) {
  const counts = loadCounts();
  counts[id] = (counts[id] || 0) + 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  return counts[id];
}
function formatCount(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}

/* ── Helpers ─────────────────────────── */
function catInfo(catKey) {
  return CATEGORIES[catKey] || { label: catKey, icon: '◉', class: '' };
}
function previewText(content) {
  return content.replace(/#+\s/g, '').replace(/[│|]/g, '').replace(/\n+/g, ' ').trim();
}

/* ── Cases helpers ───────────────────── */
function getCasesForPrompt(pid) {
  return (typeof CASES_BY_PROMPT !== 'undefined' && CASES_BY_PROMPT[pid]) ? CASES_BY_PROMPT[pid] : [];
}

function copyCasePrompt(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('copied');
    btn.textContent = '✓ 已複製';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.textContent = '⎘ 複製案例';
    }, 2000);
  });
}

/* ── Render Cards ────────────────────── */
function renderCards() {
  const grid = document.getElementById('cardGrid');
  const q = searchQuery.toLowerCase();

  const filtered = PROMPTS.filter(p => {
    const matchCat = currentCat === 'all' || p.cat === currentCat;
    const matchQ = !q || p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  document.getElementById('count-all').textContent = PROMPTS.length;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <span>◎</span>
        <p>找不到符合「${searchQuery}」的提示詞</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map((p, i) => {
    const cat = catInfo(p.cat);
    const preview = previewText(p.content);
    const charLen = p.content.length;
    const copies = getCount(p.id);
    const copyBadge = copies > 0
      ? `<span class="card-copies" title="已複製 ${copies} 次">⎘ ${formatCount(copies)}</span>`
      : `<span class="card-copies card-copies-zero">⎘ 0</span>`;

    const cases = getCasesForPrompt(p.id);
    const casesHTML = cases.length > 0 ? `
      <div class="card-cases">
        <button class="cases-toggle" onclick="toggleCases(event, this)">
          <span class="cases-toggle-icon">▶</span>
          <span class="cases-toggle-label">📋 實戰案例</span>
          <span class="cases-toggle-count">${cases.length}</span>
        </button>
        <div class="cases-list">
          ${cases.map(c => `
            <div class="case-item">
              <div class="case-item-header">
                <span class="case-tag ${c.type === 'workplace' ? 'workplace' : ''}">${c.typeLabel}</span>
                <button class="case-copy-btn" onclick="copyCaseFromCard(event, this, ${JSON.stringify(c.prompt).replace(/</g,'&lt;')})">⎘ 複製案例</button>
              </div>
              <div class="case-title">${c.title}</div>
              <div class="case-scene">${c.scene}</div>
            </div>
          `).join('')}
        </div>
      </div>` : '';

    return `
      <div class="card ${cat.class}" style="animation-delay:${Math.min(i * 0.04, 0.4)}s" data-id="${p.id}">
        <div class="card-top" onclick="openModal(${p.id})" style="cursor:pointer;">
          <span class="card-cat">${cat.icon} ${cat.label}</span>
          <span class="card-arrow">↗</span>
        </div>
        <div class="card-title" onclick="openModal(${p.id})" style="cursor:pointer;">${p.title}</div>
        <div class="card-preview" onclick="openModal(${p.id})" style="cursor:pointer;">${preview}</div>
        <div class="card-footer" onclick="openModal(${p.id})" style="cursor:pointer;">
          <span class="card-chars">${charLen.toLocaleString()} 字元</span>
          ${copyBadge}
        </div>
        ${casesHTML}
      </div>`;
  }).join('');
}

function toggleCases(e, btn) {
  e.stopPropagation();
  const list = btn.nextElementSibling;
  const isOpen = btn.classList.toggle('open');
  list.classList.toggle('open', isOpen);
}

function copyCaseFromCard(e, btn, text) {
  e.stopPropagation();
  copyCasePrompt(btn, text);
}

/* ── Modal ───────────────────────────── */
function openModal(id) {
  const p = PROMPTS.find(x => x.id === id);
  if (!p) return;
  const cat = catInfo(p.cat);

  const catTag = document.getElementById('modalCat');
  catTag.textContent = `${cat.icon} ${cat.label}`;
  catTag.className = `modal-cat-tag ${cat.class}`;

  document.getElementById('modalTitle').textContent = p.title;
  document.getElementById('modalContent').textContent = p.content;

  // Cases panel
  const cases = getCasesForPrompt(id);
  const casesPanelEl = document.getElementById('modalCases');
  const casesListEl = document.getElementById('modalCasesList');

  if (cases.length > 0) {
    casesPanelEl.style.display = 'block';
    casesListEl.innerHTML = cases.map(c => `
      <div class="modal-case-item">
        <div class="modal-case-header">
          <span class="case-tag ${c.type === 'workplace' ? 'workplace' : ''}">${c.typeLabel}</span>
          <span class="modal-case-title">${c.title}</span>
          <button class="modal-case-copy" onclick="copyModalCase(this, ${JSON.stringify(c.prompt).replace(/</g,'&lt;')})">⎘ 複製案例</button>
        </div>
        <div class="modal-case-section">
          <div class="modal-case-section-label">適用場景</div>
          <div class="modal-case-text">${c.scene}</div>
        </div>
        <div class="modal-case-section">
          <div class="modal-case-section-label">使用前準備</div>
          <div class="modal-case-text">${c.prep}</div>
        </div>
        ${c.tips && c.tips.length > 0 ? `
        <div class="modal-case-section">
          <div class="modal-case-section-label">進階變化</div>
          <div class="modal-case-text">${c.tips.map(t => '• ' + t).join('\n')}</div>
        </div>` : ''}
        <div class="modal-case-section">
          <div class="modal-case-section-label">完整案例提示詞</div>
          <pre class="modal-case-prompt">${c.prompt.replace(/</g,'&lt;')}</pre>
        </div>
      </div>
    `).join('');
  } else {
    casesPanelEl.style.display = 'none';
    casesListEl.innerHTML = '';
  }

  // Copy count
  const copies = getCount(id);
  const modalCountEl = document.getElementById('modalCopyCount');
  modalCountEl.textContent = copies > 0 ? `已複製 ${copies} 次` : '';

  const overlay = document.getElementById('modalOverlay');
  overlay.classList.add('open');
  overlay.dataset.promptId = id;
  document.body.style.overflow = 'hidden';
  document.getElementById('copyConfirm').classList.remove('show');
}

function copyModalCase(btn, text) {
  copyCasePrompt(btn, text);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Copy main prompt ────────────────── */
document.getElementById('copyBtn').addEventListener('click', () => {
  const id = parseInt(document.getElementById('modalOverlay').dataset.promptId);
  const p = PROMPTS.find(x => x.id === id);
  if (!p) return;

  navigator.clipboard.writeText(p.content).then(() => {
    const newCount = incrementCount(id);
    const confirm = document.getElementById('copyConfirm');
    confirm.textContent = `已複製！（第 ${newCount} 次）`;
    confirm.classList.add('show');
    setTimeout(() => confirm.classList.remove('show'), 2400);

    document.getElementById('modalCopyCount').textContent = `已複製 ${newCount} 次`;

    const card = document.querySelector(`.card[data-id="${id}"]`);
    if (card) {
      let badge = card.querySelector('.card-copies');
      if (badge) {
        badge.textContent = `⎘ ${formatCount(newCount)}`;
        badge.classList.remove('card-copies-zero');
        badge.title = `已複製 ${newCount} 次`;
        badge.classList.add('card-copies-bump');
        setTimeout(() => badge.classList.remove('card-copies-bump'), 500);
      }
    }
  });
});

/* ── Category Nav ────────────────────── */
document.getElementById('catNav').addEventListener('click', e => {
  const btn = e.target.closest('.cat-btn');
  if (!btn) return;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentCat = btn.dataset.cat;
  renderCards();
});

/* ── Search ──────────────────────────── */
document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value;
  renderCards();
});

/* ── Modal close ─────────────────────── */
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

/* ── Init ────────────────────────────── */
renderCards();
