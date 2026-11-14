/* ============================================================
   HZM Studio — dashboard, content manager, upload & edit flows.
   ============================================================ */
(function () {
'use strict';
const U = window.HZM, S = window.HZMStorage;
const { $, $$, esc, icon, avatar, verified, fmtViews, fmtNum, fmtDuration, fmtDate, timeAgo } = U;

const prefs = () => S.state().studioPrefs || { tab: 'dashboard', vfilter: 'all', sortKey: 'date', sortDir: 'desc' };
const ui = { q: '', sel: new Set(), flashId: null };
let currentEdit = null;

const own = () => S.videos().filter(v => v.channel === 'you');
const visMeta = vis => ({ public: ['globe', 'Public', '#2fd57b'], unlisted: ['link', 'Unlisted', '#ffb224'], private: ['lock', 'Private', '#ff4d6d'] }[vis] || ['globe', 'Public', '#2fd57b']);

/* ================= sidebar & tabs ================= */
function renderSide() {
  const p = prefs(), u = S.user();
  $('#sidebar').innerHTML =
    '<div class="s-channel-card sb-full">' + avatar(u, 68) + '<b>' + esc(u.name) + '</b><span>' + esc(u.handle) + ' · ' + fmtNum(u.subs) + ' subscribers</span></div>' +
    '<div class="sb-section">' +
      '<button type="button" class="sb-item' + (p.tab === 'dashboard' ? ' active' : '') + '" data-action="snav" data-tab="dashboard"><span class="sb-ic">' + icon('chart', 20) + '</span><span>Dashboard</span></button>' +
      '<button type="button" class="sb-item' + (p.tab === 'content' ? ' active' : '') + '" data-action="snav" data-tab="content"><span class="sb-ic">' + icon('video', 20) + '</span><span>Content</span><span class="sb-count">' + own().length + '</span></button>' +
      '<button type="button" class="sb-item" data-action="upload"><span class="sb-ic">' + icon('upload', 20) + '</span><span>Upload video</span></button>' +
    '</div><div class="sb-hr"></div>' +
    '<div class="sb-section"><a class="sb-item" href="index.html"><span class="sb-ic">' + icon('arrow-left', 20) + '</span><span>Back to HZMTube</span></a></div>' +
    '<div class="sb-foot sb-full">Uploads are stored locally:<br>metadata in localStorage, video files in IndexedDB.</div>';
  $$('.s-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === p.tab));
}
function setTab(tab) {
  S.state(d => { d.studioPrefs.tab = tab; });
  ui.sel.clear();
  render();
}

/* ================= dashboard ================= */
function renderDashboard(root) {
  const vids = own();
  const views = vids.reduce((s, v) => s + v.views, 0);
  const likes = vids.reduce((s, v) => s + v.likes, 0);
  const hours = vids.reduce((s, v) => s + v.views * v.duration, 0) / 3600;
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const latest = vids.slice().sort((a, b) => b.createdAt - a.createdAt)[0];
  const top = vids.slice().sort((a, b) => b.views - a.views).slice(0, 6);
  const max = Math.max(1, ...top.map(v => v.views));
  const stat = (i, ic, c, label, val, sub, fmt) =>
    '<div class="stat" style="--i:' + i + ';--st-c:' + c + '"><span class="stat-ic">' + icon(ic, 19) + '</span>' +
    '<span class="stat-num" data-count="' + val + '" data-fmt="' + fmt + '">0</span>' +
    '<span class="stat-label">' + label + '</span><span class="stat-sub">' + sub + '</span></div>';
  const activity = [];
  vids.forEach(v => {
    activity.push({ at: v.createdAt, ic: 'upload', c: '#3ea6ff', tx: 'Published “' + v.title + '”' });
    if (v.views >= 10000) activity.push({ at: v.createdAt + 864e5, ic: 'trend', c: '#2fd57b', tx: '“' + v.title + '” passed 10K views' });
  });
  activity.sort((a, b) => b.at - a.at);
  root.innerHTML =
    '<div class="s-head"><div class="greet"><h1>' + greet + ', ' + esc(S.user().name) + ' 👋</h1><p>Here\'s what\'s happening on your channel.</p></div>' +
    '<button type="button" class="btn btn-primary" data-action="upload">' + icon('upload', 16) + 'Upload video</button></div>' +
    '<div class="stats">' +
      stat(0, 'video', '#ff3b5c', 'Videos', vids.length, vids.filter(v => v.visibility === 'public').length + ' public · ' + vids.filter(v => v.visibility !== 'public').length + ' hidden', 'num') +
      stat(1, 'eye', '#3ea6ff', 'Total views', views, 'across all your uploads', 'views') +
      stat(2, 'like', '#b07cff', 'Likes', likes, 'all time', 'views') +
      stat(3, 'clock', '#ffb224', 'Watch time', Math.round(hours), 'estimated hours watched', 'hrs') +
    '</div>' +
    '<div class="dash-grid">' +
      '<div class="panel"><div class="panel-head"><h3>Top content</h3><span class="ph-note">views per video</span></div>' +
        (top.length ? top.map(v => {
          const c = U.catMeta(v.category).colors;
          return '<div class="chart-row"><img class="chart-thumb" src="' + v.thumb + '" alt="">' +
            '<div class="chart-info"><div class="chart-title">' + esc(v.title) + '</div>' +
            '<div class="chart-bar"><div class="chart-fill" data-w="' + Math.max(3, v.views / max * 100) + '" style="--cf-a:' + c[0] + ';--cf-b:' + c[1] + '"></div></div></div>' +
            '<span class="chart-val">' + fmtViews(v.views) + '</span></div>';
        }).join('') : '<div class="pop-empty">Upload a video to see performance here.</div>') +
      '</div>' +
      '<div class="panel"><div class="panel-head"><h3>Latest video</h3>' + (latest ? '<span class="unlisted-chip" style="color:' + visMeta(latest.visibility)[2] + ';background:color-mix(in srgb,' + visMeta(latest.visibility)[2] + ' 14%,transparent)">' + icon(visMeta(latest.visibility)[0], 11) + visMeta(latest.visibility)[1] + '</span>' : '') + '</div>' +
        (latest
          ? '<img class="latest-thumb" src="' + latest.thumb + '" alt="">' +
            '<div class="latest-title">' + esc(latest.title) + '</div>' +
            '<div class="latest-stats"><span><b>' + fmtNum(latest.views) + '</b> views</span><span><b>' + fmtNum(latest.likes) + '</b> likes</span><span><b>' + S.comments(latest.id).length + '</b> comments</span></div>' +
            '<div class="latest-actions"><button type="button" class="btn btn-sm" data-action="edit" data-id="' + latest.id + '">' + icon('edit', 14) + 'Edit</button>' +
            (latest.visibility !== 'private' ? '<a class="btn btn-primary btn-sm" href="index.html?v=' + latest.id + '" target="_blank" rel="noopener">' + icon('play', 14) + 'Watch</a>' : '<span class="fhint" style="align-self:center">Private — only you can see it</span>') + '</div>'
          : '<div class="pop-empty">Nothing published yet.<br>Your first video is one click away.</div><button type="button" class="btn btn-primary" data-action="upload" style="width:100%;justify-content:center">' + icon('upload', 16) + 'Upload your first video</button>') +
      '</div>' +
    '</div>' +
    '<div class="dash-grid">' +
      '<div class="panel"><div class="panel-head"><h3>Recent activity</h3></div><div class="activity">' +
        (activity.length ? activity.slice(0, 6).map(a =>
          '<div class="act-item"><span class="act-ic" style="--ac:' + a.c + '">' + icon(a.ic, 16) + '</span>' +
          '<span class="act-tx">' + esc(a.tx) + '<span class="act-time">' + timeAgo(a.at) + '</span></span></div>').join('')
          : '<div class="pop-empty">Your channel activity will appear here.</div>') +
      '</div></div>' +
      '<div class="panel tips"><div class="panel-head"><h3>Grow your channel</h3></div>' +
        '<div class="tip">' + icon('sparkles', 16) + '<span>Custom thumbnails get more clicks — capture a frame or upload your own art when publishing.</span></div>' +
        '<div class="tip">' + icon('sparkles', 16) + '<span>Add chapters like <b>“1:20 Intro”</b> on separate lines in the description; they become seek buttons in the player.</span></div>' +
        '<div class="tip">' + icon('sparkles', 16) + '<span>Use <b>Unlisted</b> to share drafts via link before making them public.</span></div>' +
        '<button type="button" class="btn" data-action="upload">' + icon('upload', 15) + 'Publish something new</button>' +
      '</div>' +
    '</div>';
  $$('.stat-num', root).forEach(el => {
    const to = Number(el.dataset.count), f = el.dataset.fmt;
    U.countUp(el, to, f === 'views' ? fmtViews : f === 'hrs' ? (n => fmtNum(n) + ' hrs') : fmtNum);
  });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $$('.chart-fill', root).forEach(el => { el.style.width = el.dataset.w + '%'; });
  }));
}

