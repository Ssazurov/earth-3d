// Тултип по наведению и оверлей обратного отсчёта запуска ракеты —
// чистый DOM/строки, без завязки на three.js сцену.

export const tooltip = document.createElement('div');
tooltip.style.cssText = 'position:fixed;pointer-events:none;display:none;z-index:20;'+
  'background:rgba(0,20,40,.9);color:#fff;font:13px sans-serif;padding:6px 10px;line-height:1.5;'+
  'border-radius:6px;border:1px solid rgba(255,255,255,.25);max-width:260px';
document.body.appendChild(tooltip);

export const countdownEl = document.createElement('div');
countdownEl.style.cssText = 'position:fixed;left:50%;top:38%;transform:translate(-50%,-50%);'+
  'display:none;z-index:25;pointer-events:none;font:900 96px sans-serif;color:#fff;'+
  'text-shadow:0 0 18px #ff7733,0 0 40px #ff2200,0 4px 8px rgba(0,0,0,.6);';
document.body.appendChild(countdownEl);
export function showCountdownText(txt){ countdownEl.textContent = txt; countdownEl.style.display = 'block'; }
export function hideCountdown(){ countdownEl.style.display = 'none'; }

const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();
const hitMeshes = [];
export function fmtDT(d){ return d.toLocaleString('ru-RU', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}); }
export function renderTooltipHTML(d){
  let html = `${d.flag||''} <b>${d.name}</b>` + (d.country ? ' — '+d.country : '');
  if(d.from || d.to) html += `<br><span style="opacity:.85">${d.from||'?'} → ${d.to||'?'}</span>`;
  if(d.cargo) html += `<br>Груз: ${d.cargo}`;
  if(d.purpose) html += `<br>Назначение: ${d.purpose}`;
  if(d.launchDate) html += `<br>Дата запуска: ${d.launchDate}`;
  if(d.eolDate) html += `<br>Срок активного существования до: ${d.eolDate}`;
  if(d.crew) html += `<br>Экипаж: ${d.crew}`;
  if(d.launchTime) html += `<br>Старт: ${fmtDT(d.launchTime)}`;
  if(d.landTime) html += `<br>Посадка: ${fmtDT(d.landTime)}`;
  if(d.constellation) html += `<br>Созвездие: ${d.constellation}`;
  if(d.alphaType) html += `<br>Класс: ${d.alphaType}`;
  if(d.alphaDistLy != null) html += `<br>Расстояние от Земли: ${d.alphaDistLy} св. лет`;
  if(d.alphaMag != null) html += `<br>Видимая величина: ${d.alphaMag}m`;
  if(d.diameterKm) html += `<br>Диаметр: ${d.diameterKm.toLocaleString('ru-RU')} км`;
  if(d.distSunMln) html += `<br>Расстояние от Солнца: ${d.distSunMln.toLocaleString('ru-RU')} млн км`;
  if(d.distEarthMinMln) html += `<br>Мин. расстояние от Земли: ${d.distEarthMinMln.toLocaleString('ru-RU')} млн км`;
  if(d.distEarthKm) html += `<br>Расстояние от Земли: ${d.distEarthKm.toLocaleString('ru-RU')} км`;
  if(d.moons != null) html += `<br>Спутников: ${d.moons}`;
  if(d.period) html += `<br>Период обращения: ${d.period}`;
  if(d.rotPeriod) html += `<br>Период вращения: ${d.rotPeriod}`;
  if(d.tempC) html += `<br>Температура поверхности: ${d.tempC}`;
  if(d.craft){
    const now = Date.now();
    const dep = new Date(now - d.craft.t*d.craft.dur*1000);
    const eta = new Date(now + (1-d.craft.t)*d.craft.dur*1000);
    html += `<br>Отправление: ${fmtDT(dep)}<br>Прибытие (план): ${fmtDT(eta)}`;
  }
  return html;
}
