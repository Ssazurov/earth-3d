// --- модалка настроек (по аналогии со справкой) ---
const KEY = 'earth3d_settings';
const DEFAULTS = {
  earthSpeed: 0.3,
  sunDist: 3,
  rocketPoolSize: 6,
  ascendMul: 1,
  parachuteMul: 1,
  planeSpeedMul: 1,
  seacraftSpeedMul: 1,
  satelliteSpeedMul: 1,
  visConstellations: true,
  visCapitals: true,
  visFlags: true,
  visCity: true,
  visPlant: false,
  visPlanets: true,
  visLabels: true,
  visOrbits: true,
  cityText: '#ffeded',
  cityTextOp: 100,
  cityBg: '#001428',
  cityBgOp: 100,
  capitalText: '#ffd76a',
  capitalTextOp: 100,
  capitalBg: '#001428',
  capitalBgOp: 20,
  cosmodromeText: '#ff8a5c',
  cosmodromeTextOp: 100,
  cosmodromeBg: '#001428',
  cosmodromeBgOp: 100
};

function hexToRgba(hex, opPct){
  const h = hex.replace('#','');
  const r = parseInt(h.substring(0,2),16), g = parseInt(h.substring(2,4),16), b = parseInt(h.substring(4,6),16);
  return `rgba(${r},${g},${b},${(opPct/100).toFixed(2)})`;
}

