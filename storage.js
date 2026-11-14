/* ============================================================
   HZMTube — storage layer
   • Video metadata, comments, notifications & user state
     persist in localStorage (survive refresh).
   • Uploaded video FILES persist in IndexedDB (binary-safe),
     with an in-memory fallback if IndexedDB is unavailable.
   ============================================================ */
(function () {
'use strict';
const U = window.HZM;
const NS = 'hzmtube.v1.';
const K = { videos: NS + 'videos', state: NS + 'state', comments: NS + 'comments', notifs: NS + 'notifs', seeded: NS + 'seeded' };
const memLS = {};

function lsGet(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : (key in memLS ? memLS[key] : fallback); }
  catch (e) { return key in memLS ? memLS[key] : fallback; }
}
function lsSet(key, val) {
  memLS[key] = val;
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* quota / privacy mode: session-only */ }
}
function emit() { window.dispatchEvent(new CustomEvent('hzm:change')); }
window.addEventListener('storage', e => { if (e.key && e.key.indexOf(NS) === 0) emit(); });

/* ---------- channels ---------- */
const CHANNELS = [
  { id: 'hzm',    name: 'HZM Originals',     handle: '@hzmoriginals', colors: ['#ff3b5c', '#ff7a45'], verified: true,  subs: 2410000 },
  { id: 'pixel',  name: 'PixelForge Studio', handle: '@pixelforge',   colors: ['#3ea6ff', '#26d0ce'], verified: true,  subs: 1120000 },
  { id: 'torque', name: 'Torque Theory',     handle: '@torquetheory', colors: ['#ffb224', '#ff7a45'], verified: true,  subs: 864000 },
  { id: 'wander', name: 'Wander & Frame',    handle: '@wanderframe',  colors: ['#2fd57b', '#26d0ce'], verified: false, subs: 412000 },
  { id: 'shorts', name: 'HZM Shorts',        handle: '@hzmshorts',    colors: ['#b07cff', '#ff5ca8'], verified: true,  subs: 3050000 },
  { id: 'you',    name: 'Hazem',             handle: '@hazem',        colors: ['#ff3b5c', '#b07cff'], verified: false, subs: 1284 }
];
const channel = id => CHANNELS.find(c => c.id === id) || CHANNELS[5];
const user = () => channel('you');

const GTV = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/';
const SAMPLES = [
  { file: 'ForBiggerBlazes.mp4',    label: 'For Bigger Blazes',    duration: 15 },
  { file: 'ForBiggerEscapes.mp4',   label: 'For Bigger Escapes',   duration: 15 },
  { file: 'ForBiggerFun.mp4',       label: 'For Bigger Fun',       duration: 60 },
  { file: 'ForBiggerJoyrides.mp4',  label: 'For Bigger Joyrides',  duration: 15 },
  { file: 'ForBiggerMeltdowns.mp4', label: 'For Bigger Meltdowns', duration: 15 },
  { file: 'BigBuckBunny.mp4',       label: 'Big Buck Bunny',       duration: 596 },
  { file: 'ElephantsDream.mp4',     label: 'Elephants Dream',      duration: 653 },
  { file: 'Sintel.mp4',             label: 'Sintel',               duration: 888 },
  { file: 'TearsOfSteel.mp4',       label: 'Tears of Steel',       duration: 734 }
].map(s => ({ url: GTV + s.file, label: s.label, duration: s.duration }));

