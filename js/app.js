/* PTT 股板知識庫 — 動態渲染引擎 */

const STATE = { dates: [], current: null, cache: {} };

/* ── 入口 ── */
async function init() {
  try {
    const idx = await fetchJSON('data/index.json');
    STATE.dates = idx.dates || [];
    buildDateNav();
    if (STATE.dates.length) await loadDay(STATE.dates[0]);
  } catch (e) {
    showError('無法載入資料索引，請確認 data/index.json 存在。');
  }
}

/* ── 日期導覽列 ── */
function buildDateNav() {
  const nav = document.getElementById('date-nav');
  nav.innerHTML = STATE.dates.map(d => {
    const label = fmtDateLabel(d);
    return `<button class="date-btn" data-date="${d}" onclick="loadDay('${d}')">${label}</button>`;
  }).join('');
  updateCounter();
}

function fmtDateLabel(iso) {
  const [, m, dd] = iso.split('-');
  return `${parseInt(m)}/${parseInt(dd)}`;
}

/* ── 載入單日資料 ── */
async function loadDay(date) {
  if (STATE.current === date) return;

  document.querySelectorAll('.date-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.date === date);
  });

  showLoading();

  try {
    if (!STATE.cache[date]) {
      STATE.cache[date] = await fetchJSON(`data/${date}.json`);
    }
    STATE.current = date;
    renderDay(STATE.cache[date]);
    showTab('timeline'); // 切換到時間軸 tab
  } catch {
    showError(`找不到 ${date} 的資料檔。`);
  }
}

/* ── 主渲染 ── */
function renderDay(d) {
  document.getElementById('day-title').textContent =
    `${d.date.replace(/-/g,'/')} (${d.weekday}) — ${d.summary}`;

  renderTimeline(d);
  renderArticles(d);
  renderMetrics(d);
}

/* ── 時間軸 ── */
function renderTimeline(d) {
  const el = document.getElementById('timeline-content');
  if (!d.events || !d.events.length) {
    el.innerHTML = '<p class="empty">本日無事件記錄。</p>'; return;
  }
  el.innerHTML = d.events.map(ev => `
    <div class="event-card ${ev.type || ''}">
      <div class="event-title">${ev.title}</div>
      <div class="event-body">${ev.body}</div>
      ${ev.impacts && ev.impacts.length ? `
        <div class="event-impact">
          ${ev.impacts.map(i => `<span class="impact-tag ${i.dir}">${i.label}</span>`).join('')}
        </div>` : ''}
    </div>`).join('');
}

/* ── 文章列表 ── */
const CAT_META = {
  news:     { label: '新聞', bg: '#fee2e2', color: '#991b1b' },
  analysis: { label: '心得', bg: '#fef3c7', color: '#92400e' },
  data:     { label: '情報', bg: '#d1fae5', color: '#065f46' },
  target:   { label: '標的', bg: '#dbeafe', color: '#1d4ed8' },
  qna:      { label: '請益', bg: '#ede9fe', color: '#6d28d9' },
  other:    { label: '其他', bg: '#f1f5f9', color: '#475569' },
};

function renderArticles(d) {
  const el = document.getElementById('articles-content');
  if (!d.articles || !d.articles.length) {
    el.innerHTML = '<p class="empty">本日無文章記錄。</p>'; return;
  }
  const groups = {};
  d.articles.forEach(a => {
    const cat = a.cat || 'other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(a);
  });
  const ORDER = ['target','news','analysis','data','qna','other'];
  el.innerHTML = ORDER.filter(c => groups[c]).map(c => {
    const m = CAT_META[c] || CAT_META.other;
    return `
      <div class="article-group">
        <div class="group-label" style="background:${m.bg};color:${m.color}">${m.label}</div>
        <div class="article-list">
          ${groups[c].map(a => `
            <div class="article-item ${a.hot ? 'hot' : ''}">
              <span class="art-icon">${a.icon || '📄'}</span>
              <div class="art-info">
                <div class="art-title">
                  <a href="${a.url}" target="_blank" rel="noopener">${a.title}</a>
                  ${a.hot ? '<span class="hot-badge">🔥 熱門</span>' : ''}
                </div>
                <div class="art-meta">
                  <span>👤 ${a.author}</span>
                  <span>📅 ${a.date}</span>
                </div>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  }).join('');
}

/* ── 數據指標 ── */
function renderMetrics(d) {
  const el = document.getElementById('metrics-content');
  if (!d.metrics || !d.metrics.length) {
    el.innerHTML = ''; return;
  }
  const colorMap = { red:'#dc3545', green:'#198754', orange:'#fd7e14', blue:'#0d6efd', purple:'#6f42c1' };
  el.innerHTML = `<div class="metrics-row">` +
    d.metrics.map(m => `
      <div class="metric-card" style="border-top-color:${colorMap[m.color]||'#0d6efd'}">
        <div class="metric-value" style="color:${colorMap[m.color]||'#0d6efd'}">${m.value}</div>
        <div class="metric-label">${m.label}</div>
        <div class="metric-sub">${m.sub || ''}</div>
      </div>`).join('') + `</div>`;
}

/* ── Tab 切換 ── */
function showTab(id) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const pane = document.getElementById('pane-' + id);
  const btn  = document.querySelector(`.tab-btn[data-tab="${id}"]`);
  if (pane) pane.classList.add('active');
  if (btn)  btn.classList.add('active');
}

/* ── UI 工具 ── */
function showLoading() {
  ['timeline-content','articles-content'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<div class="loading">⏳ 載入中…</div>';
  });
  const m = document.getElementById('metrics-content');
  if (m) m.innerHTML = '';
}

function showError(msg) {
  document.getElementById('timeline-content').innerHTML =
    `<div class="error-msg">⚠️ ${msg}</div>`;
}

function updateCounter() {
  const el = document.getElementById('day-count');
  if (el) el.textContent = STATE.dates.length;
}

async function fetchJSON(url) {
  const r = await fetch(url + '?t=' + Date.now());
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

/* ── 啟動 ── */
document.addEventListener('DOMContentLoaded', init);
