/* ── State ───────────────────────────── */
let currentCat = 'all';
let searchQuery = '';

/* ── Download Count Storage ──────────── */
const STORAGE_KEY = 'prompt_copy_counts';

function loadCounts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function getCount(id) {
  return loadCounts()[id] || 0;
}

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
    return `
      <div class="card ${cat.class}" style="animation-delay:${Math.min(i * 0.04, 0.4)}s" data-id="${p.id}">
        <div class="card-top">
          <span class="card-cat">${cat.icon} ${cat.label}</span>
          <span class="card-arrow">↗</span>
        </div>
        <div class="card-title">${p.title}</div>
        <div class="card-preview">${preview}</div>
        <div class="card-footer">
          <span class="card-chars">${charLen.toLocaleString()} 字元</span>
          ${copyBadge}
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => openModal(parseInt(card.dataset.id)));
  });
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

  // Update copy count display in modal
  const copies = getCount(id);
  const modalCountEl = document.getElementById('modalCopyCount');
  modalCountEl.textContent = copies > 0 ? `已複製 ${copies} 次` : '';

  const overlay = document.getElementById('modalOverlay');
  overlay.classList.add('open');
  overlay.dataset.promptId = id;
  document.body.style.overflow = 'hidden';

  document.getElementById('copyConfirm').classList.remove('show');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Copy ────────────────────────────── */
document.getElementById('copyBtn').addEventListener('click', () => {
  const id = parseInt(document.getElementById('modalOverlay').dataset.promptId);
  const p = PROMPTS.find(x => x.id === id);
  if (!p) return;

  navigator.clipboard.writeText(p.content).then(() => {
    // Increment and reflect immediately
    const newCount = incrementCount(id);

    const confirm = document.getElementById('copyConfirm');
    confirm.textContent = `已複製！（第 ${newCount} 次）`;
    confirm.classList.add('show');
    setTimeout(() => confirm.classList.remove('show'), 2400);

    // Update modal count label
    document.getElementById('modalCopyCount').textContent = `已複製 ${newCount} 次`;

    // Update the card badge without full re-render
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