/* ================= content table ================= */
function contentList() {
  const p = prefs();
  let list = own();
  if (p.vfilter !== 'all') list = list.filter(v => v.visibility === p.vfilter);
  if (ui.q) {
    const terms = ui.q.toLowerCase().split(/\s+/).filter(Boolean);
    list = list.filter(v => terms.every(t => (v.title + ' ' + v.description + ' ' + v.tags.join(' ')).toLowerCase().includes(t)));
  }
  const dir = p.sortDir === 'asc' ? 1 : -1;
  const key = { date: v => v.createdAt, views: v => v.views, likes: v => v.likes, title: v => v.title.toLowerCase() }[p.sortKey] || (v => v.createdAt);
  list.sort((a, b) => { const x = key(a), y = key(b); return (x < y ? -1 : x > y ? 1 : 0) * dir; });
  return list;
}
function renderContent(root) {
  const p = prefs(), all = own(), list = contentList();
  ui.sel.forEach(id => { if (!all.find(v => v.id === id)) ui.sel.delete(id); });
  const counts = { all: all.length, public: 0, unlisted: 0, private: 0 };
  all.forEach(v => { counts[v.visibility] = (counts[v.visibility] || 0) + 1; });
  const th = (key, label, right) =>
    '<th' + (right ? ' style="text-align:right"' : '') + '><button type="button" class="th-sort ' + (p.sortKey === key ? p.sortDir : '') + '" data-action="sort" data-key="' + key + '">' + label + icon('chev-down', 13) + '</button></th>';
  const rows = list.map(v => {
    const vm = visMeta(v.visibility), checked = ui.sel.has(v.id);
    return '<tr class="' + (checked ? 'checked ' : '') + (ui.flashId === v.id ? 'flash' : '') + '" data-row="' + v.id + '">' +
      '<td class="td-chk"><input type="checkbox" class="chk row-chk" data-id="' + v.id + '"' + (checked ? ' checked' : '') + ' aria-label="Select video"></td>' +
      '<td class="td-video"><div class="video-cell"><span class="vc-thumb"><img src="' + v.thumb + '" alt="">' + (v.duration ? '<span class="thumb-badge">' + fmtDuration(v.duration) + '</span>' : '') + '</span>' +
        '<span class="vc-info"><span class="vc-title">' + esc(v.title) + '</span><span class="vc-desc">' + esc(v.description || 'No description') + '</span></span></div></td>' +
      '<td data-th="Visibility"><span class="vis-wrap" style="color:' + vm[2] + '">' + icon(vm[0], 15) +
        '<select class="fselect vis-sel" data-id="' + v.id + '" aria-label="Visibility">' +
        ['public', 'unlisted', 'private'].map(o => '<option value="' + o + '"' + (v.visibility === o ? ' selected' : '') + '>' + visMeta(o)[1] + '</option>').join('') +
        '</select></span></td>' +
      '<td data-th="Date" class="cell-date"><b>' + fmtDate(v.createdAt) + '</b><span>' + timeAgo(v.createdAt) + '</span></td>' +
      '<td data-th="Views" class="cell-num">' + fmtNum(v.views) + '</td>' +
      '<td data-th="Likes" class="cell-num">' + fmtNum(v.likes) + '</td>' +
      '<td><div class="row-actions">' +
        (v.visibility !== 'private' ? '<a class="icon-btn" href="index.html?v=' + v.id + '" target="_blank" rel="noopener" title="Watch on HZMTube" aria-label="Watch">' + icon('play', 17) + '</a>' : '') +
        '<button type="button" class="icon-btn" data-action="edit" data-id="' + v.id + '" title="Edit" aria-label="Edit">' + icon('edit', 17) + '</button>' +
        '<button type="button" class="icon-btn ra-del" data-action="delete" data-id="' + v.id + '" title="Delete" aria-label="Delete">' + icon('trash', 17) + '</button>' +
      '</div></td></tr>';
  }).join('');
  root.innerHTML =
    '<div class="s-head"><div class="greet"><h1>Channel content</h1><p>' + all.length + ' video' + (all.length === 1 ? '' : 's') + ' · manage titles, descriptions, visibility and more.</p></div>' +
    '<button type="button" class="btn btn-primary" data-action="upload">' + icon('upload', 16) + 'Upload video</button></div>' +
    '<div class="content-toolbar">' +
      ['all', 'public', 'unlisted', 'private'].map(f =>
        '<button type="button" class="vfchip' + (p.vfilter === f ? ' active' : '') + '" data-action="vfilter" data-f="' + f + '">' + (f === 'all' ? 'All' : visMeta(f)[1]) + '<span class="vc-n">' + (counts[f] || 0) + '</span></button>').join('') +
    '</div>' +
    (ui.sel.size ? '<div class="bulkbar"><b>' + ui.sel.size + ' selected</b>' +
      '<select class="fselect bulk-vis" aria-label="Set visibility"><option value="">Set visibility…</option><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></select>' +
      '<button type="button" class="btn btn-danger btn-sm" data-action="bulk-delete">' + icon('trash', 14) + 'Delete</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="bulk-clear">Clear selection</button></div>' : '') +
    (list.length
      ? '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th style="width:36px"><input type="checkbox" class="chk chk-all" aria-label="Select all"></th>' +
        th('title', 'Video') + '<th>Visibility</th>' + th('date', 'Date') + th('views', 'Views', true) + th('likes', 'Likes', true) + '<th style="text-align:right">Actions</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>'
      : '<div class="tbl-wrap s-empty"><div class="empty" style="padding:20px"><div class="empty-art">' + icon('video', 46) + '</div>' +
        '<h3>' + (all.length ? 'No videos match your filters' : 'No videos yet') + '</h3>' +
        '<p>' + (all.length ? 'Try clearing the search box or choosing a different visibility filter.' : 'Upload your first video and it will appear here — and on the HZMTube homepage.') + '</p>' +
        (all.length ? '<button type="button" class="btn" data-action="clear-content-filters">' + icon('refresh', 15) + 'Clear filters</button>'
                    : '<button type="button" class="btn btn-primary" data-action="upload">' + icon('upload', 16) + 'Upload a video</button>') +
        '</div></div>');
  const chkAll = $('.chk-all', root);
  if (chkAll) {
    const visibleIds = list.map(v => v.id);
    const selVis = visibleIds.filter(id => ui.sel.has(id)).length;
    chkAll.checked = selVis === visibleIds.length && visibleIds.length > 0;
    chkAll.indeterminate = selVis > 0 && selVis < visibleIds.length;
  }
  ui.flashId = null;
}
function render() {
  renderSide();
  const root = $('#studioRoot');
  if (prefs().tab === 'content') renderContent(root); else renderDashboard(root);
}

