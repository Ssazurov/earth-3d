// Выбор объекта кликом (Земля/Луна/Солнце/планеты/МКС) — центрирует камеру,
// пересчитывает предел зума. init(ui) вызывается из main.js после создания ui.

import { camera, controls, renderer } from './scene-core.js';
import { earth } from './earth.js';
import { moon } from './moon.js';
import { sunMesh, solarBodies } from './solar-system.js';
import { SUN_BASE_DIST } from './solar-system.js';
import { issMesh, setCosmonautActive } from './iss.js';
import { rocketPool, launchRocket } from './rockets.js';
import { hitMeshes, raycaster, mouseNDC, globalSpeed, distScale, setAutoRotate } from './state.js';
import { setZoomMax } from './zoom.js';
import { PLANETS, COSMODROMES } from './data.js';

export const selectable = [
  {mesh: earth, name:'Земля', size:1, isEarth:true, sunDist: SUN_BASE_DIST},
  {mesh: moon,  name:'Луна',  size:0.27, sunDist: SUN_BASE_DIST},
  {mesh: sunMesh, name:'Солнце', size:3.5, sunDist: 0},
  {mesh: issMesh, name:'МКС', size:0.05, sunDist: SUN_BASE_DIST},
  ...solarBodies.map((b,i) => ({mesh:b.mesh, name:PLANETS[i].name, size:PLANETS[i].size, sunDist:PLANETS[i].dist}))
];
const MAX_PLANET_DIST = Math.max(...PLANETS.map(p => p.dist));

export function updateZoomMax(target){
  const targetSunDist = (target && target.sunDist != null) ? target.sunDist : SUN_BASE_DIST;
  const spanBase = targetSunDist + MAX_PLANET_DIST;
  const span = spanBase * distScale;
  const vHalfFov = THREE.MathUtils.degToRad(camera.fov/2);
  const hHalfFov = Math.atan(Math.tan(vHalfFov) * camera.aspect);
  const limitHalfFov = Math.min(vHalfFov, hHalfFov);
  const margin = 1.15;
  const zoomMax = Math.max(span * margin / Math.tan(limitHalfFov), controls.minDistance * 1.5);
  setZoomMax(zoomMax);
  controls.maxDistance = zoomMax;
}

export let focused = selectable[0];
export function selectTarget(target, ui){
  if(!target || target === focused) return;
  const delta = new THREE.Vector3().subVectors(target.mesh.position, controls.target);
  camera.position.add(delta);
  controls.target.copy(target.mesh.position);
  controls.minDistance = target.isEarth ? 1.08 : target.size*1.4 + 0.05;
  updateZoomMax(target);
  setAutoRotate(!!target.isEarth);
  focused = target;
  if(ui) ui.setFocused(target.name, globalSpeed);
}

export function init(ui){
  let downPos = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { downPos = {x:e.clientX, y:e.clientY}; });
  renderer.domElement.addEventListener('click', (e) => {
    const dragged = downPos && Math.hypot(e.clientX-downPos.x, e.clientY-downPos.y) > 5;
    downPos = null;
    if(dragged) return;
    mouseNDC.x = (e.clientX/innerWidth)*2 - 1;
    mouseNDC.y = -(e.clientY/innerHeight)*2 + 1;
    raycaster.setFromCamera(mouseNDC, camera);
    const cosmoHits = raycaster.intersectObjects(hitMeshes, false)
      .filter(h => h.object.userData.kind === 'cosmodrome' && h.object.parent.visible);
    if(cosmoHits.length){
      const pad = COSMODROMES.find(p => p[0] === cosmoHits[0].object.userData.name);
      const idle = rocketPool.find(r => r.state === 'idle');
      if(pad && idle) launchRocket(idle, pad);
      return;
    }
    const hits = raycaster.intersectObjects(selectable.map(s => s.mesh), true);
    let target = hits.length ? selectable.find(s => s.mesh === hits[0].object || s.mesh === hits[0].object.parent) : null;
    if(target){
      const wasIss = target.mesh === issMesh;
      selectTarget(target, ui);
      if(wasIss && !cosmonautActive) setCosmonautActive(true);
    }
  });
  selectable.forEach(s => {
    const labelObj = s.mesh.children.find(c => c.isCSS2DObject);
    if(labelObj){
      labelObj.element.style.pointerEvents = 'auto';
      labelObj.element.style.cursor = 'pointer';
      labelObj.element.addEventListener('click', () => selectTarget(s, ui));
    }
  });
}
