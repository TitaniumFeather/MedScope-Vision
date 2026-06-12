// Smoothly animate hero out, then reveal the app
function __animateHeroExit() {
  if (!__hero) { __showAppHideHero(); return; }
  // keep chat/composer hidden until animation completes
  __hero.classList.add('is-exiting');
  const done = () => {
    __hero.removeEventListener('animationend', done, true);
    __hero.classList.remove('is-exiting');
    __showAppHideHero(); // now show chat + composer and hide hero
  };
  __hero.addEventListener('animationend', done, true);
}

/* ===== HERO-FIRST BOOTSTRAP (paste ABOVE your existing JS) ===== */

// Elements
const __hero      = document.getElementById('hero');
const __heroDrop  = document.getElementById('heroDrop');
const __heroFile  = document.getElementById('heroFile');
const __chatEl    = document.getElementById('chat');
const __composer  = document.querySelector('.composer');

// State for intercepting initial message
let __HERO_ACTIVE = true;
let __origAddMessage = null;
let __patched = false;

// Patch addMessage so your existing init won't insert the AI welcome while hero is showing
function __patchAddMessage() {
  if (__patched) return;
  __origAddMessage = window.addMessage;
  if (typeof __origAddMessage === 'function') {
    window.addMessage = function(role, html, persist = true) {
      if (__HERO_ACTIVE) return; // suppress while hero is active
      return __origAddMessage(role, html, persist);
    };
    __patched = true;
  }
}
function __restoreAddMessage() {
  if (__patched && __origAddMessage) {
    window.addMessage = __origAddMessage;
    __patched = false;
  }
}

// Visibility helpers
function __showHeroOnly() {
  __HERO_ACTIVE = true;
  // show hero
  if (__hero) __hero.classList.remove('is-hidden');
  // hide chat + composer
  if (__chatEl)   __chatEl.style.display = 'none';
  if (__composer) __composer.style.display = 'none';
  __patchAddMessage();
}
function __showAppHideHero() {
  __HERO_ACTIVE = false;
  if (__hero) __hero.classList.add('is-hidden');
  if (__chatEl)   __chatEl.style.display = '';
  if (__composer) __composer.style.display = '';
  __restoreAddMessage();
}

// Boot: force hero-only at first render
document.addEventListener('DOMContentLoaded', () => {
  __showHeroOnly();
});

// Hero pill interactions
__heroDrop?.addEventListener('click', () => __heroFile?.click());
__heroFile?.addEventListener('change', (e) => {
  const files = e.target.files;
  if (!files || !files.length) return;
  // hand off to your existing multi-image handler
  handleFiles(files);
  __animateHeroExit();     // reveal chat/composer after user picks a file
  e.target.value = '';
});

