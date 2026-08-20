// --- панель управления (правая боковая) ---
export function initUI({ onSpeedChange, onToggle, onPauseToggle, onDistScaleChange, onZoomChange, onHelpToggle, onSettingsToggle, settings }){
  const S = settings || {};
  const es = S.earthSpeed ?? 0.3, sd = S.sunDist ?? 3;
  const style = document.createElement('style');
  style.textContent = `
  #panel{position:fixed;top:0;right:0;width:220px;height:100%;background:rgba(0,10,20,.75);
    color:#dff;font:13px sans-serif;padding:14px;padding-bottom:70px;box-sizing:border-box;z-index:30;
    border-left:1px solid rgba(255,255,255,.15);overflow-y:auto;transition:transform .25s}
  #panelFooter{position:fixed;bottom:0;right:0;width:220px;box-sizing:border-box;padding:10px 14px;
    background:rgba(0,10,20,.9);border-left:1px solid rgba(255,255,255,.15);
    border-top:1px solid rgba(255,255,255,.15);color:#dff;font:13px sans-serif;
    text-align:center;z-index:31;transition:transform .25s}
  #panelFooter.collapsed{transform:translateX(220px)}
  #panelFooter .footerTitle{font-weight:600}
  #panelFooter .footerVersion{margin-top:2px;color:#8fd}
  #panelFooter #helpLink,#panelFooter #settingsLink{display:block;margin-top:4px;font-size:11px;color:#9ab;
    text-decoration:none}
  #panelFooter #helpLink:hover,#panelFooter #settingsLink:hover{text-decoration:underline}
  #panel.collapsed{transform:translateX(220px)}
  #panelToggle{position:fixed;top:14px;right:220px;z-index:31;width:28px;height:36px;
    background:rgba(0,10,20,.75);color:#dff;border:1px solid rgba(255,255,255,.15);
    border-right:none;border-radius:6px 0 0 6px;cursor:pointer;font:14px sans-serif;
    transition:right .25s}
  #panelToggle.collapsed{right:0}
  #panel h3{margin:14px 0 8px;font-size:13px;color:#8fd}
  #panel label{display:flex;align-items:center;gap:6px;margin:6px 0;cursor:pointer}
  #panel input[type=range]{width:100%}
  #panel button{width:100%;padding:8px;margin-top:12px;background:#134;color:#fff;
    border:1px solid #2a6;border-radius:4px;cursor:pointer;font:13px sans-serif}
  #panel button:hover{background:#1a5}
  #panel #helpLink{display:block;text-align:center;margin-top:10px;color:#8fd;
    text-decoration:none;font:13px sans-serif}
  #panel #helpLink:hover{text-decoration:underline}
  #panel #focusedName{color:#ffd76a;font-weight:600}
  body.hide-labels .city-label{display:none !important}
  body.max-zoomout .city-label:not(.sun-label){display:none !important}
  `;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.id = 'panel';
  panel.innerHTML = `
    <h3>Объект: <span id="focusedName">Земля</span></h3>
    <label>Скорость вращения <span id="speedVal">${es.toFixed(2)}×</span></label>
    <input type="range" id="speedRange" min="0" max="3" step="0.02" value="${es}">
    <h3>Расстояние Земля–Солнце <span id="distVal">${sd.toFixed(1)}×</span></h3>
    <input type="range" id="distRange" min="1" max="15" step="0.1" value="${sd}">
    <h3>Масштаб <span id="zoomVal">–</span></h3>
    <input type="range" id="zoomRange" min="0" max="1" step="0.001" value="0">
    <h3>Показ</h3>
    <label><input type="checkbox" id="chkConst" ${S.visConstellations!==false?'checked':''}> Созвездия</label>
    <label><input type="checkbox" id="chkCapital" ${S.visCapitals!==false?'checked':''}> Столицы</label>
    <label><input type="checkbox" id="chkCity" ${S.visCity!==false?'checked':''}> Города</label>
    <label><input type="checkbox" id="chkPlant" ${S.visPlant?'checked':''}> Электростанции</label>
    <label><input type="checkbox" id="chkPlanets" ${S.visPlanets!==false?'checked':''}> Планеты</label>
    <label><input type="checkbox" id="chkLabels" ${S.visLabels!==false?'checked':''}> Названия объектов</label>
    <button id="btnPause">⏸ Остановить</button>
  `;
  document.body.appendChild(panel);

  const panelFooter = document.createElement('div');
  panelFooter.id = 'panelFooter';
  panelFooter.innerHTML = `
    <div class="footerTitle">Вдохновение космосом</div>
    <div class="footerVersion">Версия v0.1</div>
    <a id="helpLink" href="#">ℹ️ Справка</a>
    <a id="settingsLink" href="#">⚙️ Настройки</a>
  `;
  document.body.appendChild(panelFooter);

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'panelToggle';
  toggleBtn.textContent = '›';
  document.body.appendChild(toggleBtn);
  toggleBtn.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('collapsed');
    toggleBtn.classList.toggle('collapsed', collapsed);
    panelFooter.classList.toggle('collapsed', collapsed);
    toggleBtn.textContent = collapsed ? '‹' : '›';
  });

  const speedRange = panel.querySelector('#speedRange');
  const speedVal = panel.querySelector('#speedVal');
  speedRange.addEventListener('input', () => {
    const v = parseFloat(speedRange.value);
    speedVal.textContent = v.toFixed(2) + '×';
    onSpeedChange(v);
  });

  const distRange = panel.querySelector('#distRange');
  const distVal = panel.querySelector('#distVal');
  distRange.addEventListener('input', () => {
    const v = parseFloat(distRange.value);
    distVal.textContent = v.toFixed(1) + '×';
    onDistScaleChange(v);
  });

  const zoomRange = panel.querySelector('#zoomRange');
  const zoomVal = panel.querySelector('#zoomVal');
  let zoomSyncing = false;
  zoomRange.addEventListener('input', () => {
    if(zoomSyncing) return;
    const v = parseFloat(zoomRange.value);
    zoomVal.textContent = Math.round(v*100) + '%';
    onZoomChange(v);
  });

  const toggleMap = {chkConst:'constellations', chkCapital:'capitals', chkCity:'city', chkPlant:'plant', chkPlanets:'planets', chkLabels:'labels'};
  Object.entries(toggleMap).forEach(([id,key]) => {
    panel.querySelector('#'+id).addEventListener('change', e => onToggle(key, e.target.checked));
  });

  const btnPause = panel.querySelector('#btnPause');
  let paused = false;
  btnPause.addEventListener('click', () => {
    paused = !paused;
    btnPause.textContent = paused ? '▶ Запустить' : '⏸ Остановить';
    onPauseToggle(paused);
  });

  panelFooter.querySelector('#helpLink').addEventListener('click', (e) => {
    e.preventDefault();
    onHelpToggle && onHelpToggle();
  });
  panelFooter.querySelector('#settingsLink').addEventListener('click', (e) => {
    e.preventDefault();
    onSettingsToggle && onSettingsToggle();
  });

  return {
    setFocused(name, speed){
      panel.querySelector('#focusedName').textContent = name;
      speedRange.value = speed;
      speedVal.textContent = speed.toFixed(1) + '×';
    },
    setZoom(v){
      zoomSyncing = true;
      zoomRange.value = v;
      zoomVal.textContent = Math.round(v*100) + '%';
      zoomSyncing = false;
    }
  };
}
