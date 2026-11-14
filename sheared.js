/* ============================================================
   HZMTube — shared UI kit: icons, artwork, toasts, modals,
   menus, popovers, formatting. Loaded on every page.
   ============================================================ */
(function () {
'use strict';

/* ---------- tiny DOM + format utils ---------- */
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const uid = () => 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const isReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

function fmtViews(n) {
  n = Number(n) || 0;
  if (n < 1000) return String(n);
  if (n < 1e6) return (n / 1e3).toFixed(n < 1e4 ? 1 : 0).replace(/\.0$/, '') + 'K';
  if (n < 1e9) return (n / 1e6).toFixed(n < 1e7 ? 1 : 0).replace(/\.0$/, '') + 'M';
  return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
}
const fmtNum = n => (Number(n) || 0).toLocaleString('en-US');
function fmtDuration(s) {
  s = Math.max(0, Math.round(Number(s) || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? h + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0')
           : m + ':' + String(sec).padStart(2, '0');
}
const fmtDate = ts => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
function timeAgo(ts) {
  const d = Math.max(0, Date.now() - ts) / 1000;
  if (d < 45) return 'just now';
  const u = [[31536000, 'year'], [2592000, 'month'], [604800, 'week'], [86400, 'day'], [3600, 'hour'], [60, 'minute']];
  for (const [s, label] of u) if (d >= s) { const v = Math.floor(d / s); return v + ' ' + label + (v > 1 ? 's' : '') + ' ago'; }
  return 'just now';
}
const initials = name => String(name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

/* ---------- icon library (24px, feather-style) ---------- */
const P = {
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  upload: '<path d="M12 16V4M6 10l6-6 6 6M4 20h16"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  home: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  subs: '<path d="M7 3h10M5 6h14"/><rect x="3" y="9" width="18" height="11" rx="2"/><path d="M11 12.2l4 2.3-4 2.3z" fill="currentColor" stroke="none"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 8v4l3 2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  like: '<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>',
  dislike: '<g transform="rotate(180 12 12)"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></g>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  dots: '<circle cx="12" cy="5" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.7" fill="currentColor" stroke="none"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 5-5.5"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
  eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.3 4 5.4 4 9s-1.5 6.7-4 9c-2.5-2.3-4-5.4-4-9s1.5-6.7 4-9z"/>',
  film: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="10" y="10" width="4" height="4"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  car: '<path d="M3 17h18v-3a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/><path d="M6 12l1.3-3.6A2 2 0 0 1 9.2 7h5.6a2 2 0 0 1 1.9 1.4L18 12"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/>',
  send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
  sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" fill="currentColor" stroke="none"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" fill="currentColor" stroke="none"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  gamepad: '<rect x="2" y="8" width="20" height="9" rx="4.5"/><path d="M6 12.5h4M8 10.5v4"/><circle cx="15.5" cy="13.5" r="1" fill="currentColor" stroke="none"/><circle cx="18" cy="11" r="1" fill="currentColor" stroke="none"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  cooking: '<path d="M5 2v7a3 3 0 0 0 6 0V2M8 2v20"/><path d="M17 2c-1.8 1.2-3 4-3 7v3h3M17 2v20"/>',
  chart: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  'arrow-left': '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  'chev-down': '<path d="M6 9l6 6 6-6"/>',
  'chev-up': '<path d="M18 15l-6-6-6 6"/>',
  'chev-left': '<path d="M15 18l-6-6 6-6"/>',
  'chev-right': '<path d="M9 18l6-6-6-6"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14L21 3"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
  video: '<rect x="2" y="6" width="13" height="12" rx="2"/><path d="M15 10l7-4v12l-7-4z"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  alert: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  theater: '<rect x="2" y="7" width="20" height="10" rx="2"/>',
  pin: '<path d="M12 17v5"/><path d="M7 4h10l-1.5 6.5 2.5 2.5H6l2.5-2.5z"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>'
};
function icon(name, size = 20, cls = '') {
  return '<svg class="ic ' + cls + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || P.play) + '</svg>';
}
const verified = (sz = 13) => '<span class="verified" title="Verified">' + icon('check-circle', sz) + '</span>';
function avatar(ch, size = 36) {
  const c = ch.colors || ['#ff3b5c', '#ff7a45'];
  return '<span class="avatar" style="--av-a:' + c[0] + ';--av-b:' + c[1] + ';width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * .36) + 'px">' + esc(initials(ch.name)) + '</span>';
}

/* ---------- category system ---------- */
const CATS = {
  'Film & Animation': { icon: 'film',     colors: ['#ff3b5c', '#b07cff'] },
  'Tech':             { icon: 'cpu',      colors: ['#3ea6ff', '#26d0ce'] },
  'Autos':            { icon: 'car',      colors: ['#ffb224', '#ff7a45'] },
  'Travel':           { icon: 'send',     colors: ['#2fd57b', '#26d0ce'] },
  'Entertainment':    { icon: 'sparkles', colors: ['#b07cff', '#ff5ca8'] },
  'Music':            { icon: 'music',    colors: ['#ff5ca8', '#b07cff'] },
  'Gaming':           { icon: 'gamepad',  colors: ['#a3e635', '#2fd57b'] },
  'Learning':         { icon: 'book',     colors: ['#26d0ce', '#3ea6ff'] },
  'Vlogs':            { icon: 'video',    colors: ['#ff7a45', '#ffb224'] },
  'Cooking':          { icon: 'cooking',  colors: ['#ffb224', '#ff3b5c'] }
};
const catMeta = c => CATS[c] || { icon: 'play', colors: ['#ff3b5c', '#ff7a45'] };

/* ---------- deterministic generative thumbnails ---------- */
function seedRng(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
function artwork(seed, title, cat) {
  const r = seedRng(String(seed));
  const m = catMeta(cat), a = m.colors[0], b = m.colors[1];
  const ang = Math.floor(r() * 360);
  let shapes = '';
  shapes += '<circle cx="' + (470 + r() * 150) + '" cy="' + (30 + r() * 120) + '" r="' + (95 + r() * 75) + '" fill="' + b + '" opacity=".6" filter="url(#bl)"/>';
  shapes += '<circle cx="' + (50 + r() * 130) + '" cy="' + (260 + r() * 90) + '" r="' + (60 + r() * 65) + '" fill="#ffffff" opacity=".09" filter="url(#bl)"/>';
  shapes += '<circle cx="' + (140 + r() * 340) + '" cy="' + (80 + r() * 180) + '" r="' + (46 + r() * 62) + '" fill="none" stroke="#fff" stroke-width="' + (1.5 + r() * 2).toFixed(1) + '" opacity=".22"/>';
  shapes += '<g transform="rotate(' + (-20 + r() * 40).toFixed(1) + ' 320 180)"><rect x="-120" y="' + (50 + r() * 170) + '" width="880" height="' + (30 + r() * 75) + '" fill="#fff" opacity=".06"/></g>';
  for (let i = 0; i < 11; i++) shapes += '<circle cx="' + (r() * 640).toFixed(0) + '" cy="' + (r() * 360).toFixed(0) + '" r="' + (0.8 + r() * 1.6).toFixed(1) + '" fill="#fff" opacity="' + (.1 + r() * .25).toFixed(2) + '"/>';
  shapes += '<g transform="translate(432 96) scale(7.2)" stroke="#fff" stroke-width="1.1" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".17">' + (P[m.icon] || P.play) + '</g>';
  const words = String(title || 'Untitled').split(/\s+/);
  const lines = []; let cur = '';
  for (const w of words) {
    if (((cur ? cur + ' ' : '') + w).length <= 16) cur = (cur ? cur + ' ' : '') + w;
    else { if (cur) lines.push(cur); cur = w.slice(0, 16); }
    if (lines.length === 2) break;
  }
  if (cur && lines.length < 2) lines.push(cur);
  const truncated = lines.join(' ').length < String(title || '').length;
  if (truncated && lines.length) lines[lines.length - 1] = lines[lines.length - 1].slice(0, 15) + '…';
  const ty = lines.length > 1 ? 262 : 292;
  let text = '<g filter="url(#ts)" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="37" fill="#fff" letter-spacing="-0.5">';
  lines.forEach((ln, i) => { text += '<text x="36" y="' + (ty + i * 44) + '">' + esc(ln) + '</text>'; });
  text += '</g>';
  const catLabel = String(cat || 'Video').toUpperCase();
  const pillW = catLabel.length * 7.6 + 42;
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">' +
    '<defs><linearGradient id="g" gradientTransform="rotate(' + ang + ' .5 .5)"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>' +
    '<radialGradient id="v" cx=".5" cy=".42" r=".85"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>' +
    '<filter id="bl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="38"/></filter>' +
    '<filter id="ts" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="6" flood-opacity=".45"/></filter></defs>' +
    '<rect width="640" height="360" fill="url(#g)"/>' + shapes + '<rect width="640" height="360" fill="url(#v)"/>' +
    '<rect x="36" y="30" width="' + pillW + '" height="26" rx="13" fill="#000" opacity=".38"/>' +
    '<circle cx="50" cy="43" r="3.2" fill="' + b + '"/>' +
    '<text x="60" y="47.5" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="11.5" letter-spacing="1.4" fill="#fff" opacity=".95">' + esc(catLabel) + '</text>' +
    text +
    '<text x="604" y="338" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="13" fill="#fff" opacity=".75">HZM ▶</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/* ---------- rich text ---------- */
function linkify(raw, chapters) {
  const lines = esc(raw).split('\n');
  return lines.map(line => {
    if (chapters) {
      const m = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$/);
      if (m) {
        const parts = m[1].split(':').map(Number);
        const sec = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
        return '<button type="button" class="chapter" data-action="chapter" data-t="' + sec + '">' + icon('play', 12) + m[1] + ' · ' + m[2] + '</button>';
      }
    }
    return line
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/(^|\s)#([A-Za-z0-9_]+)/g, '$1<span class="tagchip" data-action="tag" data-tag="$2" role="button" tabindex="0">#$2</span>');
  }).join('<br>');
}
function highlight(escapedText, q) {
  const terms = String(q || '').trim().split(/\s+/).filter(Boolean).map(t => escRe(esc(t)));
  if (!terms.length) return escapedText;
  try { return escapedText.replace(new RegExp('(' + terms.join('|') + ')', 'gi'), '<mark>$1</mark>'); }
  catch (e) { return escapedText; }
}

/* ---------- scroll lock ---------- */
let locks = 0;
function lock(on) {
  locks = Math.max(0, locks + (on ? 1 : -1));
  document.body.style.overflow = locks ? 'hidden' : '';
}

/* ---------- toasts ---------- */
function toast(msg, opts = {}) {
  const wrap = $('#toasts') || (() => { const d = document.createElement('div'); d.id = 'toasts'; d.className = 'toasts'; document.body.appendChild(d); return d; })();
  while (wrap.children.length >= 3) wrap.firstChild.remove();
  const dur = opts.duration || 4200;
  const el = document.createElement('div');
  el.className = 'toast ' + (opts.type || '');
  el.innerHTML =
    '<span class="toast-ic">' + icon(opts.icon || 'check-circle', 19) + '</span>' +
    '<span class="toast-msg">' + esc(msg) + '</span>' +
    (opts.action ? '<button type="button" class="toast-action">' + esc(opts.action.label) + '</button>' : '') +
    '<button type="button" class="toast-x" aria-label="Dismiss">' + icon('x', 15) + '</button>' +
    '<span class="toast-bar" style="--tb-d:' + dur + 'ms"></span>';
  let gone = false;
  const dismiss = () => { if (gone) return; gone = true; el.classList.add('out'); setTimeout(() => el.remove(), 200); };
  const timer = setTimeout(dismiss, dur);
  el.querySelector('.toast-x').addEventListener('click', () => { clearTimeout(timer); dismiss(); });
  if (opts.action) el.querySelector('.toast-action').addEventListener('click', () => { clearTimeout(timer); dismiss(); opts.action.fn(); });
  wrap.appendChild(el);
  return { close: dismiss };
}
function undoable(msg, onUndo, onCommit, icn) {
  let done = false;
  const t = setTimeout(() => { if (!done) { done = true; if (onCommit) onCommit(); } }, 8000);
  toast(msg, { icon: icn || 'trash', duration: 8000, action: { label: 'Undo', fn: () => { if (done) return; done = true; clearTimeout(t); onUndo(); } } });
}

/* ---------- floating menu ---------- */
let menuState = null;
function closeMenu() { if (menuState) { menuState.el.remove(); menuState = null; } }
function menu(anchor, items) {
  closeMenu(); closePops();
  const el = document.createElement('div');
  el.className = 'menu'; el.setAttribute('role', 'menu');
  el.innerHTML = items.map((it, i) => {
    if (it.sep) return '<div class="menu-sep"></div>';
    if (it.header) return '<div class="menu-header">' + esc(it.header) + '</div>';
    return '<button type="button" class="menu-item' + (it.danger ? ' danger' : '') + '" data-mi="' + i + '" role="menuitem">' +
      '<span class="mi-ic">' + icon(it.icon || 'play', 17) + '</span><span>' + esc(it.label) + '</span>' +
      (it.checked ? '<span class="mi-check">' + icon('check', 15) + '</span>' : '') + '</button>';
  }).join('');
  ($('#menuRoot') || document.body).appendChild(el);
  const r = anchor.getBoundingClientRect(), mw = el.offsetWidth, mh = el.offsetHeight;
  let x = clamp(r.right - mw, 8, innerWidth - mw - 8);
  let y = r.bottom + 6; if (y + mh > innerHeight - 8) y = Math.max(8, r.top - mh - 6);
  el.style.left = x + 'px'; el.style.top = y + 'px';
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-mi]'); if (!b) return;
    const it = items[Number(b.dataset.mi)]; closeMenu(); if (it && it.fn) it.fn();
  });
  menuState = { el, anchor };
  const first = el.querySelector('.menu-item'); if (first) first.focus();
}

/* ---------- popovers ---------- */
const pops = [];
function closePops() { pops.forEach(p => { p.pop.classList.add('hidden'); p.btn.setAttribute('aria-expanded', 'false'); }); }
function togglePop(btn, pop) {
  const isOpen = !pop.classList.contains('hidden');
  closePops(); closeMenu();
  if (!isOpen) { pop.classList.remove('hidden'); btn.setAttribute('aria-expanded', 'true'); }
}
function anyPopOpen() { return pops.some(p => !p.pop.classList.contains('hidden')); }

/* ---------- modals ---------- */
const modalStack = [];
let extraTrap = null;
function setTrap(el) { extraTrap = el; }
function modal(opts) {
  const scrim = document.createElement('div');
  scrim.className = 'modal-scrim';
  scrim.innerHTML =
    '<div class="modal ' + (opts.size || '') + '" role="dialog" aria-modal="true" aria-label="' + esc(opts.title || 'Dialog') + '">' +
    '<button type="button" class="icon-btn modal-x" aria-label="Close">' + icon('x', 19) + '</button>' +
    (opts.title ? '<h3 class="modal-title">' + esc(opts.title) + '</h3>' : '') +
    '<div class="modal-body">' + (opts.html || '') + '</div></div>';
  ($('#modalRoot') || document.body).appendChild(scrim);
  lock(true);
  const el = scrim.querySelector('.modal');
  let closed = false;
  const handle = {
    el, body: scrim.querySelector('.modal-body'), scrim,
    close() {
      if (closed) return; closed = true;
      const i = modalStack.indexOf(handle); if (i > -1) modalStack.splice(i, 1);
      lock(false);
      scrim.classList.add('closing');
      setTimeout(() => scrim.remove(), 160);
      if (opts.onClose) opts.onClose();
    }
  };
  handle.dismissible = opts.dismissible !== false;
  modalStack.push(handle);
  scrim.addEventListener('mousedown', e => { if (e.target === scrim && handle.dismissible) handle.close(); });
  scrim.querySelector('.modal-x').addEventListener('click', () => handle.close());
  setTimeout(() => {
    const f = el.querySelector('[autofocus]') || el.querySelector('input,textarea,select,button:not(.modal-x)') || el.querySelector('.modal-x');
    if (f) f.focus();
  }, 30);
  return handle;
}
function confirmDlg(opts) {
  return new Promise(resolve => {
    let settled = false;
    const done = v => { if (!settled) { settled = true; resolve(v); } };
    const m = modal({
      title: opts.title || 'Are you sure?', size: 'sm',
      html: '<div class="confirm-body">' + (opts.body || '') + '</div>' +
        '<div class="modal-foot" style="border:0;padding:20px 0 0">' +
        '<button type="button" class="btn cf-cancel">Cancel</button>' +
        '<button type="button" class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + ' cf-ok">' + esc(opts.confirmLabel || 'Confirm') + '</button></div>',
      onClose: () => done(false)
    });
    m.body.querySelector('.cf-cancel').addEventListener('click', () => m.close());
    m.body.querySelector('.cf-ok').addEventListener('click', () => { done(true); m.close(); });
  });
}

/* ---------- clipboard ---------- */
function copy(text) {
  const legacy = () => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove(); return ok;
  };
  if (navigator.clipboard && navigator.clipboard.writeText)
    return navigator.clipboard.writeText(text).then(() => true).catch(() => legacy());
  return Promise.resolve(legacy());
}

/* ---------- count-up ---------- */
function countUp(el, to, fmt) {
  fmt = fmt || fmtNum;
  if (el._cu) cancelAnimationFrame(el._cu);
  if (isReduced) { el.textContent = fmt(to); return; }
  const t0 = performance.now(), dur = 850;
  const step = now => {
    const p = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.round(to * e));
    if (p < 1) el._cu = requestAnimationFrame(step);
  };
  el._cu = requestAnimationFrame(step);
}

