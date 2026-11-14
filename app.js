/* ============================================================
   HZMTube — homepage: feed, search, watch player, comments,
   channels, likes, subscriptions, history & watch later.
   ============================================================ */
(function () {
'use strict';
const U = window.HZM, S = window.HZMStorage;
const { $, $$, esc, icon, avatar, verified, fmtViews, fmtNum, fmtDuration, fmtDate, timeAgo } = U;

const view = { mode: 'home', cat: 'all', q: '', sort: 'newest', channel: null };
let watchId = null, player = null, playerToken = 0, watchStartAt = 0, lastPosSave = 0;
let commentSort = 'top';
const els = {};

/* ================= feed ================= */
function feed() {
  const st = S.state();
  let list = S.videos().filter(v => v.visibility !== 'private' && !st.hidden.includes(v.id));
  const personal = ['liked', 'later', 'history'].includes(view.mode);
  if (!personal) list = list.filter(v => v.visibility === 'public');
  if (view.mode === 'liked') list = list.filter(v => st.reactions[v.id] === 'like');
  if (view.mode === 'later') list = list.filter(v => st.watchLater.includes(v.id));
  if (view.mode === 'history') {
    const order = st.history.map(h => h.id);
    list = list.filter(v => order.includes(v.id));
  }
  if (view.mode === 'subs') list = list.filter(v => st.subs.includes(v.channel));
  if (view.mode === 'channel') list = list.filter(v => v.channel === view.channel && v.visibility === 'public');
  if (view.q) {
    const terms = view.q.toLowerCase().split(/\s+/).filter(Boolean);
    list = list.filter(v => {
      const hay = (v.title + ' ' + v.description + ' ' + v.tags.join(' ') + ' ' + S.channel(v.channel).name + ' ' + v.category).toLowerCase();
      return terms.every(t => hay.includes(t));
    });
  }
  if (view.cat !== 'all') list = list.filter(v => v.category === view.cat);
  const by = {
    newest: (a, b) => b.createdAt - a.createdAt,
    oldest: (a, b) => a.createdAt - b.createdAt,
    views: (a, b) => b.views - a.views,
    az: (a, b) => a.title.localeCompare(b.title)
  }[view.sort] || ((a, b) => b.createdAt - a.createdAt);
  if (view.mode === 'history' && view.sort === 'newest') {
    const order = st.history.map(h => h.id);
    list.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  } else list.sort(by);
  return list;
}

/* ================= cards & grid ================= */
function cardHtml(v, i) {
  const ch = S.channel(v.channel), st = S.state();
  const pos = st.positions[v.id] || 0;
  const prog = pos > 5 && v.duration ? U.clamp(pos / v.duration * 100, 2, 98) : 0;
  return '<article class="card" style="--i:' + (i % 12) + '" data-action="watch" data-id="' + v.id + '" tabindex="0" aria-label="' + esc(v.title) + '">' +
    '<div class="thumb">' +
      '<img class="thumb-img" src="' + v.thumb + '" alt="" loading="lazy">' +
      (v.duration ? '<span class="thumb-badge">' + fmtDuration(v.duration) + '</span>' : '') +
      (prog ? '<span class="thumb-progress" style="width:' + prog + '%"></span>' : '') +
    '</div>' +
    '<div class="card-body">' +
      '<button type="button" class="card-avatar" data-action="channel" data-id="' + ch.id + '" aria-label="' + esc(ch.name) + '">' + avatar(ch, 36) + '</button>' +
      '<div class="card-info">' +
        '<h3 class="card-title">' + U.highlight(esc(v.title), view.q) + '</h3>' +
        '<button type="button" class="card-ch" data-action="channel" data-id="' + ch.id + '"><span class="ch-n">' + esc(ch.name) + '</span>' + (ch.verified ? verified() : '') + '</button>' +
        '<div class="card-stats">' + fmtViews(v.views) + ' views · ' + timeAgo(v.createdAt) + '</div>' +
      '</div>' +
      '<button type="button" class="card-menu" data-action="card-menu" data-id="' + v.id + '" aria-label="More actions">' + icon('dots', 18) + '</button>' +
    '</div></article>';
}
const EMPTY_COPY = {
  home: ['search', 'Nothing here yet', 'Try a different category, or upload the first video from your Studio.'],
  trending: ['trend', 'No trending videos', 'Videos will appear here as they gain views.'],
  subs: ['subs', 'No subscriptions yet', 'Subscribe to channels and their latest uploads will show up here.'],
  liked: ['like', 'No liked videos yet', 'Tap the like button on any video and it will be saved here.'],
  later: ['clock', 'Your Watch later list is empty', 'Save videos from the ⋮ menu on any card to watch them later.'],
  history: ['history', 'No watch history', 'Videos you watch will appear here so you can pick up where you left off.'],
  channel: ['video', 'No public videos', 'This channel hasn\'t published anything public yet.'],
  search: ['search', 'No results found', 'Try different keywords or remove some filters.']
};
function renderGrid(animate) {
  stopPreview();
  const list = feed();
  els.grid.classList.toggle('anim', !!animate && !U.isReduced);
  els.grid.innerHTML = list.map(cardHtml).join('');
  if (!list.length) {
    const key = view.q ? 'search' : view.mode;
    const [ic, h, p] = EMPTY_COPY[key] || EMPTY_COPY.home;
    const btn = view.q || view.cat !== 'all'
      ? '<button type="button" class="btn btn-primary" data-action="clear-filters">' + icon('refresh', 16) + 'Clear search & filters</button>'
      : (view.mode === 'home'
        ? '<a class="btn btn-primary" href="studio.html?upload=1">' + icon('upload', 16) + 'Upload a video</a>'
        : '<button type="button" class="btn btn-primary" data-action="nav" data-nav="home">' + icon('home', 16) + 'Browse videos</button>');
    els.empty.innerHTML = '<div class="empty"><div class="empty-art">' + icon(ic, 46) + '</div><h3>' + h + '</h3><p>' + p + '</p>' + btn + '</div>';
  } else els.empty.innerHTML = '';
}

/* ================= page head / banner / chips / sidebar ================= */
function renderHead() {
  const n = feed().length;
  const count = n + ' video' + (n === 1 ? '' : 's');
  if (view.mode === 'channel') {
    const ch = S.channel(view.channel), st = S.state();
    const mine = ch.id === 'you', sub = st.subs.includes(ch.id);
    els.head.innerHTML =
      '<div class="channel-banner" style="--cb-a:' + ch.colors[0] + ';--cb-b:' + ch.colors[1] + '">' +
      '<button type="button" class="cb-back" data-action="nav" data-nav="home">' + icon('arrow-left', 16) + 'Back to home</button>' +
      '<div class="cb-inner">' + avatar(ch, 76) +
      '<div><div class="cb-name">' + esc(ch.name) + (ch.verified ? verified(17) : '') + '</div>' +
      '<div class="cb-meta">' + esc(ch.handle) + ' · ' + fmtViews(ch.subs) + ' subscribers · ' + count + '</div></div>' +
      '<div class="cb-actions">' + (mine
        ? '<a class="btn" style="background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.35);color:#fff" href="studio.html">' + icon('edit', 16) + 'Manage in Studio</a>'
        : '<button type="button" class="btn ' + (sub ? '' : 'btn-primary') + '" data-action="subscribe" data-sub="' + ch.id + '" data-ch="' + ch.id + '" style="' + (sub ? 'background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.35);color:#fff' : '') + '">' + icon(sub ? 'bell' : 'plus', 16) + (sub ? 'Subscribed' : 'Subscribe') + '</button>') +
      '</div></div></div>';
    return;
  }
  if (view.q) {
    els.head.innerHTML = '<div class="pagehead"><div class="ph-left"><span class="ph-icon" style="--ph-c:#3ea6ff">' + icon('search', 22) + '</span>' +
      '<div><h1 class="ph-title">Results for “' + esc(view.q) + '”</h1><div class="ph-sub">' + count + '</div></div></div>' +
      '<button type="button" class="btn btn-ghost" data-action="clear-search">' + icon('x', 15) + 'Clear search</button></div>';
    return;
  }
  const meta = {
    trending: ['trend', '#ff7a45', 'Trending now', 'The most-watched videos on HZMTube right now', true],
    subs: ['subs', '#3ea6ff', 'Subscriptions', 'Fresh uploads from channels you follow'],
    liked: ['like', '#ff3b5c', 'Liked videos', count],
    later: ['clock', '#ffb224', 'Watch later', count],
    history: ['history', '#b07cff', 'Watch history', count]
  }[view.mode];
  if (!meta) { els.head.innerHTML = ''; return; }
  els.head.innerHTML = '<div class="pagehead"><div class="ph-left"><span class="ph-icon" style="--ph-c:' + meta[1] + '">' + icon(meta[0], 22) + '</span>' +
    '<div><h1 class="ph-title' + (meta[4] ? ' grad' : '') + '">' + meta[2] + '</h1><div class="ph-sub">' + meta[3] + '</div></div></div>' +
    (view.mode === 'history' && n ? '<button type="button" class="btn btn-ghost" data-action="history-clear">' + icon('trash', 15) + 'Clear all history</button>' : '') +
    '</div>';
}
function renderBanner() {
  const st = S.state();
  if (st.bannerDismissed || view.mode !== 'home' || view.q) { els.banner.innerHTML = ''; return; }
  els.banner.innerHTML = '<div class="banner"><span class="banner-ic">' + icon('sparkles', 22) + '</span>' +
    '<div class="banner-tx"><b>Welcome to HZMTube</b><span>Everything you watch and upload is saved right in your browser. Open the Studio to publish your first video.</span></div>' +
    '<a class="btn btn-primary btn-sm" href="studio.html?upload=1">' + icon('upload', 15) + 'Open Studio</a>' +
    '<button type="button" class="icon-btn" data-action="banner-dismiss" aria-label="Dismiss">' + icon('x', 17) + '</button></div>';
}
function renderChips() {
  const st = S.state();
  const pub = S.videos().filter(v => v.visibility === 'public' && !st.hidden.includes(v.id));
  const counts = {};
  pub.forEach(v => { counts[v.category] = (counts[v.category] || 0) + 1; });
  const order = Object.keys(U.CATS).filter(c => counts[c]).concat(Object.keys(counts).filter(c => !U.CATS[c]));
  const chip = (val, label, color) => '<button type="button" class="chip' + (view.cat === val ? ' active' : '') + '" role="tab" aria-selected="' + (view.cat === val) + '" data-action="chip" data-cat="' + esc(val) + '">' +
    (color ? '<span class="chip-dot" style="--cd:' + color + '"></span>' : '') + esc(label) + '</button>';
  els.chips.innerHTML = chip('all', 'All', null) + order.map(c => chip(c, c, U.catMeta(c).colors[0])).join('');
  const showBar = ['home', 'trending', 'subs'].includes(view.mode);
  $('#chipbar').classList.toggle('hidden', !showBar);
  requestAnimationFrame(updateChipArrows);
}
function updateChipArrows() {
  const bar = $('#chipbar'), sc = els.chips;
  const over = sc.scrollWidth > sc.clientWidth + 4;
  bar.classList.toggle('no-overflow', !over);
  $('#chipPrev').disabled = sc.scrollLeft < 8;
  $('#chipNext').disabled = sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 8;
}
function renderSidebar() {
  const st = S.state();
  const liked = Object.values(st.reactions).filter(r => r === 'like').length;
  const item = (nav, ic, label, count, active) =>
    '<button type="button" class="sb-item' + (active ? ' active' : '') + '" data-action="nav" data-nav="' + nav + '">' +
    '<span class="sb-ic">' + icon(ic, 20) + '</span><span>' + label + '</span>' +
    (count ? '<span class="sb-count">' + count + '</span>' : '') + '</button>';
  const subChs = st.subs.map(S.channel);
  const explore = Object.keys(U.CATS).slice(0, 4);
  els.sidebar.innerHTML =
    '<div class="sb-section">' +
      item('home', 'home', 'Home', 0, view.mode === 'home' && !view.q) +
      item('trending', 'trend', 'Trending', 0, view.mode === 'trending') +
      item('subs', 'subs', 'Subscriptions', subChs.length, view.mode === 'subs') +
    '</div><div class="sb-hr sb-full"></div>' +
    '<div class="sb-section"><div class="sb-label sb-full">You</div>' +
      item('history', 'history', 'History', st.history.length, view.mode === 'history') +
      item('liked', 'like', 'Liked videos', liked, view.mode === 'liked') +
      item('later', 'clock', 'Watch later', st.watchLater.length, view.mode === 'later') +
      '<a class="sb-item sb-full" href="studio.html"><span class="sb-ic">' + icon('video', 20) + '</span><span>Your videos</span></a>' +
    '</div><div class="sb-hr sb-full"></div>' +
    '<div class="sb-section sb-full"><div class="sb-label">Subscriptions</div>' +
      (subChs.length ? subChs.slice(0, 5).map(c =>
        '<button type="button" class="sb-item" data-action="channel" data-id="' + c.id + '">' + avatar(c, 24) + '<span>' + esc(c.name) + '</span>' + (c.verified ? verified(12) : '') + '</button>').join('')
        : '<div class="sb-empty">Channels you subscribe to will appear here.</div>') +
    '</div><div class="sb-hr sb-full"></div>' +
    '<div class="sb-section sb-full"><div class="sb-label">Explore</div>' +
      explore.map(c => '<button type="button" class="sb-item" data-action="explore" data-cat="' + esc(c) + '"><span class="sb-ic" style="color:' + U.catMeta(c).colors[0] + '">' + icon(U.catMeta(c).icon, 20) + '</span><span>' + esc(c) + '</span></button>').join('') +
    '</div>' +
    '<div class="sb-foot sb-full">HZMTube · local-first demo<br>© 2026 HZM. All data stays on this device.</div>';
  $$('.bn-item[data-nav]').forEach(b => b.classList.toggle('active', b.dataset.nav === view.mode && !view.q));
}
function renderAll(animate) {
  renderSidebar(); renderChips(); renderHead(); renderBanner(); renderGrid(animate);
  els.sortSel.value = view.sort;
}

/* ================= navigation ================= */
function setMode(mode, extra) {
  stopPreview();
  view.mode = mode; view.q = ''; view.cat = 'all'; view.channel = null;
  view.sort = mode === 'trending' ? 'views' : 'newest';
  Object.assign(view, extra || {});
  els.searchInput.value = ''; els.searchClear.classList.add('hidden'); hideSuggest();
  closeDrawer();
  syncUrl();
  renderAll(true);
  window.scrollTo({ top: 0, behavior: U.isReduced ? 'auto' : 'smooth' });
}
function toggleSidebar() {
  if (innerWidth >= 1100) {
    const rail = document.body.classList.toggle('sb-rail');
    S.state(d => { d.sidebar = rail ? 'rail' : 'expanded'; });
  } else {
    const open = document.body.classList.toggle('drawer-open');
    $('#drawerScrim').classList.toggle('hidden', !open);
    U.lock(open);
  }
}
function closeDrawer() {
  if (document.body.classList.contains('drawer-open')) {
    document.body.classList.remove('drawer-open');
    $('#drawerScrim').classList.add('hidden'); U.lock(false);
  }
}

/* ================= hover previews ================= */
let pv = { card: null, el: null, timer: null, token: 0 };
function canPreview() {
  return U.canHover && !U.isReduced && !(navigator.connection && navigator.connection.saveData) && !watchId;
}
function stopPreview() {
  clearTimeout(pv.timer); pv.token++;
  if (pv.el) { try { pv.el.pause(); } catch (e) {} pv.el.remove(); pv.el = null; }
  pv.card = null;
}
function startPreview(thumb) {
  const card = thumb.closest('.card'); if (!card) return;
  const v = S.get(card.dataset.id); if (!v) return;
  const token = ++pv.token;
  S.resolveSrc(v).then(src => {
    if (token !== pv.token || pv.card !== thumb || !src) return;
    const el = document.createElement('video');
    el.className = 'thumb-preview'; el.muted = true; el.loop = true; el.playsInline = true; el.preload = 'auto';
    el.src = src;
    el.addEventListener('playing', () => el.classList.add('on'));
    el.addEventListener('error', () => { if (pv.el === el) stopPreview(); });
    thumb.appendChild(el); pv.el = el;
    el.play().catch(() => {});
  });
}

/* ================= watch player ================= */
function related(v) {
  const st = S.state();
  return S.videos()
    .filter(x => x.visibility === 'public' && x.id !== v.id && !st.hidden.includes(x.id))
    .map(x => ({ x, s: (x.category === v.category ? 2 : 0) + (x.channel === v.channel ? 1 : 0) }))
    .sort((a, b) => b.s - a.s || b.x.views - a.x.views)
    .slice(0, 12).map(o => o.x);
}
function unItem(x) {
  const ch = S.channel(x.channel);
  return '<button type="button" class="un-item" data-action="upnext" data-id="' + x.id + '">' +
    '<span class="un-thumb"><img src="' + x.thumb + '" alt="">' + (x.duration ? '<span class="thumb-badge">' + fmtDuration(x.duration) + '</span>' : '') + '</span>' +
    '<span class="un-meta"><span class="un-title">' + esc(x.title) + '</span>' +
    '<span class="un-ch">' + esc(ch.name) + (ch.verified ? verified(11) : '') + '</span>' +
    '<span class="un-stats">' + fmtViews(x.views) + ' views · ' + timeAgo(x.createdAt) + '</span></span></button>';
}
function watchButtonsHtml(v) {
  const st = S.state(), ch = S.channel(v.channel);
  const react = st.reactions[v.id];
  const saved = st.watchLater.includes(v.id);
  const mine = v.channel === 'you', sub = st.subs.includes(v.channel);
  const likes = v.likes + (react === 'like' ? 1 : 0);
  return {
    channel:
      '<button type="button" class="card-avatar" data-action="channel" data-id="' + ch.id + '">' + avatar(ch, 42) + '</button>' +
      '<div class="wc-info"><button type="button" class="wc-name" data-action="channel" data-id="' + ch.id + '">' + esc(ch.name) + (ch.verified ? verified() : '') + '</button>' +
      '<div class="wc-subs">' + fmtViews(ch.subs) + ' subscribers</div></div>' +
      (mine
        ? '<a class="btn sub-btn" href="studio.html?edit=' + v.id + '">' + icon('edit', 15) + 'Edit in Studio</a>'
        : '<button type="button" class="btn sub-btn ' + (sub ? 'on' : 'btn-primary') + '" data-action="subscribe" data-sub="' + ch.id + '" data-ch="' + ch.id + '" aria-pressed="' + sub + '">' + icon(sub ? 'bell' : 'plus', 15) + '<span>' + (sub ? 'Subscribed' : 'Subscribe') + '</span></button>'),
    actions:
      '<div class="likegroup">' +
        '<button type="button" class="action-btn' + (react === 'like' ? ' on' : '') + '" data-action="like" aria-pressed="' + (react === 'like') + '" title="Like (I like this)">' + icon('like', 18) + '<span class="like-count">' + fmtViews(likes) + '</span></button>' +
        '<span class="lg-div"></span>' +
        '<button type="button" class="action-btn' + (react === 'dislike' ? ' on' : '') + '" data-action="dislike" aria-pressed="' + (react === 'dislike') + '" title="Dislike">' + icon('dislike', 18) + '</button>' +
      '</div>' +
      '<button type="button" class="action-btn" data-action="share-video">' + icon('share', 17) + '<span>Share</span></button>' +
      '<button type="button" class="action-btn' + (saved ? ' on' : '') + '" data-action="save-video" aria-pressed="' + saved + '">' + icon(saved ? 'check' : 'clock', 17) + '<span>' + (saved ? 'Saved' : 'Save') + '</span></button>' +
      '<button type="button" class="action-btn" data-action="watch-more" aria-label="More actions" style="padding:9px 11px">' + icon('dots', 18) + '</button>'
  };
}
function commentsHtml(v) {
  const st = S.state();
  const list = S.comments(v.id).slice();
  const pinned = list.filter(c => c.pinned), rest = list.filter(c => !c.pinned);
  rest.sort(commentSort === 'newest' ? (a, b) => b.at - a.at : (a, b) => b.likes - a.likes);
  const sorted = pinned.concat(rest);
  const u = S.user();
  const rows = sorted.map(c => {
    const liked = !!st.likedComments[c.id], disliked = !!st.dislikedComments[c.id];
    return '<div class="comment" data-cid="' + c.id + '">' +
      avatar({ name: c.name, colors: c.colors }, 36) +
      '<div class="c-body"><div class="c-head">' +
        (c.pinned ? '<span class="c-pin">' + icon('pin', 12) + 'Pinned by creator</span>' : '') +
        '<span class="c-name' + (c.owner ? ' owner' : '') + '">' + esc(c.name) + '</span><span class="c-time">' + timeAgo(c.at) + '</span></div>' +
      '<div class="c-text">' + esc(c.text).replace(/\n/g, '<br>') + '</div>' +
      '<div class="c-actions">' +
        '<button type="button" class="c-like' + (liked ? ' on' : '') + '" data-action="comment-like" data-cid="' + c.id + '" aria-pressed="' + liked + '">' + icon('like', 15) + '<span>' + (c.likes + (liked ? 1 : 0) || '') + '</span></button>' +
        '<button type="button" class="c-dislike' + (disliked ? ' on' : '') + '" data-action="comment-dislike" data-cid="' + c.id + '" aria-pressed="' + disliked + '" aria-label="Dislike comment">' + icon('dislike', 15) + '</button>' +
        (c.own ? '<button type="button" class="c-like" data-action="comment-menu" data-cid="' + c.id + '" aria-label="Comment actions">' + icon('dots', 15) + '</button>' : '') +
      '</div></div></div>';
  }).join('');
  return '<section class="comments"><div class="cm-head"><h3>' + list.length + ' Comment' + (list.length === 1 ? '' : 's') + '</h3>' +
    '<select class="cm-sort" id="commentSort" aria-label="Sort comments"><option value="top"' + (commentSort === 'top' ? ' selected' : '') + '>Top comments</option><option value="newest"' + (commentSort === 'newest' ? ' selected' : '') + '>Newest first</option></select></div>' +
    '<form class="cform" id="cform">' + avatar(u, 36) +
      '<div class="cform-main"><input class="cinput" id="cinput" placeholder="Add a comment…" maxlength="600" autocomplete="off" aria-label="Add a comment">' +
      '<div class="cform-actions"><button type="button" class="btn btn-ghost btn-sm" data-action="comment-cancel">Cancel</button>' +
      '<button type="submit" class="btn btn-primary btn-sm" id="csubmit" disabled>Comment</button></div></div></form>' +
    '<div id="commentList">' + rows + '</div></section>';
}
function destroyPlayer() {
  if (!player) return;
  const v = S.get(watchId);
  try {
    if (v && player.el.currentTime > 5 && !player.el.ended)
      S.state(d => { d.positions[v.id] = Math.floor(player.el.currentTime); });
    player.el.pause(); player.el.removeAttribute('src'); player.el.load();
  } catch (e) {}
  player.el.remove(); player = null;
}
function mountPlayer(v) {
  destroyPlayer();
  const wrap = $('#playerWrap'); if (!wrap) return;
  const token = ++playerToken;
  const el = document.createElement('video');
  el.controls = true; el.playsInline = true; el.preload = 'metadata'; el.poster = v.thumb;
  wrap.prepend(el);
  player = { el, id: v.id };
  const overlay = $('#playerOverlay'), errBox = $('#playerError');
  overlay.classList.remove('hidden'); errBox.classList.add('hidden');
  el.addEventListener('playing', () => overlay.classList.add('hidden'), { once: false });
  el.addEventListener('error', () => { if (token === playerToken) showPlayerError(v, 'The video source could not be loaded. Check your connection and try again.'); });
  el.addEventListener('timeupdate', () => {
    const now = Date.now();
    if (now - lastPosSave > 4000 && el.currentTime > 5) {
      lastPosSave = now;
      S.state(d => { d.positions[v.id] = Math.floor(el.currentTime); });
    }
  });
  el.addEventListener('ended', () => {
    S.state(d => { delete d.positions[v.id]; });
    if (S.state().autoplay) {
      const next = related(v)[0];
      if (next) { U.toast('Up next: ' + next.title, { icon: 'play', type: 'info' }); openWatch(next.id, { autoplay: true }); }
    }
  });
  S.resolveSrc(v).then(src => {
    if (token !== playerToken) return;
    if (!src) { showPlayerError(v, v.source.type === 'local' ? 'This uploaded file isn\'t available on this device anymore. Replace the file from your Studio to restore playback.' : 'No video source is attached to this record.'); return; }
    el.src = src;
    el.addEventListener('loadedmetadata', () => {
      if (token !== playerToken) return;
      const st = S.state();
      const start = watchStartAt || st.positions[v.id] || 0;
      if (start > 10 && start < (el.duration || Infinity) - 12) {
        el.currentTime = start;
        U.toast('Resumed from ' + fmtDuration(start), { icon: 'history', type: 'info' });
      }
      watchStartAt = 0;
    }, { once: true });
    el.play().catch(() => {});
  });
}
function showPlayerError(v, msg) {
  const overlay = $('#playerOverlay'), errBox = $('#playerError');
  if (!errBox) return;
  overlay.classList.add('hidden');
  errBox.classList.remove('hidden');
  errBox.innerHTML = '<span class="pe-ic">' + icon('alert', 40) + '</span><h4>This video couldn\'t be loaded</h4><p>' + esc(msg) + '</p>' +
    '<div class="pe-actions"><button type="button" class="btn btn-primary btn-sm" data-action="retry-video">' + icon('refresh', 15) + 'Retry</button>' +
    (v.source.type === 'local' ? '<a class="btn btn-sm" href="studio.html?edit=' + v.id + '">' + icon('edit', 15) + 'Replace file in Studio</a>' : '') + '</div>';
}
function openWatch(id, opts) {
  opts = opts || {};
  const v = S.get(id);
  if (!v) { U.toast('That video no longer exists.', { icon: 'alert', type: 'error' }); return; }
  if (v.visibility === 'private' && !opts.allowPrivate) {
    U.toast('This video is private.', { icon: 'lock', type: 'error' }); syncUrl(); return;
  }
  stopPreview(); U.closePops(); U.closeMenu();
  const first = !watchId;
  watchId = id; watchStartAt = opts.startAt || 0;
  S.incViews(id);
  S.state(d => { d.history = [{ id, at: Date.now() }].concat(d.history.filter(h => h.id !== id)).slice(0, 60); });
  const st = S.state(), btns = watchButtonsHtml(v), rel = related(v);
  $('#watchGrid').innerHTML =
    '<div class="watch-main">' +
      '<div class="player" id="playerWrap">' +
        '<div class="player-overlay" id="playerOverlay"><button type="button" class="bigplay" data-action="bigplay" aria-label="Play">' + icon('play', 30) + '</button></div>' +
        '<div class="player-error hidden" id="playerError"></div>' +
      '</div>' +
      '<h1 class="watch-title">' + esc(v.title) +
        (v.visibility === 'unlisted' ? '<span class="unlisted-chip">' + icon('link', 12) + 'Unlisted</span>' : '') +
        (v.visibility === 'private' ? '<span class="unlisted-chip">' + icon('lock', 12) + 'Private</span>' : '') + '</h1>' +
      '<div class="watch-bar"><div class="watch-channel" id="watchChannel">' + btns.channel + '</div>' +
      '<div class="watch-actions" id="watchActions">' + btns.actions + '</div></div>' +
      '<div class="desc"><div class="desc-meta">' + fmtNum(v.views) + ' views · ' + fmtDate(v.createdAt) +
        (v.tags.length ? ' · ' + v.tags.map(t => '<span class="tagchip" data-action="tag" data-tag="' + esc(t) + '" role="button" tabindex="0">#' + esc(t.replace(/\s+/g, '')) + '</span>').join('') : '') + '</div>' +
        '<div class="desc-text clamp" id="descText">' + (v.description ? U.linkify(v.description, true) : '<i style="color:var(--text3)">No description yet.</i>') + '</div>' +
        '<button type="button" class="desc-toggle" data-action="desc-toggle" id="descToggle">Show more</button></div>' +
      commentsHtml(v) +
    '</div>' +
    '<aside class="watch-rail"><div class="rail-head"><h3>Up next</h3>' +
      '<label class="switch">Autoplay<input type="checkbox" id="autoplayTgl"' + (st.autoplay ? ' checked' : '') + '><span class="sw-track"></span></label></div>' +
      '<div class="upnext" id="upnext">' + (rel.length ? rel.map(unItem).join('') : '<div class="pop-empty">Nothing else to play yet.</div>') + '</div></aside>';
  const watch = $('#watch');
  watch.classList.remove('hidden'); watch.setAttribute('aria-hidden', 'false');
  if (first) { U.lock(true); U.setTrap(watch.querySelector('.watch-panel')); }
  $('.watch-panel').scrollTop = 0;
  mountPlayer(v);
  syncUrl();
  const cinput = $('#cinput'), csubmit = $('#csubmit');
  cinput.addEventListener('input', () => { csubmit.disabled = !cinput.value.trim(); });
  $('#cform').addEventListener('submit', e => {
    e.preventDefault();
    const text = cinput.value.trim(); if (!text) return;
    S.addComment(watchId, text);
    cinput.value = ''; csubmit.disabled = true;
    refreshComments();
    U.toast('Comment added', { icon: 'message', type: 'success' });
  });
  renderSidebar();
}
function refreshComments() {
  const v = S.get(watchId); if (!v) return;
  const section = $('.comments'); if (!section) return;
  const tmp = document.createElement('div'); tmp.innerHTML = commentsHtml(v);
  section.replaceWith(tmp.firstElementChild);
  const cinput = $('#cinput'), csubmit = $('#csubmit');
  cinput.addEventListener('input', () => { csubmit.disabled = !cinput.value.trim(); });
  $('#cform').addEventListener('submit', e => {
    e.preventDefault();
    const text = cinput.value.trim(); if (!text) return;
    S.addComment(watchId, text); cinput.value = ''; csubmit.disabled = true;
    refreshComments(); U.toast('Comment added', { icon: 'message', type: 'success' });
  });
}
function updateWatchButtons() {
  const v = S.get(watchId); if (!v) return;
  const b = watchButtonsHtml(v);
  const wc = $('#watchChannel'), wa = $('#watchActions');
  if (wc) wc.innerHTML = b.channel;
  if (wa) wa.innerHTML = b.actions;
}
function closeWatch() {
  if (!watchId) return;
  destroyPlayer(); playerToken++;
  watchId = null;
  $('#watch').classList.add('hidden'); $('#watch').setAttribute('aria-hidden', 'true');
  $('#watchGrid').innerHTML = '';
  U.lock(false); U.setTrap(null);
  syncUrl(); renderAll(false);
}

/* ================= actions ================= */
function toggleLike(dislike) {
  const v = S.get(watchId); if (!v) return;
  const cur = S.state().reactions[v.id];
  const next = dislike ? (cur === 'dislike' ? null : 'dislike') : (cur === 'like' ? null : 'like');
  S.state(d => { if (next) d.reactions[v.id] = next; else delete d.reactions[v.id]; });
  updateWatchButtons(); renderSidebar();
  if (next === 'like') {
    const btn = $('[data-action="like"]');
    if (btn) { btn.classList.add('burst'); setTimeout(() => btn.classList.remove('burst'), 550); }
    U.toast('Added to Liked videos', { icon: 'like', type: 'success' });
  } else if (!dislike && cur === 'like') U.toast('Removed from Liked videos', { icon: 'like' });
}
function toggleSave(id) {
  id = id || watchId;
  const saved = S.state().watchLater.includes(id);
  S.state(d => { d.watchLater = saved ? d.watchLater.filter(x => x !== id) : [id].concat(d.watchLater); });
  if (watchId) updateWatchButtons();
  renderSidebar(); if (!watchId) renderGrid(false);
  U.toast(saved ? 'Removed from Watch later' : 'Saved to Watch later', { icon: 'clock', type: saved ? 'default' : 'success' });
}
function toggleSub(chId) {
  if (chId === 'you') return;
  const ch = S.channel(chId), sub = S.state().subs.includes(chId);
  S.state(d => { d.subs = sub ? d.subs.filter(x => x !== chId) : [chId].concat(d.subs); });
  $$('[data-sub="' + chId + '"]').forEach(btn => {
    const on = !sub, banner = btn.closest('.channel-banner');
    btn.classList.toggle('btn-primary', !on && !banner);
    btn.classList.toggle('on', on && !banner);
    btn.setAttribute('aria-pressed', String(on));
    btn.innerHTML = icon(on ? 'bell' : 'plus', 15) + '<span>' + (on ? 'Subscribed' : 'Subscribe') + '</span>';
  });
  renderSidebar();
  if (view.mode === 'subs') renderAll(false);
  U.toast(on => on, {}); // placeholder replaced below
}
/* proper subscribe toast (replaces the stub call above at runtime) */
function subscribe(chId) {
  if (chId === 'you') return;
  const ch = S.channel(chId), was = S.state().subs.includes(chId);
  S.state(d => { d.subs = was ? d.subs.filter(x => x !== chId) : [chId].concat(d.subs); });
  $$('[data-sub="' + chId + '"]').forEach(btn => {
    const on = !was, banner = !!btn.closest('.channel-banner');
    if (banner) {
      btn.setAttribute('style', on ? 'background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.35);color:#fff' : '');
      btn.classList.toggle('btn-primary', !on);
    } else { btn.classList.toggle('btn-primary', !on); btn.classList.toggle('on', on); }
    btn.setAttribute('aria-pressed', String(on));
    btn.innerHTML = icon(on ? 'bell' : 'plus', 15) + '<span>' + (on ? 'Subscribed' : 'Subscribe') + '</span>';
  });
  renderSidebar();
  if (view.mode === 'subs') renderAll(false);
  U.toast(was ? 'Unsubscribed from ' + ch.name : 'Subscribed to ' + ch.name, { icon: 'bell', type: was ? 'default' : 'success' });
}
function shareVideo(v, atTime) {
  const base = location.href.split(/[?#]/)[0];
  let url = base + '?v=' + v.id;
  if (atTime && player && player.el.currentTime > 3) url += '&t=' + Math.floor(player.el.currentTime);
  U.copy(url).then(ok => U.toast(ok ? (atTime ? 'Link copied at ' + fmtDuration(player.el.currentTime) : 'Link copied to clipboard') : 'Couldn\'t copy — link: ' + url, { icon: 'link', type: ok ? 'success' : 'error' }));
}
function downloadVideo(v) {
  S.resolveSrc(v).then(src => {
    if (!src) { U.toast('No file available to download.', { icon: 'alert', type: 'error' }); return; }
    const a = document.createElement('a');
    a.href = src; a.download = v.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) + '.mp4';
    if (v.source.type === 'url') { a.target = '_blank'; a.rel = 'noopener'; }
    document.body.appendChild(a); a.click(); a.remove();
    U.toast(v.source.type === 'url' ? 'Opening source file…' : 'Download started', { icon: 'download', type: 'info' });
  });
}
function notInterested(id) {
  const v = S.get(id); if (!v) return;
  S.state(d => { d.hidden = [id].concat(d.hidden); });
  renderAll(false);
  U.undoable('Video hidden from your feed', () => {
    S.state(d => { d.hidden = d.hidden.filter(x => x !== id); });
    renderAll(false);
  }, null, 'eye');
}
function cardMenu(btn, id) {
  const v = S.get(id); if (!v) return;
  const st = S.state();
  U.menu(btn, [
    { icon: 'clock', label: st.watchLater.includes(id) ? 'Remove from Watch later' : 'Save to Watch later', fn: () => toggleSave(id) },
    { icon: 'like', label: st.reactions[id] === 'like' ? 'Unlike' : 'Like', fn: () => {
        const cur = S.state().reactions[id];
        S.state(d => { if (cur === 'like') delete d.reactions[id]; else d.reactions[id] = 'like'; });
        renderSidebar(); if (view.mode === 'liked') renderAll(false);
        U.toast(cur === 'like' ? 'Removed from Liked videos' : 'Added to Liked videos', { icon: 'like' });
      } },
    { icon: 'share', label: 'Copy link', fn: () => shareVideo(v) },
    { icon: v.source.type === 'url' ? 'external' : 'download', label: v.source.type === 'url' ? 'Open source file' : 'Download', fn: () => downloadVideo(v) },
    { sep: true },
    { icon: 'eye', label: 'Not interested', danger: true, fn: () => notInterested(id) }
  ]);
}
function watchMore(btn) {
  const v = S.get(watchId); if (!v) return;
  U.menu(btn, [
    { icon: v.source.type === 'url' ? 'external' : 'download', label: v.source.type === 'url' ? 'Open source file' : 'Download', fn: () => downloadVideo(v) },
    { icon: 'link', label: 'Copy link at current time', fn: () => shareVideo(v, true) },
    { sep: true },
    { icon: 'eye', label: 'Not interested', danger: true, fn: () => { closeWatch(); notInterested(v.id); } }
  ]);
}
function clearHistory() {
  const snapshot = S.state().history.slice();
  if (!snapshot.length) return;
  S.state(d => { d.history = []; d.positions = {}; });
  renderAll(false);
  U.undoable('Watch history cleared', () => {
    S.state(d => { d.history = snapshot; });
    renderAll(false);
  });
}

/* ================= search & suggestions ================= */
let sugIdx = -1;
function hideSuggest() { els.suggest.classList.add('hidden'); sugIdx = -1; }
function renderSuggest() {
  const q = els.searchInput.value.trim().toLowerCase();
  if (!q) { hideSuggest(); return; }
  const matches = S.videos().filter(v => v.visibility === 'public' &&
    (v.title.toLowerCase().includes(q) || S.channel(v.channel).name.toLowerCase().includes(q))).slice(0, 6);
  els.suggest.innerHTML = matches.length
    ? matches.map((v, i) => '<button type="button" class="sug-item' + (i === sugIdx ? ' active' : '') + '" role="option" data-sug="' + v.id + '">' +
        '<img class="sug-thumb" src="' + v.thumb + '" alt=""><span class="sug-meta"><span class="sug-title">' + U.highlight(esc(v.title), q) + '</span>' +
        '<span class="sug-ch">' + esc(S.channel(v.channel).name) + ' · ' + fmtViews(v.views) + ' views</span></span></button>').join('')
    : '<div class="sug-empty">No matches — press Enter to search everything</div>';
  els.suggest.classList.remove('hidden');
}
function applySearch(q) {
  view.q = q.trim();
  els.searchClear.classList.toggle('hidden', !view.q);
  hideSuggest(); syncUrl();
  renderHead(); renderBanner(); renderGrid(true); renderSidebar();
  document.body.classList.remove('search-open');
}

/* ================= url params ================= */
function syncUrl() {
  try {
    const base = location.pathname;
    const p = new URLSearchParams();
    if (watchId) p.set('v', watchId);
    else if (view.q) p.set('q', view.q);
    const qs = p.toString();
    history.replaceState(null, '', base + (qs ? '?' + qs : ''));
  } catch (e) {}
}

/* ================= events ================= */
function bind() {
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const a = t.dataset.action, id = t.dataset.id;
    switch (a) {
      case 'nav': setMode(t.dataset.nav); break;
      case 'explore': setMode('home', { cat: t.dataset.cat }); break;
      case 'chip': view.cat = t.dataset.cat; renderChips(); renderHead(); renderGrid(true); break;
      case 'watch': if (!e.target.closest('button[data-action]:not([data-action="watch"])')) openWatch(id); break;
      case 'card-menu': e.stopPropagation(); cardMenu(t, id); break;
      case 'channel': e.stopPropagation(); closeWatch(); setMode('channel', { channel: id }); break;
      case 'clear-search': applySearch(''); els.searchInput.value = ''; break;
      case 'clear-filters': view.cat = 'all'; applySearch(''); els.searchInput.value = ''; renderChips(); break;
      case 'banner-dismiss': S.state(d => { d.bannerDismissed = true; }); renderBanner(); break;
      case 'history-clear': clearHistory(); break;
      case 'watch-close': closeWatch(); break;
      case 'theater-toggle': $('.watch-panel').classList.toggle('theater'); break;
      case 'bigplay': if (player) player.el.play().catch(() => {}); break;
      case 'retry-video': { const v = S.get(watchId); if (v) { S.revokeSrc(v.id); mountPlayer(v); } break; }
      case 'like': toggleLike(false); break;
      case 'dislike': toggleLike(true); break;
      case 'share-video': { const v = S.get(watchId); if (v) shareVideo(v); break; }
      case 'save-video': toggleSave(); break;
      case 'watch-more': watchMore(t); break;
      case 'subscribe': subscribe(t.dataset.ch); break;
      case 'desc-toggle': {
        const d = $('#descText'), clamped = d.classList.toggle('clamp');
        $('#descToggle').textContent = clamped ? 'Show more' : 'Show less'; break;
      }
      case 'chapter': if (player) { player.el.currentTime = Number(t.dataset.t) || 0; player.el.play().catch(() => {}); } break;
      case 'tag': closeWatch(); els.searchInput.value = t.dataset.tag; applySearch(t.dataset.tag); break;
      case 'upnext': openWatch(id, { autoplay: true }); break;
      case 'comment-cancel': { const ci = $('#cinput'); if (ci) { ci.value = ''; $('#csubmit').disabled = true; ci.blur(); } break; }
      case 'comment-like': {
        const cid = t.dataset.cid, on = !S.state().likedComments[cid];
        S.state(d => { if (on) { d.likedComments[cid] = true; delete d.dislikedComments[cid]; } else delete d.likedComments[cid]; });
        refreshComments(); break;
      }
      case 'comment-dislike': {
        const cid = t.dataset.cid, on = !S.state().dislikedComments[cid];
        S.state(d => { if (on) { d.dislikedComments[cid] = true; delete d.likedComments[cid]; } else delete d.dislikedComments[cid]; });
        refreshComments(); break;
      }
      case 'comment-menu': {
        const cid = t.dataset.cid;
        U.menu(t, [{ icon: 'trash', label: 'Delete comment', danger: true, fn: () => {
          const removed = S.removeComment(watchId, cid);
          refreshComments();
          if (removed) U.undoable('Comment deleted', () => { S.restoreComment(watchId, removed.comment, removed.index); if (watchId) refreshComments(); });
        } }]);
        break;
      }
      case 'reset-data': U.resetData(); break;
      case 'back-top': window.scrollTo({ top: 0, behavior: U.isReduced ? 'auto' : 'smooth' }); break;
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('card')) { openWatch(e.target.dataset.id); return; }
    if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('tagchip')) { e.target.click(); return; }
    if (!watchId || !player || U.uiBusy()) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    const el = player.el, k = e.key.toLowerCase();
    if (k === ' ' || k === 'k') { e.preventDefault(); el.paused ? el.play().catch(() => {}) : el.pause(); }
    else if (k === 'j' || e.key === 'ArrowLeft') { e.preventDefault(); el.currentTime = Math.max(0, el.currentTime - (k === 'j' ? 10 : 5)); }
    else if (k === 'l' || e.key === 'ArrowRight') { e.preventDefault(); el.currentTime = Math.min(el.duration || 1e9, el.currentTime + (k === 'l' ? 10 : 5)); }
    else if (k === 'm') { el.muted = !el.muted; }
    else if (k === 'f') { const w = $('#playerWrap'); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else if (w.requestFullscreen) w.requestFullscreen().catch(() => {}); }
    else if (k === 't') { $('.watch-panel').classList.toggle('theater'); }
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'sortSel') { view.sort = e.target.value; renderGrid(true); }
    if (e.target.id === 'autoplayTgl') { const on = e.target.checked; S.state(d => { d.autoplay = on; }); U.toast('Autoplay ' + (on ? 'on' : 'off'), { icon: 'play', type: 'info' }); }
    if (e.target.id === 'commentSort') { commentSort = e.target.value; refreshComments(); }
  });
  const doSearch = U.debounce(() => { applySearch(els.searchInput.value); }, 160);
  els.searchInput.addEventListener('input', () => { sugIdx = -1; renderSuggest(); doSearch(); });
  els.searchInput.addEventListener('focus', () => { if (els.searchInput.value.trim()) renderSuggest(); });
  els.searchInput.addEventListener('keydown', e => {
    const items = $$('.sug-item', els.suggest);
    if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); sugIdx = (sugIdx + 1) % items.length; renderSuggest(); }
    else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); sugIdx = (sugIdx - 1 + items.length) % items.length; renderSuggest(); }
    else if (e.key === 'Escape') hideSuggest();
  });
  $('#searchForm').addEventListener('submit', e => {
    e.preventDefault();
    const items = $$('.sug-item', els.suggest);
    if (sugIdx >= 0 && items[sugIdx] && !els.suggest.classList.contains('hidden')) {
      const id = items[sugIdx].dataset.sug; hideSuggest(); openWatch(id);
    } else applySearch(els.searchInput.value);
  });
  els.suggest.addEventListener('mousedown', e => {
    const it = e.target.closest('[data-sug]');
    if (it) { e.preventDefault(); hideSuggest(); openWatch(it.dataset.sug); }
  });
  document.addEventListener('mousedown', e => { if (!e.target.closest('#searchWrap')) hideSuggest(); });
  els.searchClear.addEventListener('click', () => { els.searchInput.value = ''; applySearch(''); els.searchInput.focus(); });
  $('#drawerScrim').addEventListener('click', closeDrawer);
  $('#chipPrev').innerHTML = icon('chev-left', 17);
  $('#chipNext').innerHTML = icon('chev-right', 17);
  $('#chipPrev').addEventListener('click', () => els.chips.scrollBy({ left: -300, behavior: 'smooth' }));
  $('#chipNext').addEventListener('click', () => els.chips.scrollBy({ left: 300, behavior: 'smooth' }));
  els.chips.addEventListener('scroll', updateChipArrows, { passive: true });
  window.addEventListener('resize', U.debounce(updateChipArrows, 120));
  els.grid.addEventListener('mouseover', e => {
    const th = e.target.closest('.thumb');
    if (!th || pv.card === th) return;
    stopPreview();
    if (!canPreview()) return;
    pv.card = th;
    pv.timer = setTimeout(() => startPreview(th), 650);
  });
  els.grid.addEventListener('mouseout', e => {
    const th = e.target.closest('.thumb');
    if (th && !th.contains(e.relatedTarget)) stopPreview();
  });
  S.onChange(() => {
    if (watchId && !S.get(watchId)) { closeWatch(); U.toast('That video was removed.', { icon: 'alert', type: 'error' }); }
    renderAll(false);
    U.refreshBadge();
  });
}

/* ================= boot ================= */
function boot() {
  S.init();
  els.sidebar = $('#sidebar'); els.grid = $('#grid'); els.empty = $('#emptyState');
  els.head = $('#pageHead'); els.banner = $('#banner'); els.chips = $('#chips');
  els.sortSel = $('#sortSel'); els.searchInput = $('#searchInput');
  els.searchClear = $('#searchClear'); els.suggest = $('#suggest');
  if (S.state().sidebar === 'rail' && innerWidth >= 1100) document.body.classList.add('sb-rail');
  U.initChrome({
    onNavToggle: toggleSidebar,
    openVideo: id => openWatch(id),
    onEsc: () => { if (watchId) closeWatch(); else closeDrawer(); }
  });
  bind();
  renderAll(true);
  let params = new URLSearchParams();
  try { params = new URLSearchParams(location.search); } catch (e) {}
  if (params.get('q')) { els.searchInput.value = params.get('q'); applySearch(params.get('q')); }
  if (params.get('v')) openWatch(params.get('v'), { startAt: Number(params.get('t')) || 0, allowPrivate: false });
}
boot();
})();