// Make "New analysis" go back to hero-only (runs before your existing listener)
document.getElementById('newAnalysis')?.addEventListener('click', () => {
  __showHeroOnly();
});
/* ===== /HERO-FIRST BOOTSTRAP ===== */

 
 // ========= CONFIG =========
    const ENABLE_API_KEY_INPUT = false;   // set true to show key field in UI
    const GEMINI_API_KEY = "AQ.Ab8RN6IjIkMkBdNJAJeCpEl_D4c-6yrKZGvYxLAAlDtlUAlbJQ";            // <-- paste your Gemini API key here
    const MODEL = "gemini-3.5-flash";       // or "gemini-1.5-flash" for faster responses
    const STORAGE_KEY = "medscope_pro_chat_v1";
    const THEME_KEY = "medscope_theme";

    // ========= STATE =========
    const state = {
      busy:false,
      images: [], // {dataUrl, name}
      messages: [] // {role:'ai'|'user', html}
    };

    // ========= DOM =========
    const root = document.getElementById('root');
    const chat = document.getElementById('chat');
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const preview = document.getElementById('preview');
    const clearBtn = document.getElementById('clearBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const newBtn = document.getElementById('newAnalysis');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importInput = document.getElementById('importInput');
    const themeBtn = document.getElementById('themeBtn');
    const aboutBtn = document.getElementById('aboutBtn');
    const apiChip = document.getElementById('apiChip');
    const apiKeyInput = document.getElementById('apiKey');
    const progress = document.getElementById('progress');
    const progressBar = progress.querySelector('div');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = lightbox.querySelector('img');

    // ========= INIT =========
    document.addEventListener('DOMContentLoaded', ()=>{
      // api key ui
      apiChip.style.display = ENABLE_API_KEY_INPUT ? 'flex' : 'none';
      if(ENABLE_API_KEY_INPUT){
        apiKeyInput.addEventListener('input', e => window.__APIKEY = e.target.value.trim());
      }
      // theme
      const savedTheme = localStorage.getItem(THEME_KEY);
      if(savedTheme) root.setAttribute('data-theme', savedTheme);
      // restore chat
      restoreSession();
      if(state.messages.length === 0){
        addMessage('ai',
          `<b>Welcome!</b> Upload one or more medical images (photo, X-ray, MRI slice).
           I'll provide educational observations — not a diagnosis.`);
      } else {
        renderChat();
      }
      syncButtons();
    });

    // ========= THEME =========
    themeBtn.addEventListener('click', ()=>{
      const current = root.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem(THEME_KEY, next);
    });

    // ========= CHAT PERSISTENCE =========
    function saveSession(){
      try{
        const data = { messages: state.messages };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }catch{}
    }
    function restoreSession(){
      try{
        const raw = localStorage.getItem(STORAGE_KEY);
        if(!raw) return;
        const { messages } = JSON.parse(raw);
        if(Array.isArray(messages)) state.messages = messages;
      }catch{}
    }
    function clearSession(){
      localStorage.removeItem(STORAGE_KEY);
      state.messages = [];
      chat.innerHTML = '';
    }

    // ========= CHAT RENDER =========
    function addMessage(role, html, persist=true){
      const item = { role, html };
      state.messages.push(item);
      appendBubble(role, html, state.messages.length - 1);
      if(persist) saveSession();
      chat.scrollTop = chat.scrollHeight;
    }
    function renderChat(){
      chat.innerHTML = '';
      state.messages.forEach((m,i)=> appendBubble(m.role, m.html, i));
      chat.scrollTop = chat.scrollHeight;
    }
    function appendBubble(role, html, index){
      const wrap = document.createElement('div');
      wrap.className = `msg ${role==='user'?'user':''}`;
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.innerHTML = html.replace(/\n/g,'<br/>');

      // ops
      const ops = document.createElement('div');
      ops.className = 'bubble-ops';
      const copy = document.createElement('button');
      copy.className = 'icon-btn';
      copy.textContent = 'Copy';
      copy.addEventListener('click', ()=> {
        navigator.clipboard.writeText(stripHtml(state.messages[index].html));
        copy.textContent = 'Copied!';
        setTimeout(()=> copy.textContent = 'Copy', 900);
      });
      const del = document.createElement('button');
      del.className = 'icon-btn';
      del.textContent = 'Delete';
      del.addEventListener('click', ()=>{
        state.messages.splice(index,1);
        saveSession();
        renderChat();
      });
      ops.append(copy, del);
      bubble.appendChild(ops);

      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.textContent = role==='user'?'YOU':'AI';

      wrap.append(avatar, bubble);
      chat.appendChild(wrap);
    }
    function stripHtml(s){ const div=document.createElement('div'); div.innerHTML=s; return div.textContent||''; }

    // ========= DROPZONE (multi-image) =========
    ;['dragenter','dragover'].forEach(ev => dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.style.borderColor='#58ccb2'}));
    ;['dragleave','drop'].forEach(ev => dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.style.borderColor='#3a3b45'}));
    dropzone.addEventListener('click', ()=> fileInput.click());
    dropzone.addEventListener('drop', (e)=> handleFiles(e.dataTransfer.files));
    fileInput.addEventListener('change', e => handleFiles(e.target.files));

    function handleFiles(fileList){
      const max = 6;
      const files = Array.from(fileList||[]).slice(0, max - state.images.length);
      if(!files.length) return;
      files.forEach(file=>{
        if(!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = evt => {
          state.images.push({ dataUrl: evt.target.result, name: file.name });
          renderPreview();
          syncButtons();
        };
        reader.readAsDataURL(file);
      });
      fileInput.value = '';
    }
    function renderPreview(){
      preview.innerHTML = '';
      state.images.forEach((img, idx)=>{
        const box = document.createElement('div');
        box.className = 'thumb';
        box.innerHTML = `<img src="${img.dataUrl}" alt="preview ${idx+1}"><button class="remove">Remove</button>`;
        box.querySelector('.remove').addEventListener('click', ()=>{
          state.images.splice(idx,1); renderPreview(); syncButtons();
        });
        const imgel = box.querySelector('img');
        imgel.addEventListener('click', ()=> openLightbox(img.dataUrl));
        preview.appendChild(box);
      });
    }
    function clearImages(){
      state.images = [];
      renderPreview();
      syncButtons();
    }
    clearBtn.addEventListener('click', clearImages);

    // ========= LIGHTBOX =========
    function openLightbox(src){ lightbox.style.display='flex'; lightboxImg.src = src; }
    lightbox.addEventListener('click', ()=> { lightbox.style.display='none'; lightboxImg.src=''; });

    // ========= BUTTON STATES =========
    function syncButtons(){
      const ready = state.images.length > 0 && !state.busy;
      analyzeBtn.disabled = !ready;
      analyzeBtn.classList.toggle('enabled', ready);
      analyzeBtn.textContent = ready ? 'Analyze images' : 'Analyze images';
    }

    // ========= TOP BAR ACTIONS =========
    newBtn.addEventListener('click', ()=>{
      clearSession(); clearImages();
      addMessage('ai', `<b>New session.</b> Upload images and I'll provide educational observations.`);
    });
    clearChatBtn.addEventListener('click', ()=>{
      if(confirm('Clear the entire chat?')){ clearSession(); addMessage('ai','Chat cleared.');}
    });
    exportBtn.addEventListener('click', ()=>{
      const blob = new Blob([JSON.stringify({messages:state.messages},null,2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'medscope_chat.json'; a.click();
      URL.revokeObjectURL(url);
    });
    importInput.addEventListener('change', async (e)=>{
      const file = e.target.files?.[0]; if(!file) return;
      try{
        const text = await file.text();
        const data = JSON.parse(text);
        if(Array.isArray(data.messages)){ state.messages = data.messages; saveSession(); renderChat(); }
      }catch{ alert('Invalid file'); }
      e.target.value = '';
    });
    aboutBtn?.addEventListener('click', ()=>{
      alert('MedScope Vision (Pro demo)\n• Education only — not a diagnosis\n• Multi-image upload, local chat save, export/import\n• Powered by Google Gemini AI');
    });

    // ========= GEMINI API HELPERS =========
    function convertDataUrlToBase64(dataUrl) {
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      return dataUrl.split(',')[1];
    }

    function getMimeTypeFromDataUrl(dataUrl) {
      // Extract MIME type from data URL
      const match = dataUrl.match(/data:([^;]+);/);
      return match ? match[1] : 'image/jpeg';
    }

    // ========= ANALYZE WITH GEMINI =========
    analyzeBtn.addEventListener('click', async ()=>{
      if(state.busy || state.images.length===0) return;

      const key = (ENABLE_API_KEY_INPUT ? (window.__APIKEY||'') : GEMINI_API_KEY).trim();
      if(!key){ 
        alert('Gemini API key not set. Set GEMINI_API_KEY in the source, or enable the key input.'); 
        return; 
      }

      state.busy = true; 
      syncButtons();
      setProgress(5, true);

      // show user message with thumbnails
      const thumbs = state.images.map((_,i)=>`Image ${i+1}`).join(', ');
      addMessage('user', `<div><b>Images uploaded.</b> (${thumbs}) Please analyze for educational purposes only.</div>
        <div class="hint">Types: skin, dental, bone X-ray, MRI slice, etc.</div>`);

      try{
        const systemPrompt = `
You are a cautious medical imaging education assistant. When analyzing medical images:

• Describe visible features in clear, understandable terms
• List possible non-diagnostic observations and insights
• Always include a disclaimer that this is NOT a medical diagnosis
• Suggest appropriate next steps or when to seek professional care
• Use a confident, calm, clear tone and avoid definitive clinical claims

Remember: This is for educational purposes only and should never replace professional medical consultation.
        `.trim();

        // Prepare parts for Gemini API
        const parts = [
          {
            text: `Analyze these medical images for educational insights only. Identify visible features, explain in lay terms, and suggest when professional evaluation is appropriate. Offer generally safe observations if relevant. If multiple images show different views, compare them succinctly.

${systemPrompt}`
          }
        ];

        // Add each image to parts
        state.images.forEach(img => {
          parts.push({
            inline_data: {
              mime_type: getMimeTypeFromDataUrl(img.dataUrl),
              data: convertDataUrlToBase64(img.dataUrl)
            }
          });
        });

        setProgress(25);

        const requestBody = {
          contents: [{
            parts: parts
          }],
          generationConfig: {
            temperature: 0.25,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        setProgress(60);

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `API error (${response.status})`;
          
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error && errorJson.error.message) {
              errorMessage += `: ${errorJson.error.message}`;
            }
          } catch {
            errorMessage += `: ${errorText}`;
          }
          
          throw new Error(errorMessage);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
          throw new Error('No content generated. This may be due to safety filters or other restrictions.');
        }

        const text = data.candidates[0].content.parts[0].text?.trim() || "(No content generated)";
        addMessage('ai', escapeHtml(text).replace(/\n/g,'<br/>'));

      } catch(err){
        console.error('Gemini API Error:', err);
        addMessage('ai', `<b>Sorry, something went wrong.</b><div class="hint">${escapeHtml(err.message)}</div>`);
      } finally{
        setProgress(100);
        setTimeout(()=> setProgress(0,false), 600);
        state.busy = false; 
        syncButtons();
      }
    });

    function setProgress(pct, show=true){
      progress.style.display = show ? 'block' : 'none';
      progressBar.style.width = pct + '%';
    }

    // ========= UTIL =========
    function escapeHtml(s){
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