/* ---------- seed library ---------- */
const DAY = 864e5, HOUR = 36e5, NOW = Date.now();
function seedVideos() {
  const raw = [
    ['v-bbb', 'Big Buck Bunny — The Open Movie That Started It All', 'hzm', 'Film & Animation', 596, 4812403, 214500, 260 * DAY,
      'The short that proved open source could look this good. Follow one very large rabbit through a very bad morning — and the sweetest revenge story ever rendered.\n\nMade entirely with Blender by the Blender Foundation.\n\n0:00 A big morning\n2:12 Meet the bullies\n4:05 Buck\'s plan\n6:30 Payback montage\n8:50 Finale & credits\n\nhttps://www.blender.org\n#animation #blender #shortfilm',
      ['animation', 'blender', 'short film', 'open source'], 'BigBuckBunny.mp4', 'public'],
    ['v-sintel', 'Sintel — A Lone Warrior\'s Search for Her Dragon', 'hzm', 'Film & Animation', 888, 3104221, 187300, 190 * DAY,
      'A lone warrior crosses a frozen world in search of the dragon she once saved. Blender\'s third open movie is still a masterclass in mood, silence and scale.\n\n0:00 The search begins\n3:20 Scaling the pass\n7:45 The shaman\n11:10 Confrontation\n13:50 Epilogue\n\nhttps://www.blender.org\n#shortfilm #fantasy #animation',
      ['short film', 'fantasy', 'animation'], 'Sintel.mp4', 'public'],
    ['v-ed', 'Elephants Dream: Inside the First Open Movie', 'pixel', 'Film & Animation', 653, 1942108, 96400, 320 * DAY,
      'Twenty years on, we revisit the film that started the open-movie movement — two men, one impossible machine, and a world that may not exist.\n\n0:00 Proog\'s world\n3:00 The machine halls\n6:40 Emo\'s doubts\n9:30 Collapse\n\n#cgi #opensource #filmhistory',
      ['cgi', 'open source', 'film history'], 'ElephantsDream.mp4', 'public'],
    ['v-tos', 'Tears of Steel — Practical Sets Meets CGI', 'pixel', 'Tech', 734, 2731560, 154800, 96 * DAY,
      'Forty years after a robot attack on the Amsterdam bridge, a team of scientists tries to rewrite the past. Live-action plates meet full-CG robots in this open-source VFX benchmark.\n\n0:00 The bridge\n2:30 Forty years later\n6:10 The plan\n9:45 Reset\n\nhttps://www.blender.org\n#vfx #scifi #cgi',
      ['vfx', 'sci-fi', 'cgi', 'robots'], 'TearsOfSteel.mp4', 'public'],
    ['v-gti', 'VW Golf GTI Review — Still the Hot-Hatch Benchmark?', 'torque', 'Autos', 594, 862311, 41200, 34 * DAY,
      'It invented the hot hatch in 1976 — but does the latest GTI still deserve the crown? We run the numbers, the back roads and the daily commute to find out.\n\n0:00 Cold open\n1:05 Powertrain & gearbox\n4:20 Chassis & ride\n7:10 Interior & tech\n9:00 Verdict\n\n#vw #gti #carreview',
      ['vw', 'gti', 'car review', 'hot hatch'], 'VolkswagenGTIReview.mp4', 'public'],
    ['v-outback', 'Subaru Outback: Street vs. Dirt — Honest Field Test', 'torque', 'Autos', 591, 512774, 23900, 61 * DAY,
      'Mud, gravel and a week of school runs. The Outback claims to do it all — so we actually did it all.\n\n#subaru #outback #fieldtest',
      ['subaru', 'outback', 'field test'], 'SubaruOutbackOnStreetAndDirt.mp4', 'public'],
    ['v-grand', 'We Bought the Cheapest Running Car We Could Find', 'torque', 'Autos', 587, 1204558, 88100, 12 * DAY,
      'One thousand dollars. One running car. Zero regrets? Our budget challenge returns, and this time the stakes smell like burnt oil.\n\n#budgetcars #challenge #projectcar',
      ['budget cars', 'challenge', 'project car'], 'WhatCarCanYouGetForAGrand.mp4', 'public'],
    ['v-bullrun', 'Chasing the Bullrun Convoy — Roadtrip Diaries Ep. 4', 'wander', 'Travel', 47, 289441, 15700, 8 * DAY,
      'Ep. 4 — We tag along with the loudest convoy on the continent. Fuel stops, film cameras and one very questionable shortcut.\n\n#roadtrip #bullrun #travel',
      ['roadtrip', 'bullrun', 'travel'], 'WeAreGoingOnBullrun.mp4', 'public'],
    ['v-escapes', '15 Seconds of Pure Wanderlust — Escape More', 'wander', 'Travel', 15, 1402990, 76300, 21 * DAY,
      'Fifteen seconds to convince you to book the trip. You\'re welcome.\n\n#travel #escape #wanderlust',
      ['travel', 'escape', 'wanderlust'], 'ForBiggerEscapes.mp4', 'public'],
    ['v-joyrides', 'Joyrides: Turn the Volume Up (Official Spot)', 'shorts', 'Entertainment', 15, 981234, 44100, 5 * DAY,
      'Turn it up. Our official spot for everyone who takes the long way home.\n\n#joyride #spot',
      ['joyride', 'spot', 'music'], 'ForBiggerJoyrides.mp4', 'public'],
    ['v-blazes', 'Bring the Heat — For Bigger Blazes', 'shorts', 'Entertainment', 15, 655012, 31800, 3 * DAY,
      'Bring the heat — a 15-second burst of pure blockbuster energy.\n\n#blaze #spot',
      ['blaze', 'spot', 'action'], 'ForBiggerBlazes.mp4', 'public'],
    ['v-meltdown', 'When the Lobby Melts Down — For Bigger Meltdowns', 'shorts', 'Entertainment', 15, 733450, 35600, 2 * DAY,
      'When the lobby melts down but the stream stays up. A tiny spot about very big feelings.\n\n#meltdown #spot',
      ['meltdown', 'spot', 'gaming'], 'ForBiggerMeltdowns.mp4', 'public'],
    ['v-own-welcome', 'Welcome to My Channel — Start Here!', 'you', 'Learning', 60, 10240, 1180, 45 * DAY,
      'New here? Start with this one. What this channel is about, what\'s coming, and how HZMTube keeps everything you publish right in your browser.\n\n0:00 Hello!\n0:20 What we\'re building\n0:45 What\'s next\n\n#welcome #hzmtube',
      ['welcome', 'hzmtube', 'intro'], 'ForBiggerFun.mp4', 'public'],
    ['v-own-vlog', 'Studio Vlog: My Editing Workflow, Start to Finish', 'you', 'Vlogs', 15, 1536, 214, 6 * DAY,
      'A quick lap through my editing workflow — from rough assembly to final grade. Unlisted for now while I tighten the audio mix.\n\n#vlog #editing #workflow',
      ['vlog', 'editing', 'workflow'], 'ForBiggerMeltdowns.mp4', 'unlisted']
  ];
  return raw.map(r => ({
    id: r[0], title: r[1], channel: r[2], category: r[3], duration: r[4], views: r[5], likes: r[6],
    createdAt: NOW - r[7], description: r[8], tags: r[9], visibility: r[11],
    thumb: U.artwork(r[0], r[1], r[3]),
    source: { type: 'url', url: GTV + r[10] }
  }));
}