/* ================= delete (with undo) ================= */
async function deleteVideos(ids) {
  const vids = ids.map(S.get).filter(Boolean);
  if (!vids.length) return;
  const ok = await U.confirm({
    title: vids.length === 1 ? 'Delete this video?' : 'Delete ' + vids.length + ' videos?',
    danger: true, confirmLabel: 'Delete',
    body: vids.length === 1
      ? '<b>“' + esc(vids[0].title) + '”</b> will be removed from HZMTube. You\'ll have a few seconds to undo.'
      : 'These videos will be removed from HZMTube. You\'ll have a few seconds to undo.'
  });
  if (!ok) return;
  const removed = ids.map(id => S.remove(id)).filter(Boolean);
  ui.sel.clear(); render();
  U.undoable(
    removed.length === 1 ? 'Deleted “' + removed[0].video.title.slice(0, 40) + '”' : removed.length + ' videos deleted',
    () => { removed.slice().sort((a, b) => a.index - b.index).forEach(r => S.restore(r.video, r.index)); render(); U.toast('Restored', { icon: 'check-circle', type: 'success' }); },
    () => { removed.forEach(r => S.purgeRefs(r.video.id)); }
  );
}

/* ================= video processing ================= */
function coverDraw(ctx, video, W, H) {
  const vw = video.videoWidth || 16, vh = video.videoHeight || 9;
  const s = Math.max(W / vw, H / vh), dw = vw * s, dh = vh * s;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(video, (W - dw) / 2, (H - dh) / 2, dw, dh);
}
function probeVideo(url, capture) {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto';
    let done = false, seekTimer = null;
    const to = setTimeout(() => finish(new Error('Timed out reading this video')), 12000);
    function cleanup() { clearTimeout(to); clearTimeout(seekTimer); v.removeAttribute('src'); try { v.load(); } catch (e) {} }
    function finish(err, data) { if (done) return; done = true; cleanup(); err ? reject(err) : resolve(data); }
    v.onerror = () => finish(new Error('This file or URL can\'t be played by your browser'));
    v.onloadedmetadata = () => {
      const dur = isFinite(v.duration) ? v.duration : 0;
      if (!capture) return finish(null, { duration: dur });
      const grab = () => {
        try {
          const c = document.createElement('canvas'); c.width = 640; c.height = 360;
          coverDraw(c.getContext('2d'), v, 640, 360);
          finish(null, { duration: dur, thumb: c.toDataURL('image/jpeg', 0.8) });
        } catch (e) { finish(null, { duration: dur }); }
      };
      v.onseeked = grab;
      seekTimer = setTimeout(() => finish(null, { duration: dur }), 4000);
      try { v.currentTime = Math.min(Math.max(dur * 0.25, 0.1), Math.max(dur - 0.1, 0.1)); }
      catch (e) { finish(null, { duration: dur }); }
    };
    v.src = url;
  });
}
function prettyName(name) {
  const s = String(name).replace(/\.[a-z0-9]+$/i, '').replace(/[-_.]+/g, ' ').replace(/\s+/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'My new video';
}
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = 640; c.height = 360;
        const ctx = c.getContext('2d');
        const s = Math.max(640 / img.width, 360 / img.height);
        ctx.drawImage(img, (640 - img.width * s) / 2, (360 - img.height * s) / 2, img.width * s, img.height * s);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.82));
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Not a readable image')); };
    img.src = url;
  });
}

