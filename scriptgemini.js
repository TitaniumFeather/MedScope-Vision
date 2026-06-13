// ========= HERO-FIRST BOOTSTRAP =========
const __hero     = document.getElementById('hero');
const __heroDrop = document.getElementById('heroDrop');
const __heroFile = document.getElementById('heroFile');
const __chatEl   = document.getElementById('chat');
const __composer = document.querySelector('.composer');

let __HERO_ACTIVE = true;

function __showHeroOnly() {
  __HERO_ACTIVE = true;
  if (__hero)     __hero.classList.remove('is-hidden');
  if (__chatEl)   __chatEl.style.display = 'none';
  if (__composer) __composer.style.display = 'none';
}
function __showAppHideHero() {
  __HERO_ACTIVE = false;
  if (__hero)     __hero.classList.add('is-hidden');
  if (__chatEl)   __chatEl.style.display = '';
  if (__composer) __composer.style.display = '';
}
function __animateHeroExit(callback) {
  if (!__hero) { __showAppHideHero(); callback?.(); return; }
  __hero.classList.add('is-exiting');
  const done = () => {
    __hero.removeEventListener('animationend', done, true);
    __hero.classList.remove('is-exiting');
    __showAppHideHero();
    callback?.();
  };
  __hero.addEventListener('animationend', done, true);
}

document.addEventListener('DOMContentLoaded', () => { __showHeroOnly(); });

__heroDrop?.addEventListener('click', () => __heroFile?.click());
__heroFile?.addEventListener('change', e => {
  const files = e.target.files;
  if (!files?.length) return;
  handleFiles(files);
  __animateHeroExit();
  e.target.value = '';
});
document.getElementById('newAnalysis')?.addEventListener('click', () => {
  saveCurrentSession();
  const id = createSession();
  state.sessionId = id;
  state.messages = [];
  clearImages();
  renderSessionList();
  __showHeroOnly();
});

// ===== EXAMPLE IMAGE LOADING =====
async function loadExampleImage(url, name) {
  const resp = await fetch(url, { mode: 'cors' });
  if (!resp.ok) throw new Error(`Failed to load example (${resp.status})`);
  const blob = await resp.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve({ dataUrl: e.target.result, name });
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}
document.querySelectorAll('.ex-card').forEach(card => {
  card.addEventListener('click', async () => {
    const src = card.dataset.src, name = card.dataset.name || 'example.jpg';
    if (!src) return;
    card.classList.add('is-loading');
    try {
      const imgObj = await loadExampleImage(src, name);
      state.images = [imgObj];
      renderPreview();
      syncButtons();
      __animateHeroExit(() => { setTimeout(() => analyzeBtn.click(), 200); });
    } catch (err) {
      card.classList.remove('is-loading');
      alert('Could not load example image. Please upload your own.');
    }
  });
});

// ========= CONFIG =========
const MODEL          = 'gemini-2.5-flash';
const SESSIONS_META  = 'medscope_sessions_v2';
const SESS_PREFIX    = 'medscope_sess_';
const THEME_KEY      = 'medscope_theme';
const KEY_STORAGE    = 'medscope_gemini_key';

// ========= API KEY (HARDCODED) =========
// Paste your own Gemini API key below. This is used directly instead of
// the sidebar input / localStorage, so the user never needs to supply one.
const HARDCODED_GEMINI_API_KEY = 'AQ.Ab8RN6ISetgyMnDuP5negdLc8sbN6j2nG3R4iF09YibTHL37_A';

function getSavedKey() { return localStorage.getItem(KEY_STORAGE) || ''; }
function saveKey(k)    { k ? localStorage.setItem(KEY_STORAGE, k) : localStorage.removeItem(KEY_STORAGE); }
function showKeyStatus(msg, ok) {
  const el = document.getElementById('keyStatus');
  if (!el) return;
  el.textContent = msg;
  el.style.color = ok ? 'var(--accent)' : '#ff6b6b';
  el.style.display = msg ? 'block' : 'none';
}

// ========= SESSION MANAGEMENT =========
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

function getMeta() {
  try { return JSON.parse(localStorage.getItem(SESSIONS_META)) || { active: null, list: [] }; }
  catch { return { active: null, list: [] }; }
}
function setMeta(m) { localStorage.setItem(SESSIONS_META, JSON.stringify(m)); }
function getSessData(id) {
  try { return JSON.parse(localStorage.getItem(SESS_PREFIX + id)) || { messages: [] }; }
  catch { return { messages: [] }; }
}
function setSessData(id, data) { localStorage.setItem(SESS_PREFIX + id, JSON.stringify(data)); }

