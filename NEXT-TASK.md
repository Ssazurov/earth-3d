# ЗАДАЧА ДЛЯ СЛЕДУЮЩЕЙ СЕССИИ: доразбить js/main.js на модули

## Статус (важно!)
main.js СЕЙЧАС НЕ ТРОНУТ и полностью рабочий — сайт работает как раньше.
Новые модули уже созданы РЯДОМ, но main.js их ещё не импортирует и
старый код не удалён (дублирование, но ничего не сломано).

## Уже готово (не трогать, разве что поправить при интеграции)
js/geo.js, js/state.js, js/flags.js, js/tooltip.js, js/scene-core.js,
js/earth.js, js/markers.js, js/satellites.js, js/planes.js, js/seacraft.js,
js/sky.js, js/zoom.js — уже созданы с export/import.

## Сырьё для оставшихся модулей
В js/_extract/*.txt лежат ТОЧНЫЕ вырезки из main.js (сделаны через python,
без ретайпинга — доверяй им как первоисточнику):
- solarsystem.txt (было main.js:733-833) — Солнце+планеты
- moon.txt (834-859)
- iss.txt (860-963)
- rockets.txt (964-1230)
- selection.txt (1231-1315)

## Что сделать
1. По образцу уже готовых файлов собрать:
   - js/solar-system.js (sunMesh, planetTexture/makeRockyTexture/
     makeBandedTexture, solarBodies[], updatePlanets(t) — использует
     distScale из state.js, speedMul из state.js, hitMeshes из state.js)
   - js/moon.js (moon mesh, moonOrbit, updateMoon(t) — speedMul, loader/TEX
     из earth.js)
   - js/iss.js (buildISS, issMesh, issOrbit, issPosAt/updateISS, cosmonaut+
     updateCosmonaut, cosmonautActive/T — нужен export setIssLabel вызов
     из markers.js после создания issMesh; orbitPoint из geo.js)
   - js/rockets.js (LAUNCH_WORDS/CREW_SURNAMES/makeCrew/makeRocket/
     rocketPool/launchRocket/updateRockets — нужны earth, scene, hitMeshes,
     COSMODROMES, latLonToVec3, showCountdownText/hideCountdown из
     tooltip.js, currentTransportSpeed(earth) из state.js, issPosAt из
     iss.js)
   - js/selection.js (selectable[], updateZoomMax, selectTarget,
     pointerdown/click листенеры — нужны distScale/setDistScale из
     state.js, ZOOM_MAX/setZoomMax из zoom.js, autoRotate/setAutoRotate
     из state.js, cosmonaut-стейт из iss.js, launchRocket из rockets.js,
     ui-объект — передавать через параметр функции init(), а не
     импортировать напрямую (main.js создаёт ui после selection))

2. ВАЖНО: везде, где раньше был `currentTransportSpeed()` без аргумента —
   теперь в state.js сигнатура `currentTransportSpeed(earth)` (нужен earth).
   Проверь все места вызова.

3. Переписать js/main.js "с нуля" как оркестратор:
   - импорты всех модулей
   - `objectSpeed.set(earth, EARTH_DEFAULT_SPEED)` (из state.js) один раз
   - строка начальной ориентации Земли на Москву (было main.js:133-137,
     нужны CITIES[0] и earth)
   - initHelp/initSettings/initDescription/initUI wiring (было ~main.js
     1316-1349) — используй onPauseToggle→setPaused, onDistScaleChange→
     setDistScale, зум→setCameraZoom
   - animate() — было main.js:1375-1431, подставить импортированные
     update-функции и state.paused/autoRotate/distScale по месту
   - НЕ забыть asteroid (js/asteroid.js уже подключено — не трогать)

4. Удалить из main.js весь перенесённый код (все extract-диапазоны).

5. Убрать js/_extract/, extract.py, find_markers.py — это были временные
   рабочие файлы, в финале не нужны.

6. Создать ARCHITECTURE.md в корне проекта — короткая карта:
   какой файл за что отвечает (1-2 строки на файл), чтобы агент в новой
   сессии не перечитывал всё подряд, а сразу шёл в нужный модуль.

7. ОБЯЗАТЕЛЬНО открыть index.html в браузере (dev-сервер
   http://localhost:8080/index.html) и проверить, что всё работает:
   Земля, маркеры, самолёты/корабли/ракеты/МКС/созвездия/планеты/зум/
   пауза/клик по объектам — до сих пор НИ РАЗУ не проверялось визуально.

8. Обновить progress.md итогами сессии.

## Как быстро сориентироваться агенту
1. Прочитать этот файл целиком.
2. Прочитать progress.md (конец файла — последние сессии).
3. НЕ читать старый js/main.js целиком заново — все нужные куски уже
   лежат в js/_extract/*.txt построчно точно как в оригинале.