export function loadSettings(){
  try{ return {...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}')}; }
  catch{ return {...DEFAULTS}; }
}

function applyColors(S){
  const r = document.documentElement.style;
  r.setProperty('--city-text', hexToRgba(S.cityText, S.cityTextOp));
  r.setProperty('--city-bg', hexToRgba(S.cityBg, S.cityBgOp));
  r.setProperty('--capital-text', hexToRgba(S.capitalText, S.capitalTextOp));
  r.setProperty('--capital-bg', hexToRgba(S.capitalBg, S.capitalBgOp));
  r.setProperty('--cosmodrome-text', hexToRgba(S.cosmodromeText, S.cosmodromeTextOp));
  r.setProperty('--cosmodrome-bg', hexToRgba(S.cosmodromeBg, S.cosmodromeBgOp));
}

export function initSettings(){
  const S = loadSettings();
  applyColors(S);

  const style = document.createElement('style');
  style.textContent = `
  #setOverlay{position:fixed;inset:0;background:rgba(0,0,0,.15);z-index:1000;
    display:none;align-items:center;justify-content:center}
  #setOverlay.open{display:flex}
  #setBox{max-width:520px;max-height:85vh;overflow-y:auto;background:#0a1622;
    color:#dff;font:14px/1.5 sans-serif;padding:22px 26px;border-radius:8px;
    border:1px solid rgba(255,255,255,.15);position:relative}
  #setBox h2{margin:0 0 12px;color:#8fd;font-size:17px}
  #setBox h3{margin:16px 0 6px;color:#8fd;font-size:14px}
  #setBox label{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:6px 0}
  #setBox input[type=number]{width:80px;background:#112233;color:#dff;border:1px solid rgba(255,255,255,.2);border-radius:4px;padding:3px 6px}
  #setBox input[type=color]{width:44px;height:26px;border:none;background:none;cursor:pointer}
  .colwrap{display:flex;align-items:center;gap:6px}
  .colwrap input[type=range]{width:80px}
  #setBox .chk{justify-content:flex-start}
  #setClose{position:absolute;top:10px;right:14px;background:none;border:none;
    color:#dff;font-size:20px;cursor:pointer;line-height:1}
  #setClose:hover{color:#ffd76a}
  #setSave{width:100%;padding:8px;margin-top:16px;background:#134;color:#fff;
    border:1px solid #2a6;border-radius:4px;cursor:pointer;font:13px sans-serif}
  #setSave:hover{background:#1a5}
  #setHint{font-size:11px;opacity:.6;margin-top:8px}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'setOverlay';
  overlay.innerHTML = `
    <div id="setBox">
      <button id="setClose">×</button>
      <h2>Настройки</h2>

      <h3>Умолчания по запуску</h3>
      <label>Скорость вращения по умолчанию <input type="number" id="s_earthSpeed" min="0" max="3" step="0.02"></label>
      <label>Расстояние Земля–Солнце по умолчанию <input type="number" id="s_sunDist" min="1" max="15" step="0.1"></label>
      <label>Кол-во ракет в пуле <input type="number" id="s_rocketPoolSize" min="1" max="20" step="1"></label>

      <h3>Скорость ракет (множитель)</h3>
      <label>Взлёт <input type="number" id="s_ascendMul" min="0.1" max="10" step="0.1"></label>
      <label>Спуск на парашюте <input type="number" id="s_parachuteMul" min="0.1" max="10" step="0.1"></label>

      <h3>Скорость транспорта (множитель)</h3>
      <label>Самолёты <input type="number" id="s_planeSpeedMul" min="0.1" max="10" step="0.1"></label>
      <label>Корабли / танкеры <input type="number" id="s_seacraftSpeedMul" min="0.1" max="10" step="0.1"></label>
      <label>Спутники <input type="number" id="s_satelliteSpeedMul" min="0.1" max="10" step="0.1"></label>

      <h3>Показ — умолчания</h3>
      <label class="chk"><input type="checkbox" id="s_visConstellations"> Созвездия</label>
      <label class="chk"><input type="checkbox" id="s_visCapitals"> Столицы</label>
      <label class="chk"><input type="checkbox" id="s_visFlags"> Флаги</label>
      <label class="chk"><input type="checkbox" id="s_visCity"> Города</label>
      <label class="chk"><input type="checkbox" id="s_visPlant"> Электростанции</label>
      <label class="chk"><input type="checkbox" id="s_visPlanets"> Планеты</label>
      <label class="chk"><input type="checkbox" id="s_visLabels"> Названия объектов</label>
      <label class="chk"><input type="checkbox" id="s_visOrbits"> Траектории орбит</label>

      <h3>Цвета подписей</h3>
      <label>Текст городов <span class="colwrap"><input type="color" id="s_cityText"><input type="range" min="0" max="100" step="1" id="s_cityTextOp"></span></label>
      <label>Фон городов <span class="colwrap"><input type="color" id="s_cityBg"><input type="range" min="0" max="100" step="1" id="s_cityBgOp"></span></label>
      <label>Текст столиц <span class="colwrap"><input type="color" id="s_capitalText"><input type="range" min="0" max="100" step="1" id="s_capitalTextOp"></span></label>
      <label>Фон столиц <span class="colwrap"><input type="color" id="s_capitalBg"><input type="range" min="0" max="100" step="1" id="s_capitalBgOp"></span></label>
      <label>Текст космодромов <span class="colwrap"><input type="color" id="s_cosmodromeText"><input type="range" min="0" max="100" step="1" id="s_cosmodromeTextOp"></span></label>
      <label>Фон космодромов <span class="colwrap"><input type="color" id="s_cosmodromeBg"><input type="range" min="0" max="100" step="1" id="s_cosmodromeBgOp"></span></label>

      <button id="setSave">Сохранить и перезагрузить</button>
      <div id="setHint">Изменения (кроме цветов) применяются после перезагрузки страницы.</div>
    </div>
  `;
  document.body.appendChild(overlay);

  const fields = ['earthSpeed','sunDist','rocketPoolSize','ascendMul','parachuteMul',
    'planeSpeedMul','seacraftSpeedMul','satelliteSpeedMul',
    'visConstellations','visCapitals','visFlags','visCity','visPlant','visPlanets','visLabels','visOrbits',
    'cityText','cityTextOp','cityBg','cityBgOp',
    'capitalText','capitalTextOp','capitalBg','capitalBgOp',
    'cosmodromeText','cosmodromeTextOp','cosmodromeBg','cosmodromeBgOp'];
  function fillForm(){
    fields.forEach(f => {
      const el = overlay.querySelector('#s_'+f);
      if(!el) return;
      if(el.type === 'checkbox') el.checked = !!S[f]; else el.value = S[f];
    });
  }
  fillForm();

  overlay.querySelector('#setClose').addEventListener('click', () => { fillForm(); overlay.classList.remove('open'); });
  overlay.addEventListener('click', (e) => { if(e.target === overlay){ fillForm(); overlay.classList.remove('open'); } });
  addEventListener('keydown', (e) => { if(e.key === 'Escape' && overlay.classList.contains('open')){ fillForm(); overlay.classList.remove('open'); } });

  overlay.querySelector('#setSave').addEventListener('click', () => {
    const out = {};
    fields.forEach(f => {
      const el = overlay.querySelector('#s_'+f);
      out[f] = el.type === 'checkbox' ? el.checked : ((el.type === 'number' || el.type === 'range') ? parseFloat(el.value) : el.value);
    });
    localStorage.setItem(KEY, JSON.stringify(out));
    location.reload();
  });

  return { toggle(){ overlay.classList.toggle('open'); } };
}