function createSession() {
  const meta = getMeta();
  const id = genId();
  meta.list.unshift({ id, name: 'New analysis', ts: Date.now() });
  meta.active = id;
  setMeta(meta);
  return id;
}
function deleteSession(id) {
  const meta = getMeta();
  meta.list = meta.list.filter(s => s.id !== id);
  localStorage.removeItem(SESS_PREFIX + id);
  if (meta.active === id) meta.active = meta.list[0]?.id || null;
  setMeta(meta);
}
function autoNameSession(id, text) {
  const meta = getMeta();
  const sess = meta.list.find(s => s.id === id);
  if (!sess || sess.name !== 'New analysis') return;
  const name = text.replace(/[#*`\n]/g, '').trim().slice(0, 36) || 'Untitled';
  sess.name = name + (name.length >= 36 ? '…' : '');
  sess.ts = Date.now();
  setMeta(meta);
  renderSessionList();
}
function saveCurrentSession() {
  if (!state.sessionId) return;
  setSessData(state.sessionId, { messages: state.messages });
  const meta = getMeta();
  const sess = meta.list.find(s => s.id === state.sessionId);
  if (sess) { sess.ts = Date.now(); setMeta(meta); }
}
function switchSession(id) {
  if (state.sessionId === id) return;
  saveCurrentSession();
  const data = getSessData(id);
  state.sessionId = id;
  state.messages = data.messages;
  const meta = getMeta(); meta.active = id; setMeta(meta);
  clearImages();
  renderChat();
  renderSessionList();
  if (state.messages.length > 0) __showAppHideHero();
  else __showHeroOnly();
}
function relTime(ts) {
  const d = Date.now() - ts;
  if (d < 60000) return 'Just now';
  if (d < 3600000) return `${Math.floor(d/60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d/3600000)}h ago`;
  return `${Math.floor(d/86400000)}d ago`;
}
function renderSessionList() {
  const meta = getMeta();
  const container = document.getElementById('sessionList');
  if (!container) return;
  container.innerHTML = '';
  if (!meta.list.length) {
    container.innerHTML = '<div class="sess-empty">No previous chats</div>';
    return;
  }
  meta.list.forEach(sess => {
    const el = document.createElement('div');
    el.className = 'sess-item' + (sess.id === meta.active ? ' active' : '');
    el.innerHTML = `
      <svg class="sess-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <div class="sess-info">
        <div class="sess-name">${escapeHtml(sess.name)}</div>
        <div class="sess-ts">${relTime(sess.ts)}</div>
      </div>
      <button class="sess-del" title="Delete">
        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    el.querySelector('.sess-del').addEventListener('click', e => {
      e.stopPropagation();
      if (!confirm('Delete this chat?')) return;
      deleteSession(sess.id);
      const newMeta = getMeta();
      if (newMeta.list.length > 0) {
        switchSession(newMeta.list[0].id);
      } else {
        const nid = createSession(); state.sessionId = nid; state.messages = [];
        renderSessionList(); __showHeroOnly();
      }
    });
    el.addEventListener('click', () => switchSession(sess.id));
    container.appendChild(el);
  });
}

// ========= STATE =========
const state = { busy: false, images: [], messages: [], sessionId: null };

// ========= DOM =========
const root         = document.getElementById('root');
const chat         = document.getElementById('chat');
const dropzone     = document.getElementById('dropzone');
const attachBtn    = document.getElementById('attachBtn');
const fileInput    = document.getElementById('fileInput');
const messageInput = document.getElementById('messageInput');
const preview      = document.getElementById('preview');
const clearBtn     = document.getElementById('clearBtn');
const analyzeBtn   = document.getElementById('sendBtn');
const clearChatBtn = document.getElementById('clearChatBtn');
const exportBtn    = document.getElementById('exportBtn');
const importInput  = document.getElementById('importInput');
const themeBtn     = document.getElementById('themeBtn');
const progress     = document.getElementById('progress');
const progressBar  = progress.querySelector('div');
const lightbox     = document.getElementById('lightbox');
const lightboxImg  = lightbox.querySelector('img');

// ========= INIT =========
document.addEventListener('DOMContentLoaded', () => {
  // Key input
  const field = document.getElementById('apiKeyField');
  const btn   = document.getElementById('keySaveBtn');
  const saved = getSavedKey();
  if (field && saved) { field.value = saved; showKeyStatus('✓ Key loaded', true); }
  btn?.addEventListener('click', () => {
    const val = field?.value?.trim();
    if (!val) { showKeyStatus('Please paste a key first', false); return; }
    if (!val.startsWith('AIza')) { showKeyStatus("Doesn't look like a Gemini key", false); return; }
    saveKey(val); showKeyStatus('✓ Key saved', true);
  });
  field?.addEventListener('keydown', e => { if (e.key === 'Enter') btn?.click(); });

  // Theme
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme) root.setAttribute('data-theme', savedTheme);

  // Session init
  let meta = getMeta();
  if (!meta.list.length || !meta.active) {
    const id = createSession();
    state.sessionId = id;
    state.messages = [];
  } else {
    state.sessionId = meta.active;
    state.messages = getSessData(meta.active).messages;
    if (state.messages.length > 0) {
      setTimeout(() => __showAppHideHero(), 0); // override hero-only after it runs
    }
  }
  renderSessionList();
  renderChat();
  syncButtons();
});

// ========= THEME =========
themeBtn.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
});

// ========= MARKDOWN =========
function renderMarkdown(raw) {
  // Escape HTML first
  let t = raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // Code blocks
  const blocks = [];
  t = t.replace(/```[\s\S]*?```/g, m => {
    const code = m.slice(3,-3).replace(/^\w+\n/,'');
    blocks.push(`<pre><code>${code.trim()}</code></pre>`);
    return `\x00B${blocks.length-1}\x00`;
  });
  // Inline code
  t = t.replace(/`([^`]+)`/g,'<code>$1</code>');
  // Bold+italic, bold, italic
  t = t.replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>');
  t = t.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  t = t.replace(/\*(.+?)\*/g,'<em>$1</em>');
  // Headings
  t = t.replace(/^#### (.+)$/gm,'<h5 class="md-h">$1</h5>');
  t = t.replace(/^### (.+)$/gm,'<h4 class="md-h">$1</h4>');
  t = t.replace(/^## (.+)$/gm,'<h3 class="md-h">$1</h3>');
  t = t.replace(/^# (.+)$/gm,'<h2 class="md-h">$1</h2>');
  // Bullet lists
  t = t.replace(/((?:^[•\-\*] .+(?:\n|$))+)/gm, block => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^[•\-\*]\s+/,'')}</li>`).join('');
    return `<ul class="md-ul">${items}</ul>`;
  });
  // Numbered lists
  t = t.replace(/((?:^\d+\. .+(?:\n|$))+)/gm, block => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^\d+\.\s+/,'')}</li>`).join('');
    return `<ol class="md-ol">${items}</ol>`;
  });
  // Paragraphs
  const parts = t.split(/\n{2,}/);
  t = parts.map(p => {
    p = p.trim(); if (!p) return '';
    if (/^<(?:h[2-5]|ul|ol|pre|\x00)/.test(p)) return p;
    return `<p>${p.replace(/\n/g,'<br>')}</p>`;
  }).filter(Boolean).join('');
  // Restore code blocks
  blocks.forEach((b,i) => { t = t.replace(`\x00B${i}\x00`, b); });
  return t;
}

// ========= CHAT RENDER =========
function addMessage(role, rawText, htmlOverride) {
  const html = htmlOverride || (role === 'ai' ? renderMarkdown(rawText) : rawText);
  state.messages.push({ role, text: rawText || '', html });
  appendBubble(role, rawText || '', html, state.messages.length - 1);
  saveCurrentSession();
  chat.scrollTop = chat.scrollHeight;
}
function renderChat() {
  chat.innerHTML = '';
  state.messages.forEach((m, i) => appendBubble(m.role, m.text || '', m.html, i));
  chat.scrollTop = chat.scrollHeight;
}
function appendBubble(role, rawText, html, index) {
  const wrap = document.createElement('div');
  wrap.className = `msg ${role === 'user' ? 'user' : ''}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  const content = document.createElement('div');
  content.className = 'bubble-content';
  content.innerHTML = html.replace(/\n/g,'<br>');
  const ops = document.createElement('div');
  ops.className = 'bubble-ops';
  const copy = document.createElement('button');
  copy.className = 'icon-btn';
  copy.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
  copy.addEventListener('click', () => {
    navigator.clipboard.writeText(rawText || stripHtml(html));
    copy.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied`;
    setTimeout(() => { copy.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`; }, 1500);
  });
  const del = document.createElement('button');
  del.className = 'icon-btn';
  del.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg> Delete`;
  del.addEventListener('click', () => { state.messages.splice(index,1); saveCurrentSession(); renderChat(); });
  ops.append(copy, del);
  bubble.append(content, ops);
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = role === 'user' ? 'YOU' : 'AI';
  wrap.append(avatar, bubble);
  chat.appendChild(wrap);
}
function addLoadingBubble() {
  const wrap = document.createElement('div');
  wrap.className = 'msg';
  wrap.id = '__loadingBubble';
  wrap.innerHTML = `
    <div class="avatar">AI</div>
    <div class="bubble loading-bubble">
      <div class="typing-dots"><span></span><span></span><span></span></div>
    </div>`;
  chat.appendChild(wrap);
  chat.scrollTop = chat.scrollHeight;
  return wrap;
}
function removeLoadingBubble() {
  document.getElementById('__loadingBubble')?.remove();
}
async function typewriterReveal(contentEl, rawText) {
  const words = rawText.split(/(\s+)/);
  const totalWords = words.length;
  const speed = Math.max(12, Math.min(45, 6000 / totalWords));
  let i = 0;
  return new Promise(resolve => {
    function tick() {
      if (i >= totalWords) {
        contentEl.innerHTML = renderMarkdown(rawText);
        resolve(); return;
      }
      const chunkSize = Math.max(1, Math.round(totalWords / 250));
      i = Math.min(i + chunkSize, totalWords);
      const partial = words.slice(0, i).join('');
      contentEl.innerHTML = renderMarkdown(partial) + '<span class="stream-cursor"></span>';
      chat.scrollTop = chat.scrollHeight;
      setTimeout(tick, speed);
    }
    tick();
  });
}
function stripHtml(s) { const d = document.createElement('div'); d.innerHTML = s; return d.textContent || ''; }

// ========= DROPZONE =========
if (dropzone) {
  ['dragenter','dragover'].forEach(ev => dropzone.addEventListener(ev, e => {
    e.preventDefault(); dropzone.classList.add('is-dragover');
  }));
  ['dragleave','drop'].forEach(ev => dropzone.addEventListener(ev, e => {
    e.preventDefault(); dropzone.classList.remove('is-dragover');
  }));
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
}
attachBtn?.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => handleFiles(e.target.files));

function handleFiles(fileList) {
  const max = 6;
  const files = Array.from(fileList || []).slice(0, max - state.images.length);
  if (!files.length) return;
  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = evt => { state.images.push({ dataUrl: evt.target.result, name: file.name }); renderPreview(); syncButtons(); };
    reader.readAsDataURL(file);
  });
  fileInput.value = '';
}
function renderPreview() {
  preview.innerHTML = '';
  state.images.forEach((img, idx) => {
    const box = document.createElement('div');
    box.className = 'thumb';
    box.innerHTML = `<img src="${img.dataUrl}" alt="preview"><button class="remove">✕</button>`;
    box.querySelector('.remove').addEventListener('click', () => { state.images.splice(idx,1); renderPreview(); syncButtons(); });
    box.querySelector('img').addEventListener('click', () => openLightbox(img.dataUrl));
    preview.appendChild(box);
  });
}
function clearImages() { state.images = []; renderPreview(); syncButtons(); }
clearBtn?.addEventListener('click', clearImages);

// ========= LIGHTBOX =========
function openLightbox(src) { lightbox.style.display = 'flex'; lightboxImg.src = src; }
lightbox.addEventListener('click', () => { lightbox.style.display = 'none'; lightboxImg.src = ''; });

// ========= BUTTON STATES =========
function syncButtons() {
  const ready = state.images.length > 0 && !state.busy;
  analyzeBtn.disabled = !ready;
  analyzeBtn.classList.toggle('enabled', ready);
}

messageInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    analyzeBtn?.click();
  }
});

// ========= TOP BAR ACTIONS =========
clearChatBtn.addEventListener('click', () => {
  if (!confirm('Clear this chat?')) return;
  state.messages = [];
  chat.innerHTML = '';
  saveCurrentSession();
  autoNameSession(state.sessionId, ''); // reset name
  const meta = getMeta();
  const sess = meta.list.find(s => s.id === state.sessionId);
  if (sess) { sess.name = 'New analysis'; setMeta(meta); }
  renderSessionList();
});
exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ messages: state.messages }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'medscope_chat.json'; a.click();
  URL.revokeObjectURL(url);
});
importInput.addEventListener('change', async e => {
  const file = e.target.files?.[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (Array.isArray(data.messages)) { state.messages = data.messages; saveCurrentSession(); renderChat(); }
  } catch { alert('Invalid file'); }
  e.target.value = '';
});