/* ---------- seed comments ---------- */
const C_AUTHORS = [
  ['Ava Reyes', '#3ea6ff', '#26d0ce'], ['Devon Kim', '#b07cff', '#ff5ca8'], ['Mika Tanaka', '#2fd57b', '#26d0ce'],
  ['Jordan Price', '#ffb224', '#ff7a45'], ['Sana Iqbal', '#ff5ca8', '#b07cff'], ['Leo Martins', '#26d0ce', '#3ea6ff'],
  ['Priya Nair', '#ff3b5c', '#ff7a45'], ['Tomás Rivera', '#2fd57b', '#a3e635'], ['Nina Kovač', '#3ea6ff', '#b07cff'], ['Kai Chen', '#ffb224', '#ff3b5c']
];
const C_TEXTS = [
  'The pacing on this is unreal. Instant rewatch.',
  'Came from the recommendation rail, stayed for the edit.',
  'That transition at the midpoint?? Clean.',
  'This deserves way more views than it has.',
  'The sound design carries so hard here.',
  'Watched twice, caught new details both times.',
  'HZM\'s recommendations sent me. No regrets.',
  'The color grade in this is gorgeous.',
  'Underrated channel, seriously. Subscribed.',
  'Who else is here after the newsletter drop?',
  'The chapter markers are such a nice touch.',
  'Instant classic. Adding this to my watch-later list.'
];
function seedComments(videos) {
  const all = {};
  videos.forEach(v => {
    const r = U.seedRng(v.id + ':comments');
    const count = 2 + Math.floor(r() * 3);
    const list = [];
    const ch = channel(v.channel);
    list.push({
      id: v.id + '-c0', name: ch.name, colors: ch.colors, pinned: true, owner: true,
      text: v.channel === 'you'
        ? 'Thanks for stopping by! Drop a comment with what you want to see next. 🎬'
        : 'Thanks for watching! Chapters are in the description — tell us what we should cover next.',
      likes: Math.floor(v.likes / 90) + 12, at: v.createdAt + 2 * HOUR, own: v.channel === 'you'
    });
    for (let i = 0; i < count; i++) {
      const a = C_AUTHORS[Math.floor(r() * C_AUTHORS.length)];
      list.push({
        id: v.id + '-c' + (i + 1), name: a[0], colors: [a[1], a[2]],
        text: v.id === 'v-own-welcome' && i === 0 ? 'Congrats on the launch — the tour was super clear! 🎉' : C_TEXTS[Math.floor(r() * C_TEXTS.length)],
        likes: Math.floor(r() * Math.max(20, v.views / 2200)) + 3,
        at: v.createdAt + (0.05 + r() * 0.9) * (NOW - v.createdAt), own: false
      });
    }
    all[v.id] = list;
  });
  return all;
}
function seedNotifs() {
  return [
    { id: 'n2', icon: 'chart',    text: '“Welcome to My Channel — Start Here!” passed 10K views. Nice momentum!', at: NOW - 5 * HOUR, video: 'v-own-welcome' },
    { id: 'n3', icon: 'user',     text: 'Torque Theory replied to your comment: “Appreciate the support! 🙌”', at: NOW - 1 * DAY, video: 'v-gti' },
    { id: 'n1', icon: 'video',    text: 'HZM Shorts uploaded “Bring the Heat — For Bigger Blazes”', at: NOW - 3 * DAY, video: 'v-blazes' },
    { id: 'n4', icon: 'sparkles', text: 'Welcome to HZMTube! Your channel is ready — publish your first video from the Studio.', at: NOW - 45 * DAY, action: 'upload' }
  ];
}
function defaultState() {
  return {
    theme: 'dark', sidebar: 'expanded', autoplay: true, bannerDismissed: false,
    reactions: { 'v-bbb': 'like' }, watchLater: ['v-sintel'],
    history: [{ id: 'v-bbb', at: NOW - 2 * DAY }, { id: 'v-gti', at: NOW - 5 * HOUR }],
    positions: { 'v-bbb': 173, 'v-gti': 96 },
    subs: ['pixel', 'torque'], hidden: [], notifReadIds: [],
    likedComments: {}, dislikedComments: {},
    studioPrefs: { tab: 'dashboard', vfilter: 'all', sortKey: 'date', sortDir: 'desc' }
  };
}