/* ---------- theme ---------- */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  const meta = $('meta[name="theme-color"]'); if (meta) meta.content = t === 'dark' ? '#0b0b10' : '#f4f3f0';
  const btn = $('#themeBtn'); if (btn) btn.innerHTML = icon(t === 'dark' ? 'sun' : 'moon', 20);
}
function toggleTheme() {
  const S = window.HZMStorage;
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  S.state(d => { d.theme = next; });
  applyTheme(next);
}

/* ---------- shared chrome (topbar behaviours on both pages) ---------- */
let chromeOpts = {};
function notifHtml() {
  const S = window.HZMStorage;
  const st = S.state(), list = S.notifs();
  const colors = { video: '#3ea6ff', chart: '#2fd57b', user: '#b07cff', sparkles: '#ff3b5c' };
  const items = list.map(n => {
    const unread = !(st.notifReadIds || []).includes(n.id);
    return '<button type="button" class="pop-item' + (unread ? ' unread' : '') + '" data-nid="' + n.id + '">' +
      '<span class="notif-ic" style="--ni-c:' + (colors[n.icon] || '#3ea6ff') + '">' + icon(n.icon, 17) + '</span>' +
      '<span class="pop-tx">' + esc(n.text) + '<span class="pop-time">' + timeAgo(n.at) + '</span></span></button>';
  }).join('');
  return '<div class="pop-head"><span>Notifications</span><button type="button" class="btn btn-ghost btn-sm" data-nread>Mark all read</button></div>' +
    '<div class="pop-list">' + (items || '<div class="pop-empty">You\'re all caught up ✨</div>') + '</div>';
}
function refreshBadge() {
  const S = window.HZMStorage, badge = $('#notifBadge'); if (!badge) return;
  const read = S.state().notifReadIds || [];
  const n = S.notifs().filter(x => !read.includes(x.id)).length;
  badge.textContent = n > 9 ? '9+' : String(n);
  badge.classList.toggle('hidden', n === 0);
}
function avatarHtml() {
  const S = window.HZMStorage, u = S.user();
  const dark = document.documentElement.dataset.theme === 'dark';
  return '<div class="avatar-head">' + avatar(u, 42) + '<div><b>' + esc(u.name) + '</b><span>' + esc(u.handle) + ' · ' + fmtViews(u.subs) + ' subscribers</span></div></div>' +
    '<div class="pop-menu">' +
    '<a href="studio.html"><span class="pm-ic">' + icon('user', 18) + '</span>Your channel</a>' +
    '<a href="studio.html"><span class="pm-ic">' + icon('chart', 18) + '</span>Studio dashboard</a>' +
    '<button type="button" data-atheme><span class="pm-ic">' + icon(dark ? 'sun' : 'moon', 18) + '</span>Appearance: ' + (dark ? 'Dark' : 'Light') + '</button>' +
    '<button type="button" class="danger" data-areset><span class="pm-ic">' + icon('refresh', 18) + '</span>Reset demo data</button></div>';
}
async function resetData() {
  closePops();
  const ok = await confirmDlg({
    title: 'Reset HZMTube?', danger: true, confirmLabel: 'Reset everything',
    body: 'This clears <b>all videos, uploads, comments and activity</b> stored in this browser and restores the original demo library.'
  });
  if (ok) { window.HZMStorage.resetAll(); location.href = location.pathname; }
}
function initChrome(opts) {
  chromeOpts = opts || {};
  const S = window.HZMStorage;
  applyTheme(S.state().theme || 'dark');
  const fill = (sel, name, sz) => { const e = $(sel); if (e) e.innerHTML = icon(name, sz || 20); };
  fill('#navToggle', 'menu'); fill('.search-ic', 'search', 18); fill('#searchClear', 'x', 16);
  fill('.search-go', 'search', 19); fill('#searchMobileBtn', 'search'); fill('.bell-ic', 'bell'); fill('.cb-ic', 'upload', 18);
  $$('.bottomnav [data-ic]').forEach(e => { e.innerHTML = icon(e.dataset.ic, 21); });
  $$('.watch-tools [data-ic]').forEach(e => { e.innerHTML = icon(e.dataset.ic, 19); });
  const ab = $('#avatarBtn'); if (ab) ab.innerHTML = avatar(S.user(), 34);
  const tb = $('#themeBtn'); if (tb) tb.addEventListener('click', () => { toggleTheme(); const ap = $('#avatarPop'); if (ap && !ap.classList.contains('hidden')) ap.innerHTML = avatarHtml(); });
  const nt = $('#navToggle'); if (nt) nt.addEventListener('click', () => { if (chromeOpts.onNavToggle) chromeOpts.onNavToggle(); });
  const smb = $('#searchMobileBtn');
  if (smb) smb.addEventListener('click', () => {
    document.body.classList.toggle('search-open');
    if (document.body.classList.contains('search-open')) { const si = $('#searchInput'); if (si) si.focus(); }
  });
  const nb = $('#notifBtn'), np = $('#notifPop'), apb = $('#avatarBtn'), ap = $('#avatarPop');
  if (nb && np) { pops.push({ btn: nb, pop: np }); nb.addEventListener('click', () => { np.innerHTML = notifHtml(); togglePop(nb, np); }); }
  if (apb && ap) { pops.push({ btn: apb, pop: ap }); apb.addEventListener('click', () => { ap.innerHTML = avatarHtml(); togglePop(apb, ap); }); }
  document.addEventListener('click', e => {
    if (np && !np.classList.contains('hidden')) {
      const item = e.target.closest('[data-nid]');
      const readAll = e.target.closest('[data-nread]');
      if (readAll) { S.markNotifRead(S.notifs().map(n => n.id)); np.innerHTML = notifHtml(); refreshBadge(); return; }
      if (item) {
        const n = S.notifs().find(x => x.id === item.dataset.nid);
        S.markNotifRead([item.dataset.nid]); refreshBadge(); closePops();
        if (n && n.video) { if (chromeOpts.openVideo) chromeOpts.openVideo(n.video); else location.href = 'index.html?v=' + n.video; }
        else if (n && n.action === 'upload') location.href = 'studio.html?upload=1';
        return;
      }
    }
    if (ap && !ap.classList.contains('hidden')) {
      if (e.target.closest('[data-atheme]')) { toggleTheme(); ap.innerHTML = avatarHtml(); return; }
      if (e.target.closest('[data-areset]')) { resetData(); return; }
    }
    if (menuState && !e.target.closest('.menu') && !menuState.anchor.contains(e.target)) closeMenu();
    if (!e.target.closest('.tb-pop-wrap')) closePops();
  });
  window.addEventListener('scroll', () => closeMenu(), { passive: true, capture: true });
  window.addEventListener('resize', () => { closeMenu(); closePops(); });
  document.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if (e.key === 'Escape') {
      if (menuState) { closeMenu(); return; }
      if (anyPopOpen()) { closePops(); return; }
      if (modalStack.length) { const top = modalStack[modalStack.length - 1]; if (top.dismissible) top.close(); return; }
      if (document.body.classList.contains('search-open')) { document.body.classList.remove('search-open'); return; }
      if (chromeOpts.onEsc) chromeOpts.onEsc();
      return;
    }
    if (e.key === '/' && !typing && !modalStack.length) {
      e.preventDefault();
      if (innerWidth <= 700) document.body.classList.add('search-open');
      const si = $('#searchInput'); if (si) si.focus();
    }
    if (e.key === 'Tab') {
      const trapEl = modalStack.length ? modalStack[modalStack.length - 1].el : extraTrap;
      if (!trapEl) return;
      const f = $$('a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])', trapEl)
        .filter(x => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  refreshBadge();
}
function uiBusy() { return !!menuState || anyPopOpen() || modalStack.length > 0; }

/* ---------- expose ---------- */
window.HZM = {
  $, $$, esc, escRe, uid, clamp, debounce, isReduced, canHover,
  fmtViews, fmtNum, fmtDuration, fmtDate, timeAgo, initials,
  icon, verified, avatar, CATS, catMeta, artwork, seedRng, linkify, highlight,
  lock, toast, undoable, menu, closeMenu, closePops, modal, confirm: confirmDlg,
  copy, countUp, applyTheme, toggleTheme, initChrome, refreshBadge, uiBusy, setTrap, resetData
};
})();
