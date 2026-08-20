// --- панель "Описание" (левая боковая, свёрнута по умолчанию) ---
export function initDescription({ onHelpClick } = {}){
  const style = document.createElement('style');
  style.textContent = `
  #descPanel{position:fixed;top:0;left:0;width:300px;height:100%;background:rgba(0,10,20,.82);
    color:#dff;font:13px/1.5 sans-serif;padding:16px 18px;box-sizing:border-box;z-index:30;
    border-right:1px solid rgba(255,255,255,.15);overflow-y:auto;transition:transform .25s;
    transform:translateX(-100%)}
  #descPanel.open{transform:translateX(0)}
  #descTab{position:fixed;top:50%;left:0;transform:translateY(-50%);z-index:31;
    background:rgba(0,10,20,.82);color:#8fd;border:1px solid rgba(255,255,255,.15);
    border-left:none;border-radius:0 6px 6px 0;cursor:pointer;font:13px sans-serif;
    padding:14px 6px;writing-mode:vertical-rl;transform:translateY(-50%) rotate(180deg);
    display:flex;align-items:center;gap:6px;transition:left .25s}
  #descTab.open{left:300px}
  #descPanel h2{margin:0 0 10px;font-size:15px;color:#8fd}
  #descPanel h3{margin:16px 0 6px;font-size:13px;color:#8fd}
  #descPanel p{margin:0 0 8px}
  #descPanel ul{margin:0 0 8px;padding-left:18px}
  #descPanel li{margin:4px 0}
  #descPanel b{color:#ffd76a}
  #descPanel #descHelpLink{display:block;text-align:center;margin-top:14px;padding:8px;
    background:#134;color:#fff;border:1px solid #2a6;border-radius:4px;cursor:pointer;
    text-decoration:none;font:13px sans-serif}
  #descPanel #descHelpLink:hover{background:#1a5}
  `;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.id = 'descPanel';
  panel.innerHTML = `
    <p>Вдохновляемым космической эстетикой посвящается.</p>
    <h2>О проекте</h2>
    <p>Проект "Вдохновение космосом" - это интерактивная 3D-модель Земли и Солнечной системы: живая планета,
    орбитальная станция, спутники, транспорт и звёздное небо в реальном времени.</p>

    <h3>Типы объектов</h3>
    <ul>
      <li><b>Земля, Луна, Солнце и планеты</b> — вращаются и движутся по орбитам</li>
      <li><b>МКС и спутники</b> — летают по околоземным орбитам</li>
      <li><b>Города и столицы</b> (мировые и российские), <b>достопримечательности</b></li>
      <li><b>Электростанции</b> и <b>космодромы</b></li>
      <li><b>Авиарейсы</b> между городами и <b>морские суда</b> (контейнеровозы, танкеры) по торговым маршрутам</li>
      <li><b>Созвездия и звёзды</b> на небесной сфере</li>
    </ul>

    <h3>Поведение</h3>
    <p>Все подвижные объекты анимированы: планеты обращаются вокруг Солнца, самолёты и суда
    идут по маршрутам, МКС и спутники — по орбитам. Общая скорость этого движения
    регулируется ползунком «Скорость вращения» на правой панели.</p>

    <h3>Свойства объектов</h3>
    <p>У большинства объектов есть свойства, видимые при наведении курсора: название, страна,
    флаг, а для транспорта — маршрут, груз или дата отправления/прибытия.</p>

    <h3>Интерактивность</h3>
    <ul>
      <li>Клик по объекту (или его подписи) делает его центром камеры — можно приблизить и вращать вокруг него</li>
      <li>Наведение курсора показывает всплывающую подсказку с деталями объекта</li>
      <li>Клик по маркеру космодрома запускает ракету</li>
    </ul>

    <h3>Сценарий: космодром и ракета</h3>
    <p>Клик по космодрому запускает полный цикл: обратный отсчёт и старт, подъём с работающим
    двигателем, перелёт и стыковка с МКС (космонавт выходит наружу), отстыковка, вход в
    атмосферу с торможением, спуск на парашюте и посадка капсулы. [в отладке]</p>

    <h3>Сценарий: МКС</h3>
    <p>Клик по МКС командует космонавту, что требуется проведение работ вне корабля.</p>
    <a id="descHelpLink">⌨ Управление мышью и клавишами</a>
  `;
  document.body.appendChild(panel);

  const tab = document.createElement('button');
  tab.id = 'descTab';
  tab.innerHTML = 'Описание <span id="descArrow">›</span>';
  document.body.appendChild(tab);

  tab.addEventListener('click', () => {
    const open = panel.classList.toggle('open');
    tab.classList.toggle('open', open);
    tab.querySelector('#descArrow').textContent = open ? '‹' : '›';
  });

  panel.querySelector('#descHelpLink').addEventListener('click', () => {
    onHelpClick && onHelpClick();
  });
}
