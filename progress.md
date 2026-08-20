# Progress — earth-3d refactor

## ✅ Рефакторинг завершён

### Все модули готовы:
- ✅ geo.js — latLonToVec3, orbitPoint
- ✅ state.js — SETTINGS, raycaster, VIS, speed, pause, distScale, autoRotate
- ✅ flags.js — флаги стран для маркеров
- ✅ tooltip.js — тултип для hover
- ✅ scene-core.js — scene, camera, renderer, controls, lights
- ✅ earth.js — earthMesh, rotation
- ✅ markers.js — города/столицы/заводы/созвездия/космодромы
- ✅ satellites.js — спутники вокруг Земли
- ✅ planes.js — самолёты
- ✅ seacraft.js — корабли
- ✅ sky.js — звёзды, млечный путь, туманности
- ✅ zoom.js — плавный зум
- ✅ solar-system.js — Солнце + планеты
- ✅ moon.js — Луна + орбита
- ✅ iss.js — МКС + космонавт
- ✅ rockets.js — ракеты с космодромов
- ✅ selection.js — selectTarget(), клики, init(ui)
- ✅ **main.js переписан с нуля** — импорты всех модулей, animate(), initUI wiring

### Готово:
- ✅ Удалён js/_extract/
- ✅ Удалены extract.py, find_markers.py
- ✅ Создан ARCHITECTURE.md
- ✅ Старый main.js сохранён как main.old.js
- ✅ Dev-сервер работает на http://localhost:8080/index.html

### Следующий шаг:
**Открыть http://localhost:8080/index.html в браузере и проверить работу**

### Исправление загрузки
- ✅ Исправлена ошибка `Identifier 'issLabel' has already been declared` в `js/markers.js`: удалено повторное локальное объявление, сохранен экспортируемый binding для `setIssLabel()`.

### Исправление бага #15
- ✅ Баг: при выборе планеты/объекта слайдер скорости вращал весь мир вокруг объекта
- ✅ Исправлено: слайдер теперь управляет глобальной скоростью симуляции
- ✅ Один слайдер ускоряет ВСЁ: вращение Земли, орбиты планет, транспорт, МКС
- ✅ Камера следует за выбранным объектом синхронно, мир не крутится

### Исправление загрузки
- ✅ Восстановлен экспорт `speedMul()` из `js/state.js`; Луна и МКС используют глобальную скорость симуляции без ошибки ES-модуля.
