(() => {
  'use strict';

  const chat = document.getElementById('chat');
  const orb = document.getElementById('orb');
  const statusEl = document.getElementById('status');
  const micBtn = document.getElementById('micBtn');
  const sendBtn = document.getElementById('sendBtn');
  const langBtn = document.getElementById('langBtn');
  const input = document.getElementById('textInput');

  // ---------- Language settings ----------
  const LANGS = {
    en: {
      code: 'en-IN', label: 'EN', placeholder: 'Type a message',
      status: { idle: 'Standing by', listening: 'Listening...', thinking: 'Thinking...', speaking: 'Speaking...' },
      welcome: 'Hello Sir. JARVIS online. Tap the microphone or type a message.'
    },
    mr: {
      code: 'mr-IN', label: 'मराठी', placeholder: 'संदेश लिहा',
      status: { idle: 'तयार', listening: 'ऐकत आहे...', thinking: 'विचार करत आहे...', speaking: 'बोलत आहे...' },
      welcome: 'नमस्कार सर. जार्विस सुरू आहे. मायक्रोफोन दाबा किंवा संदेश लिहा.'
    }
  };

  let lang = 'en';
  try { lang = localStorage.getItem('jarvis-lang') === 'mr' ? 'mr' : 'en'; } catch (e) {}
  const L = () => LANGS[lang];

  // ---------- Orb state ----------
  let state = 'idle';
  function setState(s) {
    state = s;
    orb.className = s;
    statusEl.textContent = L().status[s];
  }

  // ---------- Chat ----------
  function addMsg(who, text) {
    const d = document.createElement('div');
    d.className = 'msg ' + who;
    d.textContent = text;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
  }

  // ---------- Speech output ----------
  const synth = window.speechSynthesis;
  let warnedNoVoice = false;

  function pickVoice(code) {
    if (!synth) return null;
    const voices = synth.getVoices();
    const want = code.toLowerCase();
    const base = want.split('-')[0];
    return voices.find(v => v.lang.toLowerCase().replace('_', '-') === want) ||
           voices.find(v => v.lang.toLowerCase().replace('_', '-').startsWith(base)) || null;
  }

  function speak(text) {
    if (!synth) { setState('idle'); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = L().code;
    const v = pickVoice(L().code);
    if (v) u.voice = v;
    else if (lang === 'mr' && !warnedNoVoice) {
      warnedNoVoice = true;
      addMsg('jarvis', 'No Marathi voice found on this phone. Install it: Settings > System > Languages > Text-to-speech > Google Speech Services > Install voice data > Marathi.');
    }
    u.onstart = () => setState('speaking');
    u.onend = () => { if (state === 'speaking') setState('idle'); };
    u.onerror = () => { if (state === 'speaking') setState('idle'); };
    synth.speak(u);
  }

  // ---------- Simple built-in brain (no AI model yet) ----------
  function brain(raw) {
    const t = raw.toLowerCase().trim();
    const words = t.split(/[^a-z0-9\u0900-\u097F]+/).filter(Boolean);
    const has = (...keys) => keys.some(k => /^[a-z0-9]+$/.test(k) ? words.includes(k) : t.includes(k));
    const mr = lang === 'mr';
    const now = new Date();

    if (has('time', 'वेळ', 'वाजले', 'वाजलेत')) {
      const tm = now.toLocaleTimeString(L().code, { hour: '2-digit', minute: '2-digit' });
      return mr ? 'आत्ताची वेळ ' + tm + ' आहे.' : 'The time is ' + tm + '.';
    }
    if (has('date', 'today', 'day', 'तारीख', 'आज', 'वार')) {
      const dt = now.toLocaleDateString(L().code, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      return mr ? 'आज ' + dt + ' आहे.' : 'Today is ' + dt + '.';
    }
    if (has('who are you', 'your name', 'तू कोण', 'तुझे नाव', 'तुझं नाव', 'तुमचे नाव')) {
      return mr ? 'मी जार्विस, तुमचा वैयक्तिक सहाय्यक.' : 'I am JARVIS, your personal assistant.';
    }
    if (has('help', 'what can you do', 'मदत', 'काय करू शकतोस', 'काय करू शकतेस')) {
      return mr
        ? 'सध्या मी वेळ आणि तारीख सांगू शकतो आणि मराठी व इंग्रजीत बोलू शकतो. शोध आणि अ‍ॅप उघडणे पुढच्या टप्प्यात येईल.'
        : 'Right now I can tell the time and date and talk in English or Marathi. Web search and app commands come in later steps.';
    }
    if (has('thanks', 'thank', 'धन्यवाद', 'आभार')) {
      return mr ? 'स्वागत आहे सर.' : 'You are welcome, Sir.';
    }
    if (has('hello', 'hi', 'hey', 'jarvis', 'नमस्कार', 'नमस्ते', 'हॅलो', 'जार्विस')) {
      return mr ? 'नमस्कार सर. मी कशी मदत करू?' : 'Hello Sir. How can I help you?';
    }
    return mr
      ? 'मला हे अजून समजत नाही. माझा विचार करणारा भाग पुढच्या टप्प्यात जोडला जाईल. सध्या "वेळ" किंवा "तारीख" विचारा.'
      : 'I do not understand that yet. My thinking engine is added in a later step. For now, ask me the time or the date.';
  }

async function handleInput(text) {
    text = (text || '').trim();
    if (!text) return;

    addMsg('user', text);
    setState('thinking');

    try {
      const response = await fetch(
        'https://wild-queen-8906.adityadalvi0203.workers.dev',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message: text })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'AI request failed.');
      }

      const reply = data.reply || 'I could not create a reply.';
      addMsg('jarvis', reply);
      speak(reply);

    } catch (error) {
      addMsg('jarvis', 'AI connection failed. Please check your internet or Worker settings.');
      setState('idle');
    }
}

  // ---------- Speech input ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;
  let listening = false;

  function startListening() {
    if (!SR) {
      addMsg('jarvis', 'Voice input is not supported in this browser. Open JARVIS in Chrome on Android.');
      return;
    }
    if (synth) synth.cancel();
    rec = new SR();
    rec.lang = L().code;
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => { listening = true; micBtn.classList.add('on'); setState('listening'); };
    rec.onresult = (e) => handleInput(e.results[0][0].transcript);
    rec.onerror = (e) => {
      const msgs = {
        'not-allowed': 'Microphone is blocked. Tap the lock icon near the address bar, allow Microphone, then try again.',
        'service-not-allowed': 'Microphone is blocked. Allow Microphone for this site in Chrome settings.',
        'no-speech': 'I did not hear anything. Tap the microphone and speak.',
        'network': 'Voice input needs internet for now. You can still type.',
        'language-not-supported': 'This phone does not support voice input for the selected language.',
        'audio-capture': 'No microphone was found.'
      };
      if (e.error !== 'aborted') addMsg('jarvis', msgs[e.error] || 'Voice input error: ' + e.error);
    };
    rec.onend = () => {
      listening = false;
      micBtn.classList.remove('on');
      if (state === 'listening') setState('idle');
    };
    try { rec.start(); } catch (err) { /* already started */ }
  }

  micBtn.addEventListener('click', () => {
    if (listening && rec) rec.stop(); else startListening();
  });

  sendBtn.addEventListener('click', () => { handleInput(input.value); input.value = ''; });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { handleInput(input.value); input.value = ''; }
  });

  // ---------- Language toggle ----------
  function applyLang() {
    document.documentElement.lang = lang;
    langBtn.textContent = L().label;
    input.placeholder = L().placeholder;
    setState(state);
  }
  langBtn.addEventListener('click', () => {
    lang = lang === 'en' ? 'mr' : 'en';
    try { localStorage.setItem('jarvis-lang', lang); } catch (e) {}
    applyLang();
    addMsg('jarvis', lang === 'mr' ? 'भाषा: मराठी' : 'Language: English');
  });

  // ---------- Start ----------
  if (synth) synth.onvoiceschanged = () => {};
  applyLang();
  setState('idle');
  addMsg('jarvis', L().welcome);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