/* ---------- init / reset ---------- */
function init() {
  if (!lsGet(K.seeded, null)) {
    const vids = seedVideos();
    lsSet(K.videos, vids);
    lsSet(K.comments, seedComments(vids));
    lsSet(K.notifs, seedNotifs());
    lsSet(K.state, defaultState());
    lsSet(K.seeded, '1');
  }
  if (!lsGet(K.state, null)) lsSet(K.state, defaultState());
}
function resetAll() {
  try { Object.keys(localStorage).filter(k => k.indexOf(NS) === 0).forEach(k => localStorage.removeItem(k)); } catch (e) {}
  Object.keys(memLS).forEach(k => delete memLS[k]);
  memBlobs.clear(); urlCache.forEach(u => URL.revokeObjectURL(u)); urlCache.clear();
  db().then(d => { try { d.transaction('files', 'readwrite').objectStore('files').clear(); } catch (e) {} }).catch(() => {});
  init(); emit();
}

/* ---------- videos CRUD ---------- */
const videos = () => lsGet(K.videos, []);
const get = id => videos().find(v => v.id === id) || null;
function add(data) {
  const id = data.id || U.uid();
  const v = Object.assign({
    id, title: 'Untitled video', description: '', channel: 'you', category: 'Entertainment',
    tags: [], duration: 0, views: 0, likes: 0, createdAt: Date.now(), visibility: 'public',
    source: { type: 'url', url: '' }
  }, data, { id });
  if (!v.thumb) v.thumb = U.artwork(id + Math.random(), v.title, v.category);
  const list = videos(); list.unshift(v); lsSet(K.videos, list);
  const cm = lsGet(K.comments, {}); cm[id] = cm[id] || []; lsSet(K.comments, cm);
  emit(); return v;
}
function update(id, patch) {
  const list = videos(); const i = list.findIndex(v => v.id === id);
  if (i < 0) return null;
  list[i] = Object.assign({}, list[i], patch, { id, updatedAt: Date.now() });
  lsSet(K.videos, list); emit(); return list[i];
}
function remove(id) {
  const list = videos(); const i = list.findIndex(v => v.id === id);
  if (i < 0) return null;
  const [v] = list.splice(i, 1); lsSet(K.videos, list); emit();
  return { video: v, index: i };
}
function restore(video, index) {
  const list = videos();
  list.splice(Math.min(index, list.length), 0, video);
  lsSet(K.videos, list); emit();
}
function purgeRefs(id) {
  state(d => {
    delete d.reactions[id]; delete d.positions[id];
    d.watchLater = d.watchLater.filter(x => x !== id);
    d.history = d.history.filter(h => h.id !== id);
    d.hidden = d.hidden.filter(x => x !== id);
  });
  const cm = lsGet(K.comments, {}); delete cm[id]; lsSet(K.comments, cm);
  revokeSrc(id);
  const v = get(id);
  if (v && v.source.type === 'local' && v.source.blobKey) deleteBlob(v.source.blobKey);
}
function incViews(id) {
  const list = videos(); const v = list.find(x => x.id === id);
  if (v) { v.views = (v.views || 0) + 1; lsSet(K.videos, list); }
}