/* ================= thumbnail picker ================= */
function thumbPickerHtml(options, selected) {
  return '<div class="thumbpick">' + options.map((o, i) =>
    '<button type="button" class="tp-item' + (o.key === selected ? ' sel' : '') + '" data-action="thumb-choice" data-key="' + o.key + '" title="' + esc(o.label) + '"><img src="' + o.src + '" alt="' + esc(o.label) + '"></button>'
  ).join('') +
  '<label class="tp-add" tabindex="0">' + icon('image', 18) + '<span>Upload</span><input type="file" accept="image/*" class="tp-file hidden"></label></div>';
}

/* ================= upload modal ================= */
function openUpload() {
  const up = {
    mode: 'file', busy: false, published: false,
    file: null, previewUrl: null, url: '', duration: 0,
    blobKey: null, blobSaved: false, sessionOnly: false,
    captured: null, thumbOptions: [], thumbSel: null, title: ''
  };
  const m = U.modal({
    title: 'Upload a video', size: 'lg',
    html: '<div class="up-root"></div>',
    onClose: () => {
      if (up.previewUrl) URL.revokeObjectURL(up.previewUrl);
      if (up.blobKey && up.blobSaved && !up.published) S.deleteBlob(up.blobKey);
    }
  });
  const rootEl = m.body.querySelector('.up-root');

  function step1() {
    rootEl.innerHTML =
      '<div class="seg">' +
        '<button type="button" class="seg-btn' + (up.mode === 'file' ? ' active' : '') + '" data-uptab="file">' + icon('upload', 16) + 'Upload file</button>' +
        '<button type="button" class="seg-btn' + (up.mode === 'link' ? ' active' : '') + '" data-uptab="link">' + icon('link', 16) + 'From link</button>' +
      '</div>' +
      (up.mode === 'file'
        ? '<div class="dropzone" tabindex="0" role="button" aria-label="Choose a video file">' +
            '<span class="dz-ic">' + icon('upload', 30) + '</span>' +
            '<span class="dz-title">Drag &amp; drop a video file</span>' +
            '<span class="dz-sub">MP4, WebM, MOV — stored locally in your browser, never uploaded to a server.</span>' +
            '<span class="btn btn-primary btn-sm" style="margin-top:10px">' + icon('folder', 15) + 'Browse files</span>' +
            '<input type="file" accept="video/*" class="dz-file hidden">' +
          '</div>' +
          '<div class="dz-or">no file handy?</div>' +
          '<button type="button" class="btn up-sample" style="width:100%;justify-content:center">' + icon('sparkles', 16) + 'Use a sample clip instead</button>'
        : '<div class="field"><label class="flabel" for="upUrl">Video URL (MP4 / WebM)</label>' +
          '<input class="finput" id="upUrl" placeholder="https://example.com/video.mp4" value="' + esc(up.url) + '"></div>' +
          '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
          '<button type="button" class="btn btn-primary up-load">' + icon('link', 15) + 'Load video</button>' +
          '<button type="button" class="btn up-sample">' + icon('sparkles', 15) + 'Use a sample clip</button></div>' +
          '<div class="fhint" style="margin-top:12px">The link is saved with the video and streamed on playback. Pick a sample to try the full flow instantly.</div>' +
          '<div class="up-err"></div>');
    const dz = rootEl.querySelector('.dropzone');
    if (dz) {
      const fileInput = dz.querySelector('.dz-file');
      dz.addEventListener('click', () => fileInput.click());
      dz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
      ['dragover', 'dragenter'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
      ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
      dz.addEventListener('drop', e => { const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) handleFile(f); });
      fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });
    }
    const loadBtn = rootEl.querySelector('.up-load');
    if (loadBtn) loadBtn.addEventListener('click', () => {
      const input = rootEl.querySelector('#upUrl');
      handleUrl(input.value.trim());
    });
    const urlInput = rootEl.querySelector('#upUrl');
    if (urlInput) urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); handleUrl(urlInput.value.trim()); } });
    rootEl.querySelector('.up-sample').addEventListener('click', () => {
      const used = S.videos().map(v => v.source.url).filter(Boolean);
      const pool = S.SAMPLES.filter(s => !used.includes(s.url));
      const pick = (pool.length ? pool : S.SAMPLES)[Math.floor(Math.random() * (pool.length || S.SAMPLES.length))];
      up.mode = 'link'; up.url = pick.url; up.title = pick.label + ' — My Upload';
      handleUrl(pick.url, pick.duration);
    });
    rootEl.querySelectorAll('[data-uptab]').forEach(b => b.addEventListener('click', () => { up.mode = b.dataset.uptab; step1(); }));
  }
  function progress(steps, active) {
    rootEl.innerHTML = '<div class="up-progress"><div class="spinner"></div><div class="up-steps">' +
      steps.map((s, i) => '<div class="up-step ' + (i < active ? 'done' : i === active ? 'active' : '') + '">' +
        icon(i < active ? 'check-circle' : 'clock', 15) + esc(s) + '</div>').join('') + '</div></div>';
  }
  function fail(msg) {
    up.busy = false;
    step1();
    const err = rootEl.querySelector('.up-err') || (() => { const d = document.createElement('div'); d.className = 'up-err'; rootEl.appendChild(d); return d; })();
    err.innerHTML = '<div class="ferror" style="margin-top:14px">' + icon('alert', 13) + ' ' + esc(msg) + '</div>';
  }
  async function handleFile(file) {
    if (up.busy) return;
    if (!file.type.startsWith('video/')) { fail('That doesn\'t look like a video file. Try MP4, WebM or MOV.'); return; }
    if (file.size > 500 * 1024 * 1024) { fail('This file is over 500 MB — too large for browser storage.'); return; }
    up.busy = true; up.file = file; up.title = prettyName(file.name);
    up.previewUrl = URL.createObjectURL(file);
    const steps = ['Reading video metadata', 'Capturing a thumbnail frame', 'Saving to your library'];
    progress(steps, 0);
    let meta = { duration: 0 };
    try { meta = await probeVideo(up.previewUrl, true); }
    catch (e) {
      try { meta = await probeVideo(up.previewUrl, false); } catch (e2) { meta = { duration: 0 }; }
    }
    up.duration = Math.round(meta.duration || 0);
    up.captured = meta.thumb || null;
    progress(steps, 1);
    await new Promise(r => setTimeout(r, 250));
    progress(steps, 2);
    up.blobKey = 'blob_' + U.uid();
    up.blobSaved = await S.saveBlob(up.blobKey, file);
    up.sessionOnly = !up.blobSaved;
    up.busy = false;
    step2();
  }
  async function handleUrl(url, knownDur) {
    if (up.busy) return;
    try { const u = new URL(url); if (!/^https?:$/.test(u.protocol)) throw 0; }
    catch (e) { fail('Enter a valid http(s) video URL, e.g. https://example.com/clip.mp4'); return; }
    up.busy = true; up.url = url;
    if (!up.title) up.title = prettyName(decodeURIComponent(url.split('/').pop() || 'Linked video'));
    progress(['Checking the video link', 'Reading metadata'], 0);
    let dur = knownDur || 0;
    if (!dur) { try { const meta = await probeVideo(url, false); dur = Math.round(meta.duration || 0); } catch (e) { dur = 0; } }
    up.duration = dur; up.captured = null; up.busy = false;
    step2();
  }
  function buildThumbOptions() {
    const seed = 'up' + Date.now();
    up.thumbOptions = [];
    if (up.captured) up.thumbOptions.push({ key: 'captured', label: 'Captured frame', src: up.captured });
    up.thumbOptions.push({ key: 'art1', label: 'Generated artwork A', src: U.artwork(seed + 'a', up.title || 'New video', 'Entertainment') });
    up.thumbOptions.push({ key: 'art2', label: 'Generated artwork B', src: U.artwork(seed + 'b', up.title || 'New video', 'Film & Animation') });
    up.thumbSel = up.thumbOptions[0].key;
  }
  function step2() {
    buildThumbOptions();
    const srcLabel = up.file ? up.file.name + ' · ' + (up.file.size / 1048576).toFixed(1) + ' MB' : up.url;
    rootEl.innerHTML =
      (up.sessionOnly ? '<div class="ferror" style="margin-bottom:14px">' + icon('alert', 13) + ' Browser storage is full — this file will play for this session only. Details are still saved.</div>' : '') +
      '<div class="up-grid"><div class="up-preview">' +
        (up.previewUrl ? '<video src="' + up.previewUrl + '" controls muted playsinline></video>' : '<img class="up-poster" src="' + up.thumbOptions[0].src + '" alt="">') +
        '<div class="up-src">' + icon(up.file ? 'folder' : 'link', 14) + '<span>' + esc(srcLabel) + '</span></div>' +
        '<div class="fhint">' + (up.duration ? 'Duration detected: ' + fmtDuration(up.duration) : 'Duration unknown — it will be read on playback.') + '</div>' +
        '<div class="field" style="margin-top:16px"><label class="flabel">Thumbnail <span class="fcount">pick one or upload</span></label><div class="up-thumbs">' + thumbPickerHtml(up.thumbOptions, up.thumbSel) + '</div></div>' +
      '</div>' +
      '<form class="up-form" novalidate>' +
        '<div class="field"><label class="flabel">Title <span class="fcount f-title">0/100</span></label><input class="finput f-title-in" maxlength="100" value="' + esc(up.title) + '" placeholder="Give your video a title" autofocus><div class="ferror f-title-err hidden">A title is required.</div></div>' +
        '<div class="field"><label class="flabel">Description <span class="fcount f-desc">0/5000</span></label><textarea class="ftextarea f-desc-in" maxlength="5000" placeholder="Tell viewers about your video… tip: lines like “1:20 Intro” become chapters."></textarea></div>' +
        '<div class="frow"><div class="field"><label class="flabel">Category</label><select class="fselect f-cat">' + Object.keys(U.CATS).map(c => '<option' + (c === 'Vlogs' ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select></div>' +
        '<div class="field"><label class="flabel">Visibility</label><select class="fselect f-vis"><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></select><div class="fhint f-vis-hint">Anyone can find and watch it.</div></div></div>' +
        '<div class="field"><label class="flabel">Tags <span class="fcount">comma separated</span></label><input class="finput f-tags" placeholder="vlog, tutorial, 2026"></div>' +
        '<div class="modal-foot" style="padding:14px 0 0"><button type="button" class="btn btn-ghost foot-left up-back">' + icon('arrow-left', 15) + 'Back</button>' +
        '<button type="button" class="btn up-cancel">Cancel</button>' +
        '<button type="submit" class="btn btn-primary up-publish">' + icon('upload', 16) + 'Publish</button></div>' +
      '</form></div>';
    const form = rootEl.querySelector('.up-form');
    const titleIn = form.querySelector('.f-title-in'), descIn = form.querySelector('.f-desc-in');
    const cnt = () => {
      form.querySelector('.f-title').textContent = titleIn.value.length + '/100';
      form.querySelector('.f-desc').textContent = descIn.value.length + '/5000';
    };
    cnt();
    titleIn.addEventListener('input', () => { cnt(); titleIn.classList.remove('err'); form.querySelector('.f-title-err').classList.add('hidden'); });
    descIn.addEventListener('input', cnt);
    form.querySelector('.f-vis').addEventListener('change', e => {
      form.querySelector('.f-vis-hint').textContent = { public: 'Anyone can find and watch it.', unlisted: 'Only people with the link can watch it.', private: 'Only you can see it in Studio.' }[e.target.value];
    });
    wireThumbs(rootEl, up);
    form.querySelector('.up-back').addEventListener('click', () => {
      if (up.blobKey && up.blobSaved) { S.deleteBlob(up.blobKey); up.blobKey = null; up.blobSaved = false; }
      if (up.previewUrl) { URL.revokeObjectURL(up.previewUrl); up.previewUrl = null; }
      up.file = null; up.captured = null; step1();
    });
    form.querySelector('.up-cancel').addEventListener('click', () => m.close());
    form.addEventListener('submit', e => {
      e.preventDefault();
      const title = titleIn.value.trim();
      if (!title) { titleIn.classList.add('err'); form.querySelector('.f-title-err').classList.remove('hidden'); titleIn.focus(); return; }
      const cat = form.querySelector('.f-cat').value;
      const chosen = up.thumbOptions.find(o => o.key === up.thumbSel);
      const video = S.add({
        title, description: descIn.value.trim(), category: cat,
        tags: parseTags(form.querySelector('.f-tags').value),
        visibility: form.querySelector('.f-vis').value,
        duration: up.duration,
        thumb: chosen ? chosen.src : U.artwork(U.uid(), title, cat),
        source: up.file ? { type: 'local', blobKey: up.blobKey } : { type: 'url', url: up.url }
      });
      up.published = true;
      ui.flashId = video.id;
      S.state(d => { d.studioPrefs.tab = 'content'; });
      rootEl.innerHTML = '<div class="publish-ok"><span class="ok-ring">' + icon('check', 40) + '</span>' +
        '<h3 style="font-size:19px">Video published! 🎉</h3><p style="color:var(--text2);font-size:13.5px">“' + esc(title) + '” is now in your library' + (video.visibility === 'public' ? ' and live on the homepage.' : '.') + '</p>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">' +
        (video.visibility !== 'private' ? '<a class="btn btn-primary" href="index.html?v=' + video.id + '" target="_blank" rel="noopener">' + icon('play', 16) + 'Watch on HZMTube</a>' : '') +
        '<button type="button" class="btn pub-done">Done</button></div></div>';
      rootEl.querySelector('.pub-done').addEventListener('click', () => m.close());
      render();
      U.toast('Video published', { icon: 'check-circle', type: 'success', action: video.visibility !== 'private' ? { label: 'Watch', fn: () => window.open('index.html?v=' + video.id, '_blank', 'noopener') } : undefined });
    });
  }
  step1();
}
function parseTags(str) {
  return Array.from(new Set(String(str).split(',').map(t => t.trim().toLowerCase()).filter(Boolean))).slice(0, 8);
}
function wireThumbs(scope, model) {
  scope.addEventListener('click', e => {
    const b = e.target.closest('[data-action="thumb-choice"]');
    if (!b || !scope.contains(b)) return;
    model.thumbSel = b.dataset.key;
    scope.querySelectorAll('.tp-item').forEach(x => x.classList.toggle('sel', x.dataset.key === model.thumbSel));
    const poster = scope.querySelector('.up-poster');
    if (poster) { const o = model.thumbOptions.find(o => o.key === model.thumbSel); if (o) poster.src = o.src; }
  });
  const fileIn = scope.querySelector('.tp-file');
  if (fileIn) fileIn.addEventListener('change', async () => {
    const f = fileIn.files[0]; if (!f) return;
    try {
      const src = await compressImage(f);
      const existing = model.thumbOptions.find(o => o.key === 'custom');
      if (existing) existing.src = src; else model.thumbOptions.push({ key: 'custom', label: 'Custom thumbnail', src });
      model.thumbSel = 'custom';
      const holder = scope.querySelector('.up-thumbs') || scope.querySelector('.edit-thumbs');
      holder.innerHTML = thumbPickerHtml(model.thumbOptions, model.thumbSel);
      const nf = holder.querySelector('.tp-file');
      nf.addEventListener('change', () => fileIn.dispatchEvent(new Event('change')));
      const poster = scope.querySelector('.up-poster'); if (poster) poster.src = src;
      U.toast('Custom thumbnail ready', { icon: 'image', type: 'success' });
    } catch (err) { U.toast('Couldn\'t read that image.', { icon: 'alert', type: 'error' }); }
  });
}

/* ================= edit modal ================= */
function openEdit(id) {
  const v = S.get(id);
  if (!v) { U.toast('Video not found.', { icon: 'alert', type: 'error' }); return; }
  const model = {
    thumbOptions: [
      { key: 'current', label: 'Current thumbnail', src: v.thumb },
      { key: 'art1', label: 'Generated artwork A', src: U.artwork(v.id + 'e1' + Date.now(), v.title, v.category) },
      { key: 'art2', label: 'Generated artwork B', src: U.artwork(v.id + 'e2' + Date.now(), v.title, v.category) }
    ],
    thumbSel: 'current', newSource: null, newDuration: null, newBlobKey: null, saved: false
  };
  const m = U.modal({
    title: 'Edit video', size: 'lg',
    html:
      '<div class="up-grid"><div class="up-preview">' +
        '<img class="up-poster" src="' + v.thumb + '" alt="">' +
        '<div class="up-src">' + icon(v.source.type === 'local' ? 'folder' : 'link', 14) + '<span>' + esc(v.source.type === 'local' ? 'Local file · ' + fmtDuration(v.duration) : v.source.url) + '</span></div>' +
        '<button type="button" class="btn btn-sm ed-replace" style="margin-top:12px;width:100%;justify-content:center">' + icon('refresh', 14) + 'Replace video file</button>' +
        '<input type="file" accept="video/*" class="ed-file hidden">' +
        '<div class="fhint ed-replace-note"></div>' +
        '<div class="field" style="margin-top:16px"><label class="flabel">Thumbnail</label><div class="edit-thumbs">' + thumbPickerHtml(model.thumbOptions, model.thumbSel) + '</div>' +
        '<button type="button" class="btn btn-ghost btn-sm ed-reshuffle" style="margin-top:8px">' + icon('refresh', 13) + 'Regenerate artwork</button></div>' +
      '</div>' +
      '<form class="ed-form" novalidate>' +
        '<div class="field"><label class="flabel">Title <span class="fcount f-title">' + v.title.length + '/100</span></label><input class="finput f-title-in" maxlength="100" value="' + esc(v.title) + '" autofocus><div class="ferror f-title-err hidden">A title is required.</div></div>' +
        '<div class="field"><label class="flabel">Description <span class="fcount f-desc">' + v.description.length + '/5000</span></label><textarea class="ftextarea f-desc-in" maxlength="5000" style="min-height:130px">' + esc(v.description) + '</textarea></div>' +
        '<div class="frow"><div class="field"><label class="flabel">Category</label><select class="fselect f-cat">' + Object.keys(U.CATS).map(c => '<option' + (c === v.category ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select></div>' +
        '<div class="field"><label class="flabel">Visibility</label><select class="fselect f-vis">' + ['public', 'unlisted', 'private'].map(o => '<option value="' + o + '"' + (v.visibility === o ? ' selected' : '') + '>' + visMeta(o)[1] + '</option>').join('') + '</select></div></div>' +
        '<div class="field"><label class="flabel">Tags <span class="fcount">comma separated</span></label><input class="finput f-tags" value="' + esc(v.tags.join(', ')) + '"></div>' +
        '<div class="modal-foot" style="padding:14px 0 0">' +
        '<button type="button" class="danger-link foot-left ed-delete">' + icon('trash', 14) + 'Delete video</button>' +
        '<button type="button" class="btn ed-cancel">Cancel</button>' +
        '<button type="submit" class="btn btn-primary">' + icon('check', 16) + 'Save changes</button></div>' +
      '</form></div>',
    onClose: () => {
      currentEdit = null;
      if (model.newBlobKey && !model.saved) S.deleteBlob(model.newBlobKey);
    }
  });
  currentEdit = { id, modal: m };
  wireThumbs(m.body, model);
  const form = m.body.querySelector('.ed-form');
  const titleIn = form.querySelector('.f-title-in'), descIn = form.querySelector('.f-desc-in');
  const cnt = () => {
    form.querySelector('.f-title').textContent = titleIn.value.length + '/100';
    form.querySelector('.f-desc').textContent = descIn.value.length + '/5000';
  };
  titleIn.addEventListener('input', () => { cnt(); titleIn.classList.remove('err'); form.querySelector('.f-title-err').classList.add('hidden'); });
  descIn.addEventListener('input', cnt);
  m.body.querySelector('.ed-reshuffle').addEventListener('click', () => {
    model.thumbOptions = model.thumbOptions.filter(o => o.key === 'current' || o.key === 'custom' || o.key === 'captured');
    model.thumbOptions.push({ key: 'art1', label: 'Generated artwork A', src: U.artwork(U.uid() + 'a', titleIn.value || v.title, form.querySelector('.f-cat').value) });
    model.thumbOptions.push({ key: 'art2', label: 'Generated artwork B', src: U.artwork(U.uid() + 'b', titleIn.value || v.title, form.querySelector('.f-cat').value) });
    model.thumbSel = 'art1';
    m.body.querySelector('.edit-thumbs').innerHTML = thumbPickerHtml(model.thumbOptions, model.thumbSel);
    m.body.querySelector('.up-poster').src = model.thumbOptions.find(o => o.key === 'art1').src;
    const nf = m.body.querySelector('.tp-file');
    nf.addEventListener('change', () => m.body.querySelector('.tp-file').dispatchEvent(new Event('change')));
  });
  const replaceBtn = m.body.querySelector('.ed-replace'), fileIn = m.body.querySelector('.ed-file');
  replaceBtn.addEventListener('click', () => fileIn.click());
  fileIn.addEventListener('change', async () => {
    const f = fileIn.files[0]; if (!f) return;
    if (!f.type.startsWith('video/')) { U.toast('Choose a video file.', { icon: 'alert', type: 'error' }); return; }
    replaceBtn.disabled = true; replaceBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> Processing…';
    const url = URL.createObjectURL(f);
    let meta = { duration: 0 };
    try { meta = await probeVideo(url, true); } catch (e) { try { meta = await probeVideo(url, false); } catch (e2) {} }
    URL.revokeObjectURL(url);
    const key = 'blob_' + U.uid();
    const persisted = await S.saveBlob(key, f);
    if (model.newBlobKey) S.deleteBlob(model.newBlobKey);
    model.newBlobKey = key;
    model.newSource = { type: 'local', blobKey: key };
    model.newDuration = Math.round(meta.duration || 0);
    if (meta.thumb) {
      model.thumbOptions = model.thumbOptions.filter(o => o.key !== 'captured');
      model.thumbOptions.unshift({ key: 'captured', label: 'Captured frame', src: meta.thumb });
      model.thumbSel = 'captured';
      m.body.querySelector('.edit-thumbs').innerHTML = thumbPickerHtml(model.thumbOptions, model.thumbSel);
      m.body.querySelector('.up-poster').src = meta.thumb;
    }
    m.body.querySelector('.ed-replace-note').textContent = 'New file ready: ' + f.name + (persisted ? '' : ' (session only — storage full)') + '. Save to apply.';
    replaceBtn.disabled = false; replaceBtn.innerHTML = icon('refresh', 14) + 'Replace video file';
    U.toast('New file processed — save to apply', { icon: 'check-circle', type: 'success' });
  });
  form.querySelector('.ed-cancel').addEventListener('click', () => m.close());
  form.querySelector('.ed-delete').addEventListener('click', () => { m.close(); deleteVideos([id]); });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const title = titleIn.value.trim();
    if (!title) { titleIn.classList.add('err'); form.querySelector('.f-title-err').classList.remove('hidden'); titleIn.focus(); return; }
    const chosen = model.thumbOptions.find(o => o.key === model.thumbSel);
    const patch = {
      title, description: descIn.value.trim(),
      category: form.querySelector('.f-cat').value,
      visibility: form.querySelector('.f-vis').value,
      tags: parseTags(form.querySelector('.f-tags').value),
      thumb: chosen ? chosen.src : v.thumb
    };
    if (model.newSource) {
      if (v.source.type === 'local' && v.source.blobKey) S.deleteBlob(v.source.blobKey);
      S.revokeSrc(v.id);
      patch.source = model.newSource;
      patch.duration = model.newDuration || 0;
      model.saved = true;
    }
    S.update(id, patch);
    model.saved = true;
    ui.flashId = id;
    m.close(); render();
    U.toast('Changes saved', { icon: 'check-circle', type: 'success' });
  });
}

/* ================= events ================= */
function bind() {
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const a = t.dataset.action, id = t.dataset.id;
    if (a === 'snav') setTab(t.dataset.tab);
    else if (a === 'upload') openUpload();
    else if (a === 'edit') openEdit(id);
    else if (a === 'delete') deleteVideos([id]);
    else if (a === 'vfilter') { S.state(d => { d.studioPrefs.vfilter = t.dataset.f; }); ui.sel.clear(); render(); }
    else if (a === 'sort') {
      const key = t.dataset.key, p = prefs();
      S.state(d => {
        if (d.studioPrefs.sortKey === key) d.studioPrefs.sortDir = d.studioPrefs.sortDir === 'asc' ? 'desc' : 'asc';
        else { d.studioPrefs.sortKey = key; d.studioPrefs.sortDir = key === 'title' ? 'asc' : 'desc'; }
      });
      render();
    }
    else if (a === 'bulk-delete') deleteVideos(Array.from(ui.sel));
    else if (a === 'bulk-clear') { ui.sel.clear(); render(); }
    else if (a === 'clear-content-filters') { ui.q = ''; $('#searchInput').value = ''; $('#searchClear').classList.add('hidden'); S.state(d => { d.studioPrefs.vfilter = 'all'; }); render(); }
  });
  document.addEventListener('change', e => {
    if (e.target.classList.contains('row-chk')) {
      const id = e.target.dataset.id;
      e.target.checked ? ui.sel.add(id) : ui.sel.delete(id);
      render();
    } else if (e.target.classList.contains('chk-all')) {
      const ids = contentList().map(v => v.id);
      if (e.target.checked) ids.forEach(i => ui.sel.add(i)); else ids.forEach(i => ui.sel.delete(i));
      render();
    } else if (e.target.classList.contains('vis-sel')) {
      const v = S.update(e.target.dataset.id, { visibility: e.target.value });
      render();
      if (v) U.toast('Visibility set to ' + visMeta(v.visibility)[1], { icon: visMeta(v.visibility)[0], type: 'info' });
    } else if (e.target.classList.contains('bulk-vis') && e.target.value) {
      const vis = e.target.value; let n = 0;
      ui.sel.forEach(id => { if (S.update(id, { visibility: vis })) n++; });
      ui.sel.clear(); render();
      U.toast(n + ' video' + (n === 1 ? '' : 's') + ' set to ' + visMeta(vis)[1], { icon: visMeta(vis)[0], type: 'success' });
    }
  });
  const si = $('#searchInput'), sc = $('#searchClear');
  const doSearch = U.debounce(() => {
    ui.q = si.value.trim();
    sc.classList.toggle('hidden', !ui.q);
    if (ui.q && prefs().tab !== 'content') S.state(d => { d.studioPrefs.tab = 'content'; });
    render();
  }, 150);
  si.addEventListener('input', doSearch);
  $('#searchForm').addEventListener('submit', e => { e.preventDefault(); ui.q = si.value.trim(); if (prefs().tab !== 'content') S.state(d => { d.studioPrefs.tab = 'content'; }); render(); document.body.classList.remove('search-open'); });
  sc.addEventListener('click', () => { si.value = ''; ui.q = ''; sc.classList.add('hidden'); render(); si.focus(); });
  $('#drawerScrim').addEventListener('click', () => {
    document.body.classList.remove('drawer-open');
    $('#drawerScrim').classList.add('hidden'); U.lock(false);
  });
  S.onChange(() => {
    if (currentEdit && !S.get(currentEdit.id)) { currentEdit.modal.close(); U.toast('That video was removed elsewhere.', { icon: 'alert', type: 'error' }); }
    render(); U.refreshBadge();
  });
}

/* ================= boot ================= */
function boot() {
  S.init();
  U.initChrome({
    onNavToggle: () => {
      const open = document.body.classList.toggle('drawer-open');
      $('#drawerScrim').classList.toggle('hidden', !open);
      U.lock(open);
    },
    onEsc: () => {
      if (document.body.classList.contains('drawer-open')) {
        document.body.classList.remove('drawer-open');
        $('#drawerScrim').classList.add('hidden'); U.lock(false);
      }
    }
  });
  bind();
  render();
  let params = new URLSearchParams();
  try { params = new URLSearchParams(location.search); } catch (e) {}
  const strip = () => { try { history.replaceState(null, '', location.pathname); } catch (e) {} };
  if (params.get('upload')) { strip(); openUpload(); }
  else if (params.get('edit')) { const id = params.get('edit'); strip(); S.state(d => { d.studioPrefs.tab = 'content'; }); render(); openEdit(id); }
}
boot();
})();
