// js/call.js — видео/аудио звонок по ссылке (ADR 0006, issue #25).
// Самодостаточный модуль: initCall() создаёт свой DOM/стили и не зависит
// от сцены/панели three.js — при необходимости легко выносится в отдельную
// страницу/iframe (см. ADR 0006 "Уточнения").
// Зависимость: глобальный window.Peer (PeerJS UMD, подключается в index.html).

const PARAM = 'call';
const VIDEO_SIZE = { width: 130, height: 98 };
const VIDEO_GAP = 6;
const RECONNECT_DELAYS = [1000, 3000, 5000, 10000];

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
    border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:10px;width:280px;
    max-width:calc(100vw - 28px);min-width:190px;max-height:calc(100vh - 28px);
    overflow:hidden;box-sizing:border-box;position:relative}
  #callPanel.open{display:flex}
  #callHeader{display:flex;align-items:center;justify-content:space-between;gap:8px;
    cursor:move;user-select:none;touch-action:none}
  #callHeaderTitle{font-weight:600}
  #callHeaderActions{display:flex;gap:4px;margin-left:auto;padding-right:18px}
  #callHeader button{width:26px;height:26px;padding:0;line-height:1;font-size:16px}
  #callResizeHandle{position:absolute;top:0;right:0;width:22px;height:22px;z-index:2;
    cursor:nesw-resize;touch-action:none}
  #callResizeHandle::after{content:'';position:absolute;top:5px;right:1px;width:8px;height:8px;
    border-top:2px solid #8fd;border-right:2px solid #8fd;transform:rotate(-45deg)}
  #callStatus{color:#8fd;font-size:12px}
  #callLinkRow{display:flex;gap:6px}
  #callLinkRow input{flex:1;min-width:0;background:#012;color:#dff;
    border:1px solid rgba(255,255,255,.2);border-radius:4px;padding:4px 6px;font:11px monospace}
  #callVideos{display:grid;grid-template-columns:repeat(auto-fit,minmax(${VIDEO_SIZE.width}px,1fr));
    gap:${VIDEO_GAP}px;min-width:0}
  #callVideos video{width:100%;aspect-ratio:${VIDEO_SIZE.width}/${VIDEO_SIZE.height};height:auto;min-width:0;
    object-fit:cover;border-radius:6px;
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
       <div id="callHeader">
         <span id="callHeaderTitle">Видеосвязь</span>
         <div id="callHeaderActions">
           <button id="callResetBtn" type="button" title="Вернуть окно на место" aria-label="Вернуть окно на место">⌂</button>
         </div>
       </div>
       <div id="callResizeHandle" title="Изменить размер окна" aria-label="Изменить размер окна"></div>
       <div id="callStatus"></div>
       <div id="callLinkRow" style="display:none">
         <input id="callLinkInput" readonly>
         <button id="callCopyBtn" type="button" title="Копировать ссылку" aria-label="Копировать ссылку">⧉</button>
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
  const header = root.querySelector('#callHeader');
  const resetBtn = root.querySelector('#callResetBtn');
  const resizeHandle = root.querySelector('#callResizeHandle');
  const statusEl = root.querySelector('#callStatus');
  const linkRow = root.querySelector('#callLinkRow');
  const linkInput = root.querySelector('#callLinkInput');
  const copyBtn = root.querySelector('#callCopyBtn');
  const videosEl = root.querySelector('#callVideos');
  const micBtn = root.querySelector('#callMicBtn');
  const camBtn = root.querySelector('#callCamBtn');
  const endBtn = root.querySelector('#callEndBtn');

  function videoMinimumSize(){
    const count = Math.max(videosEl.children.length, 1);
    const availableWidth = Math.max(VIDEO_SIZE.width, panel.clientWidth - 20);
    const columns = Math.max(1, Math.floor((availableWidth + VIDEO_GAP) / (VIDEO_SIZE.width + VIDEO_GAP)));
    const rows = Math.ceil(count / columns);
    const contentHeight = rows * VIDEO_SIZE.height + Math.max(0, rows - 1) * VIDEO_GAP;
    const fixedHeight = panel.offsetHeight - videosEl.offsetHeight;
    panel.style.minWidth = `${VIDEO_SIZE.width + 20}px`;
    panel.style.minHeight = `${contentHeight + Math.max(0, fixedHeight)}px`;
  }
  function updateVideoLayout(){
    videoMinimumSize();
    keepInViewport();
  }

  const defaultPosition = { left: 14, bottom: 14 };
  function resetPosition(){
    root.style.left = `${defaultPosition.left}px`;
    root.style.right = 'auto';
    root.style.top = 'auto';
    root.style.bottom = `${defaultPosition.bottom}px`;
    panel.style.width = '280px';
    panel.style.height = '';
    panel.style.minWidth = `${VIDEO_SIZE.width + 20}px`;
    panel.style.minHeight = '';
    updateVideoLayout();
  }
  function keepInViewport(){
    const rect = root.getBoundingClientRect();
    const margin = 8;
    const left = Math.max(margin, Math.min(rect.left, innerWidth - rect.width - margin));
    const top = Math.max(margin, Math.min(rect.top, innerHeight - rect.height - margin));
    root.style.left = `${left}px`;
    root.style.top = `${top}px`;
    root.style.right = 'auto';
    root.style.bottom = 'auto';
  }
  function dragFrom(event){
    if(event.button !== undefined && event.button !== 0) return;
    if(event.target.closest('button, input')) return;
    event.preventDefault();
    header.setPointerCapture?.(event.pointerId);
    const rect = root.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    root.style.left = `${rect.left}px`;
    root.style.top = `${rect.top}px`;
    root.style.right = 'auto';
    root.style.bottom = 'auto';
    const move = e => {
      root.style.left = `${e.clientX - offsetX}px`;
      root.style.top = `${e.clientY - offsetY}px`;
      keepInViewport();
    };
    const stop = () => {
      header.releasePointerCapture?.(event.pointerId);
      header.removeEventListener('pointermove', move);
      header.removeEventListener('pointerup', stop);
      header.removeEventListener('pointercancel', stop);
    };
    header.addEventListener('pointermove', move);
    header.addEventListener('pointerup', stop, { once: true });
    header.addEventListener('pointercancel', stop, { once: true });
  }

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
  let reconnectTimer = null;
  let reconnectAttempt = 0;
  let closing = false;

  function setStatus(text){ statusEl.textContent = text; }
  function mediaErrorMessage(error){
    if(error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') return 'Доступ к камере/микрофону запрещён. Разрешите доступ в настройках браузера.';
    if(error?.name === 'NotFoundError') return 'Камера или микрофон не найдены.';
    if(error?.name === 'NotReadableError') return 'Камера или микрофон заняты другим приложением.';
    return 'Не удалось получить доступ к камере/микрофону.';
  }
  function clearReconnect(){
    if(reconnectTimer){ clearTimeout(reconnectTimer); reconnectTimer = null; }
  }

  function addVideo(stream, cls){
    const v = document.createElement('video');
    v.autoplay = true;
    v.playsInline = true;
    const isLocal = cls === 'local';
    v.muted = true; // Временно mute для обхода autoplay policy
    v.className = cls;
    v.srcObject = stream;
    videosEl.appendChild(v);
    
    // Unmute remote только когда видео действительно начало воспроизводиться
    if(!isLocal){
      v.onplaying = () => {
        v.muted = false;
        console.log('[Call] Remote видео unmuted после onplaying');
      };
    }
    
    v.onloadedmetadata = () => {
      console.log('[Call] Метаданные загружены:', cls, v.videoWidth, 'x', v.videoHeight);
      v.play().catch(e => console.warn('[Call] Ошибка play после loadedmetadata:', e));
    };
    
    // Немедленный запуск для remote (loadedmetadata может не сработать)
    v.play().catch(e => console.warn('[Call] Ошибка немедленного play:', e));
    
    // Дублирующий запуск для надёжности
    setTimeout(() => {
      if(v.paused) v.play().catch(e => console.warn('[Call] Ошибка отложенного play:', e));
    }, 100);
    
    updateVideoLayout();
    return v;
  }

  function clearVideos(){
    videosEl.innerHTML = '';
    panel.style.minHeight = '';
  }

  async function getLocalStream(){
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    console.log('[Call] Локальный поток получен:', localStream.id, 'треки:', localStream.getTracks().map(t => `${t.kind}:${t.enabled}`));
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
    clearReconnect();
    reconnectAttempt = 0;
    activeCall = call;
    setStatus('Соединение устанавливается…');
    console.log('[Call] Медиа-соединение открыто:', call.peer);
    
    const pc = call.peerConnection;
    if(pc){
      pc.oniceconnectionstatechange = () => {
        console.log('[Call] ICE состояние:', pc.iceConnectionState);
        if(pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed'){
          setStatus('Медиа-канал установлен');
        } else if(pc.iceConnectionState === 'failed'){
          setStatus('⚠️ Не удалось установить прямое соединение. Возможна проблема с NAT/firewall.');
          console.warn('[Call] ICE failed. Требуется TURN-сервер для обхода NAT.');
        } else if(pc.iceConnectionState === 'disconnected'){
          setStatus('Медиа-канал разорван');
        }
      };
    }
    
    let remoteVideoAdded = false;
    call.on('stream', remoteStream => {
      if(remoteVideoAdded) return;
      console.log('[Call] Получен удалённый поток:', remoteStream.id, 'треки:', remoteStream.getTracks().map(t => `${t.kind}:${t.enabled}`));
      const videoTracks = remoteStream.getVideoTracks();
      const audioTracks = remoteStream.getAudioTracks();
      if(videoTracks.length === 0 && audioTracks.length === 0){
        setStatus('⚠️ Получен пустой медиа-поток от собеседника');
        return;
      }
      remoteVideoAdded = true;
      setStatus(`Собеседник подключён (${videoTracks.length ? 'видео' : ''}${videoTracks.length && audioTracks.length ? '+' : ''}${audioTracks.length ? 'аудио' : ''})`);
      const remoteVideo = addVideo(remoteStream, 'remote');
      console.log('[Call] Remote video element добавлен:', remoteVideo, 'srcObject:', remoteVideo.srcObject?.id, 'paused:', remoteVideo.paused, 'muted:', remoteVideo.muted);
    });
    call.on('close', () => {
      if(closing || activeCall !== call) return;
      console.log('[Call] Медиа-соединение закрыто');
      activeCall = null;
      clearVideos();
      scheduleReconnect('Соединение прервано');
    });
    call.on('error', err => {
      if(closing || activeCall !== call) return;
      console.error('[Call] Ошибка медиа-соединения:', err);
      setStatus('Ошибка соединения: ' + (err.message || 'повторная попытка…'));
      scheduleReconnect('Соединение прервано');
    });
  }

  function scheduleReconnect(message){
    if(closing || !localStream || reconnectTimer) return;
    const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)];
    reconnectAttempt++;
    setStatus(`${message}. Повторное подключение через ${Math.ceil(delay / 1000)} с…`);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if(closing || !localStream) return;
      if(joinId && peer?.open) attachCallHandlers(peer.call(joinId, localStream));
      else if(!joinId) setStatus('Ожидание подключения собеседника…');
    }, delay);
  }

  function handlePeerDisconnected(){
    if(closing) return;
    setStatus('Связь с сервером потеряна. Переподключение…');
    clearReconnect();
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      try{ peer?.reconnect(); }catch(e){ setStatus('Не удалось переподключиться.'); }
    }, 1500);
  }

  async function startAsHost(){
    openPanel();
    setStatus('Инициализация…');
    try{
      await getLocalStream();
      peer = new Peer({
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
            { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
          ]
        }
      });
      peer.on('open', id => {
        console.log('[Call] Peer ID хоста:', id);
        const link = new URL(location.href);
        link.searchParams.set(PARAM, id);
        linkInput.value = link.toString();
        linkRow.style.display = 'flex';
        setStatus('Ссылка готова — отправьте её собеседнику');
      });
      peer.on('call', call => {
        console.log('[Call] Входящий звонок от:', call.peer);
        call.answer(localStream);
        attachCallHandlers(call);
      });
      peer.on('disconnected', handlePeerDisconnected);
      peer.on('error', err => { 
        console.error('[Call] Ошибка Peer хоста:', err);
        if(!closing) setStatus('Ошибка: ' + (err.message || 'повторная попытка…')); 
      });
    }catch(e){
      console.error('[Call] Ошибка получения медиа хоста:', e);
      setStatus(mediaErrorMessage(e));
    }
  }

  async function startAsGuest(){
    openPanel();
    setStatus('Подключение…');
    try{
      await getLocalStream();
      peer = new Peer({
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
            { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
          ]
        }
      });
      peer.on('open', id => {
        console.log('[Call] Peer ID гостя:', id, 'звоню на:', joinId);
        const call = peer.call(joinId, localStream);
        attachCallHandlers(call);
      });
      peer.on('disconnected', handlePeerDisconnected);
      peer.on('error', err => { 
        console.error('[Call] Ошибка Peer гостя:', err);
        if(!closing) setStatus('Ошибка: ' + (err.message || 'повторная попытка…')); 
      });
    }catch(e){
      console.error('[Call] Ошибка получения медиа гостя:', e);
      setStatus(mediaErrorMessage(e));
    }
  }

  function endCall(){
    closing = true;
    clearReconnect();
    if(activeCall){ activeCall.close(); activeCall = null; }
    if(peer){ peer.destroy(); peer = null; }
    if(localStream){ localStream.getTracks().forEach(t => t.stop()); localStream = null; }
    clearVideos();
    linkRow.style.display = 'none';
    closePanel();
    setStatus('');
  }

  startBtn.addEventListener('click', () => {
    closing = false;
    reconnectAttempt = 0;
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
  header.addEventListener('pointerdown', dragFrom);
  resizeHandle.addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopPropagation();
    resizeHandle.setPointerCapture?.(event.pointerId);
    const rect = root.getBoundingClientRect();
    const start = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, width: panel.offsetWidth, height: panel.offsetHeight };
    const resize = e => {
      panel.style.width = `${Math.max(panelMinWidth(), start.width + e.clientX - start.x)}px`;
      panel.style.height = `${Math.max(panelMinHeight(), start.height + start.y - e.clientY)}px`;
      root.style.left = `${start.left}px`;
      root.style.top = `${Math.max(8, Math.min(start.top + e.clientY - start.y, innerHeight - panel.offsetHeight - 8))}px`;
      root.style.right = 'auto';
      root.style.bottom = 'auto';
      keepInViewport();
    };
    const stop = () => {
      resizeHandle.releasePointerCapture?.(event.pointerId);
      resizeHandle.removeEventListener('pointermove', resize);
      resizeHandle.removeEventListener('pointerup', stop);
      resizeHandle.removeEventListener('pointercancel', stop);
    };
    resizeHandle.addEventListener('pointermove', resize);
    resizeHandle.addEventListener('pointerup', stop, { once: true });
    resizeHandle.addEventListener('pointercancel', stop, { once: true });
  });
  resetBtn.addEventListener('click', resetPosition);
  addEventListener('pagehide', endCall, { once: true });
  const panelMinWidth = () => VIDEO_SIZE.width + 20;
  const panelMinHeight = () => {
    videoMinimumSize();
    return parseFloat(getComputedStyle(panel).minHeight) || 150;
  };
  new ResizeObserver(updateVideoLayout).observe(panel);
}