// ========= GEMINI HELPERS =========
function toBase64(dataUrl)  { return dataUrl.split(',')[1]; }
function mimeOf(dataUrl)    { return (dataUrl.match(/data:([^;]+);/) || [])[1] || 'image/jpeg'; }

// ========= ANALYZE =========
analyzeBtn.addEventListener('click', async () => {
  if (state.busy || state.images.length === 0) return;

  const key = HARDCODED_GEMINI_API_KEY.trim();
  if (!key || key === 'sd') {
    addMessage('ai', `No API key set. Add your Gemini key to HARDCODED_GEMINI_API_KEY in scriptgemini.js.\nGet one free at https://aistudio.google.com/apikey`,
      `<b>No API key set.</b><div class="hint">Add your Gemini key to <code>HARDCODED_GEMINI_API_KEY</code> in scriptgemini.js. Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a>.</div>`);
    return;
  }

  state.busy = true; syncButtons(); setProgress(5, true);

  const thumbs = state.images.map((_,i) => `Image ${i+1}`).join(', ');
  addMessage('user',
    `Images uploaded (${thumbs}). Please analyze for educational purposes only.`,
    `<div><b>Images uploaded.</b> (${thumbs}) Analyze for educational purposes only.</div><div class="hint">Types: skin, dental, X-ray, MRI, etc.</div>`);

  const loadEl = addLoadingBubble();

  try {
    const parts = [{
      text: `Analyze these medical images for educational insights only. Identify visible features, explain in lay terms, and suggest when professional evaluation is needed.\n\nYou are a cautious medical imaging education assistant:\n• Describe visible features clearly\n• Provide non-diagnostic observations\n• Always note this is NOT a medical diagnosis\n• Suggest when to seek professional care\n• Use calm, clear language`
    }];
    state.images.forEach(img => parts.push({ inline_data: { mime_type: mimeOf(img.dataUrl), data: toBase64(img.dataUrl) } }));

    setProgress(30);

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.25, topK: 40, topP: 0.95, maxOutputTokens: 2048 },
          safetySettings: [
            { category:'HARM_CATEGORY_HARASSMENT',        threshold:'BLOCK_MEDIUM_AND_ABOVE' },
            { category:'HARM_CATEGORY_HATE_SPEECH',       threshold:'BLOCK_MEDIUM_AND_ABOVE' },
            { category:'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold:'BLOCK_MEDIUM_AND_ABOVE' },
            { category:'HARM_CATEGORY_DANGEROUS_CONTENT', threshold:'BLOCK_MEDIUM_AND_ABOVE' }
          ]
        })
      }
    );

    setProgress(70);

    if (!resp.ok) {
      const raw = await resp.text();
      let msg = `API error (${resp.status})`;
      try { const j = JSON.parse(raw); if (j.error?.message) msg += `: ${j.error.message}`; } catch { msg += `: ${raw}`; }
      throw new Error(msg);
    }

    const data = await resp.json();
    if (!data.candidates?.[0]?.content) throw new Error('No content generated. Safety filters may have blocked the response.');
    const rawText = data.candidates[0].content.parts[0].text?.trim() || '(No response)';

    // Replace loading bubble with streaming bubble
    removeLoadingBubble();

    // Create streaming bubble manually (not yet in state)
    const wrap = document.createElement('div');
    wrap.className = 'msg';
    const bubble = document.createElement('div');
    bubble.className = 'bubble streaming';
    const content = document.createElement('div');
    content.className = 'bubble-content';
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = 'AI';
    bubble.appendChild(content);
    wrap.append(avatar, bubble);
    chat.appendChild(wrap);
    chat.scrollTop = chat.scrollHeight;

    setProgress(100);

    // Animate text reveal
    await typewriterReveal(content, rawText);

    // Add copy/delete ops now
    const ops = document.createElement('div');
    ops.className = 'bubble-ops';
    const copy = document.createElement('button');
    copy.className = 'icon-btn';
    copy.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
    copy.addEventListener('click', () => {
      navigator.clipboard.writeText(rawText);
      copy.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied`;
      setTimeout(() => { copy.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`; }, 1500);
    });
    ops.appendChild(copy);
    bubble.classList.remove('streaming');
    bubble.appendChild(ops);

    // Commit to state and save
    state.messages.push({ role: 'ai', text: rawText, html: renderMarkdown(rawText) });
    saveCurrentSession();
    autoNameSession(state.sessionId, rawText);

  } catch(err) {
    removeLoadingBubble();
    console.error(err);
    addMessage('ai', err.message,
      `<b>Something went wrong.</b><div class="hint">${escapeHtml(err.message)}</div>`);
  } finally {
    setTimeout(() => setProgress(0, false), 600);
    state.busy = false; syncButtons();
  }
});

function setProgress(pct, show = true) {
  progress.style.display = show ? 'block' : 'none';
  progressBar.style.width = pct + '%';
}

// ========= UTIL =========
function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
