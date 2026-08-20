# Архитектура проекта earth-3d

## Структура модулей

### Ядро сцены
- **scene-core.js** — THREE.Scene, camera, renderer, labelRenderer, controls, освещение
- **state.js** — общее runtime-состояние (SETTINGS, raycaster, VIS, objectSpeed, paused, distScale, autoRotate)

### Геометрия и данные
- **geo.js** — latLonToVec3(), orbitPoint()
- **data.js** — массивы CITIES, LANDMARKS, PLANTS, COSMODROMES, SATELLITES, PLANETS, CONSTELLATIONS
- **flags.js** — загрузка флагов стран для маркеров

### Земля
- **earth.js** — earthMesh, clouds, текстуры, updateEarthDetail()
- **markers.js** — города, столицы, заводы, созвездия, космодромы
- **satellites.js** — спутники вокруг Земли
- **planes.js** — самолёты
- **seacraft.js** — корабли

### Космос
- **sky.js** — звёзды, млечный путь, туманности
- **solar-system.js** — Солнце + планеты
- **moon.js** — Луна + орбита
- **iss.js** — МКС + космонавт (setCosmonautActive, updateCosmonaut)
- **rockets.js** — ракеты с космодромов

### Взаимодействие
- **selection.js** — selectTarget(), клик по объектам/label'ам, космодромам, init(ui)
- **tooltip.js** — тултип при hover
- **zoom.js** — плавный зум (setZoomTarget, updateZoom, distToZoomNorm)

### UI
- **ui.js** — initUI() — правая панель (скорость, масштаб, зум, паузы, toggles)
- **help.js** — initHelp() — справка
- **settings.js** — initSettings(), loadSettings() — панель настроек
- **description.js** — initDescription() — описание проекта

### Главный файл
- **main.js** — импорты всех модулей, инициализация UI, animate loop, resize handler

## Принципы
- Каждый модуль экспортирует только нужное API
- state.js — единая точка для shared state (скорость, пауза, distScale, autoRotate)
- Модули не зависят друг от друга напрямую (кроме state/scene-core/geo/data)
- main.js — единственный файл, который знает о всех модулях и связывает их через animate()

## Зависимости
```
main.js
├─ state.js (shared state)
├─ scene-core.js (THREE scene/camera/renderer/controls)
├─ geo.js (координаты)
├─ data.js (массивы данных)
├─ earth.js → state, scene-core, geo, data
├─ markers.js → state, scene-core, geo, flags, data
├─ satellites.js → state, scene-core, geo, data
├─ planes.js → state, scene-core, geo, data
├─ seacraft.js → state, scene-core, geo, data
├─ sky.js → scene-core, data
├─ solar-system.js → scene-core, state, data
├─ moon.js → scene-core, state, geo
├─ iss.js → scene-core, state, geo, markers
├─ rockets.js → scene-core, state, geo, data
├─ selection.js → scene-core, state, zoom, earth, moon, solar-system, iss, rockets, data
├─ zoom.js → scene-core, state
├─ tooltip.js → state, scene-core
├─ ui.js
├─ help.js
├─ settings.js
└─ description.js
```