/* ---------- user state ---------- */
function state(fn) {
  const d = JSON.parse(JSON.stringify(lsGet(K.state, defaultState())));
  if (!fn) return d;
  fn(d); lsSet(K.state, d); return d;
}

/* ---------- comments ---------- */
const comments = vid => lsGet(K.comments, {})[vid] || [];
function addComment(vid, text) {
  const all = lsGet(K.comments, {});
  const u = user();
  const c = { id: 'c' + U.uid(), name: u.name, colors: u.colors, text, likes: 0, at: Date.now(), own: true };
  all[vid] = all[vid] || []; all[vid].unshift(c); lsSet(K.comments, all); emit(); return c;
}
function removeComment(vid, cid) {
  const all = lsGet(K.comments, {}); const list = all[vid] || [];
  const i = list.findIndex(c => c.id === cid); if (i < 0) return null;
  const [c] = list.splice(i, 1); lsSet(K.comments, all); emit(); return { comment: c, index: i };
}
function restoreComment(vid, comment, index) {
  const all = lsGet(K.comments, {}); const list = all[vid] || [];
  list.splice(Math.min(index, list.length), 0, comment); all[vid] = list; lsSet(K.comments, all); emit();
}

/* ---------- notifications ---------- */
const notifs = () => lsGet(K.notifs, []).slice().sort((a, b) => b.at - a.at);
function markNotifRead(ids) { state(d => { d.notifReadIds = Array.from(new Set((d.notifReadIds || []).concat(ids))); }); }

/* ---------- media blobs (IndexedDB + memory fallback) ---------- */
let dbP = null;
const memBlobs = new Map();
const urlCache = new Map();
function db() {
  if (dbP) return dbP;
  dbP = new Promise((res, rej) => {
    try {
      const rq = indexedDB.open('hzmtube-media', 1);
      rq.onupgradeneeded = () => { if (!rq.result.objectStoreNames.contains('files')) rq.result.createObjectStore('files'); };
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error || new Error('idb'));
    } catch (e) { rej(e); }
  });
  return dbP;
}
async function saveBlob(key, blob) {
  try {
    const d = await db();
    await new Promise((res, rej) => {
      const tx = d.transaction('files', 'readwrite');
      tx.objectStore('files').put(blob, key);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error('abort'));
    });
    return true;
  } catch (e) { memBlobs.set(key, blob); return false; }
}
async function getBlob(key) {
  if (memBlobs.has(key)) return memBlobs.get(key);
  try {
    const d = await db();
    return await new Promise((res, rej) => {
      const rq = d.transaction('files').objectStore('files').get(key);
      rq.onsuccess = () => res(rq.result || null); rq.onerror = () => rej(rq.error);
    });
  } catch (e) { return null; }
}
async function deleteBlob(key) {
  memBlobs.delete(key);
  try {
    const d = await db();
    await new Promise(res => { const tx = d.transaction('files', 'readwrite'); tx.objectStore('files').delete(key); tx.oncomplete = res; tx.onerror = res; tx.onabort = res; });
  } catch (e) {}
}
async function resolveSrc(v) {
  if (!v || !v.source) return null;
  if (v.source.type === 'url') return v.source.url || null;
  if (urlCache.has(v.id)) return urlCache.get(v.id);
  const b = await getBlob(v.source.blobKey);
  if (!b) return null;
  const u = URL.createObjectURL(b); urlCache.set(v.id, u); return u;
}
function revokeSrc(id) { if (urlCache.has(id)) { URL.revokeObjectURL(urlCache.get(id)); urlCache.delete(id); } }

/* ---------- expose ---------- */
window.HZMStorage = {
  init, resetAll, videos, get, add, update, remove, restore, purgeRefs, incViews,
  state, comments, addComment, removeComment, restoreComment,
  notifs, markNotifRead, channels: () => CHANNELS.slice(), channel, user, SAMPLES,
  saveBlob, getBlob, deleteBlob, resolveSrc, revokeSrc,
  onChange: fn => window.addEventListener('hzm:change', fn), emit
};
})();
