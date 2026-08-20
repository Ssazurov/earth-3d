// --- модалка со справкой ---
export function initHelp(){
  const style = document.createElement('style');
  style.textContent = `
  #helpOverlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:40;
    display:none;align-items:center;justify-content:center}
  #helpOverlay.open{display:flex}
  #helpBox{max-width:520px;max-height:80vh;overflow-y:auto;background:#0a1622;
    color:#dff;font:14px/1.5 sans-serif;padding:22px 26px;border-radius:8px;
    border:1px solid rgba(255,255,255,.15);position:relative}
  #helpBox h2{margin:0 0 12px;color:#8fd;font-size:17px}
  #helpBox h3{margin:16px 0 6px;color:#8fd;font-size:14px}
  #helpBox ul{margin:0 0 8px;padding-left:20px}
  #helpClose{position:absolute;top:10px;right:14px;background:none;border:none;
    color:#dff;font-size:20px;cursor:pointer;line-height:1}
  #helpClose:hover{color:#ffd76a}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'helpOverlay';
  overlay.innerHTML = `
    <div id="helpBox">
      <button id="helpClose">×</button>
      <h2>Справка</h2>
      <h3>Управление</h3>
      <ul>
        <li>Левая кнопка мыши + перетаскивание — вращение камеры</li>
        <li>Колесо мыши — зум</li>
        <li>Клик по объекту — выбрать цель (Земля, планеты, МКС, космодромы)</li>
        <li>Клик по космодрому — запуск ракеты</li>
      </ul>
      <h3>Панель справа</h3>
      <ul>
        <li>Скорость вращения — множитель скорости выбранного объекта</li>
        <li>Расстояние Земля–Солнце — масштаб орбиты</li>
        <li>Масштаб — уровень приближения камеры</li>
        <li>Показ — включение/выключение слоёв (созвездия, города, электростанции, планеты, подписи)</li>
        <li>⏸ Остановить — пауза анимации</li>
      </ul>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#helpClose').addEventListener('click', () => overlay.classList.remove('open'));
  overlay.addEventListener('click', (e) => { if(e.target === overlay) overlay.classList.remove('open'); });
  addEventListener('keydown', (e) => { if(e.key === 'Escape') overlay.classList.remove('open'); });

  return {
    toggle(){ overlay.classList.toggle('open'); }
  };
}
