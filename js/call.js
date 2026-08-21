// js/call.js — видео/аудио звонок по ссылке (ADR 0006, issue #25).
// Самодостаточный модуль: initCall() создаёт свой DOM/стили и не зависит
// от сцены/панели three.js — при необходимости легко выносится в отдельную
// страницу/iframe (см. ADR 0006 "Уточнения").
// Зависимость: глобальный window.Peer (PeerJS UMD, подключается в index.html).

const PARAM = 'call';

function injectStyles(){
  if(document.getElementById('callStyle')) return;
  const s = document.createElement('style');
  s.id = 'callStyle';
  s.textContent = `
  #callRoot{position:fixed;left:14px;bottom:14px;z-index:40;font:13px sans-serif;color:#dff}
  #callStartBtn{padding:8px 14px;background:#134;color:#fff;border:1px solid #2a6;
    border-radius:6px;cursor:pointer;font:13px sans-serif}
  #callStartBtn:hover{background:#1a5}
  #callStartBtn:disabled{opacity:.5;cursor:default}
  #callPanel{display:none;flex-direction:column;gap:8px;background:rgba(0,10,20,.85);
    border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:10px;max-width:280px}
  #callPanel.open{display:flex}
  #callStatus{color:#8fd;font-size:12px}
  #callLinkRow{display:flex;gap:6px}
  #callLinkRow input{flex:1;min-width:0;background:#012;color:#dff;
    border:1px solid rgba(255,255,255,.2);border-radius:4px;padding:4px 6px;font:11px monospace}
  #callVideos{display:flex;gap:6px;flex-wrap:wrap}
  #callVideos video{width:130px;height:98px;object-fit:cover;border-radius:6px;
    border:1px solid rgba(255,255,255,.25);background:#000}
  #callActions{display:flex;gap:6px;flex-wrap:wrap}
  #callPanel button{padding:6px 8px;background:#134;color:#fff;border:1px solid #2a6;
    border-radius:4px;cursor:pointer;font:12px sans-serif}
  #callPanel button:hover{background:#1a5}
  #callPanel button.danger{background:#411;border-color:#a33}
  #callPanel button.danger:hover{background:#622}
  #callPanel button.muted{opacity:.5}
  `;
  document.head.appendChild(s);
}

function buildDom(){
  const root = document.createElement('div');
  root.id = 'callRoot';
  root.innerHTML = `
    <button id="callStartBtn"></button>
    <div id="callPanel">
      <div id="callStatus"></div>
      <div id="callLinkRow" style="display:none">
        <input id="callLinkInput" readonly>
        <button id="callCopyBtn">Копировать</button>
      </div>
      <div id="callVideos"></div>
      <div id="callActions">
        <button id="callMicBtn">🎤 Микрофон</button>
        <button id="callCamBtn">📷 Камера</button>
        <button id="callEndBtn" class="danger">Завершить</button>
      </div>
    </div>
  `;
  document.body.appendChild(root);
  return root;
}
export function initCall(){
  injectStyles();
  const root = buildDom();
  const startBtn = root.querySelector('#callStartBtn');
  const panel = root.querySelector('#callPanel');
  const statusEl = root.querySelector('#callStatus');
  const linkRow = root.querySelector('#callLinkRow');
  const linkInput = root.querySelector('#callLinkInput');
  const copyBtn = root.querySelector('#callCopyBtn');
  const videosEl = root.querySelector('#callVideos');
  const micBtn = root.querySelector('#callMicBtn');
  const camBtn = root.querySelector('#callCamBtn');
  const endBtn = root.querySelector('#callEndBtn');

  const url = new URL(location.href);
  const joinId = url.searchParams.get(PARAM);
  startBtn.textContent = joinId ? '📞 Присоединиться к звонку' : '📞 Позвонить';

  if(typeof Peer === 'undefined'){
    startBtn.disabled = true;
    startBtn.title = 'Библиотека PeerJS не загрузилась';
    return;
  }

  let peer = null;
  let localStream = null;
  let activeCall = null;
  let micOn = true, camOn = true;

  function setStatus(text){ statusEl.textContent = text; }

  function addVideo(stream, cls){
    const v = document.createElement('video');
    v.autoplay = true;
    v.playsInline = true;
    if(cls === 'local') v.muted = true;
    v.className = cls;
    v.srcObject = stream;
    videosEl.appendChild(v);
    return v;
  }

  function clearVideos(){ videosEl.innerHTML = ''; }

  async function getLocalStream(){
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    addVideo(localStream, 'local');
    return localStream;
  }

  function openPanel(){
    startBtn.style.display = 'none';
    panel.classList.add('open');
  }

  function closePanel(){
    panel.classList.remove('open');
    startBtn.style.display = '';
  }

  function attachCallHandlers(call){
    activeCall = call;
    call.on('stream', remoteStream => {
      setStatus('Собеседник подключён');
      addVideo(remoteStream, 'remote');
    });
    call.on('close', endCall);
    call.on('error', err => setStatus('Ошибка звонка: ' + err.message));
  }

  async function startAsHost(){
    openPanel();
    setStatus('Инициализация…');
    try{
      await getLocalStream();
      peer = new Peer();
      peer.on('open', id => {
        const link = new URL(location.href);
        link.searchParams.set(PARAM, id);
        linkInput.value = link.toString();
        linkRow.style.display = 'flex';
        setStatus('Ссылка готова — отправьте её собеседнику');
      });
      peer.on('call', call => {
        call.answer(localStream);
        attachCallHandlers(call);
      });
      peer.on('error', err => setStatus('Ошибка: ' + err.message));
    }catch(e){
      setStatus('Нет доступа к камере/микрофону');
    }
  }

  async function startAsGuest(){
    openPanel();
    setStatus('Подключение…');
    try{
      await getLocalStream();
      peer = new Peer();
      peer.on('open', () => {
        const call = peer.call(joinId, localStream);
        attachCallHandlers(call);
      });
      peer.on('error', err => setStatus('Ошибка: ' + err.message));
    }catch(e){
      setStatus('Нет доступа к камере/микрофону');
    }
  }

  function endCall(){
    if(activeCall){ activeCall.close(); activeCall = null; }
    if(peer){ peer.destroy(); peer = null; }
    if(localStream){ localStream.getTracks().forEach(t => t.stop()); localStream = null; }
    clearVideos();
    linkRow.style.display = 'none';
    closePanel();
    setStatus('');
  }

  startBtn.addEventListener('click', () => {
    if(joinId) startAsGuest(); else startAsHost();
  });
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(linkInput.value).then(() => {
      copyBtn.textContent = 'Скопировано';
      setTimeout(() => copyBtn.textContent = 'Копировать', 1500);
    });
  });
  micBtn.addEventListener('click', () => {
    if(!localStream) return;
    micOn = !micOn;
    localStream.getAudioTracks().forEach(t => t.enabled = micOn);
    micBtn.classList.toggle('muted', !micOn);
  });
  camBtn.addEventListener('click', () => {
    if(!localStream) return;
    camOn = !camOn;
    localStream.getVideoTracks().forEach(t => t.enabled = camOn);
    camBtn.classList.toggle('muted', !camOn);
  });
  endBtn.addEventListener('click', endCall);
}
