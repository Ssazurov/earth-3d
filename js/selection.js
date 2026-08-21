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

const MIN_HIT_RADIUS_PX = 14;

export const selectable = [
  {mesh: earth, name:'Земля', size:1, isEarth:true, sunDist: SUN_BASE_DIST},
  {mesh: moon,  name:'Луна',  size:0.27, sunDist: SUN_BASE_DIST},
  {mesh: sunMesh, name:'Солнце', size:3.5, sunDist: 0},
  {mesh: issMesh, name:'МКС', size:0.05, sunDist: SUN_BASE_DIST},
  ...solarBodies.map((b,i) => ({mesh:b.mesh, name:PLANETS[i].name, size:PLANETS[i].size, sunDist:PLANETS[i].dist}))
];
const MAX_PLANET_DIST = Math.max(...PLANETS.map(p => p.dist));

const earthHit = new THREE.Mesh(
  new THREE.SphereGeometry(1, 8, 8),
  new THREE.MeshBasicMaterial({visible:false})
);
earth.add(earthHit);

function getHitMesh(target){
  if(target.isEarth) return earthHit;
  return target.mesh.children.find(child => child.isMesh && child.material.visible === false);
}

const selectableHits = selectable.map(target => ({target, mesh:getHitMesh(target)}));

function updateHitMeshes(){
  const viewportHeight = renderer.domElement.clientHeight;
  if(!viewportHeight) return;
  const pixelsToWorld = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / viewportHeight;
  selectableHits.forEach(({target, mesh}) => {
    if(!mesh) return;
    const distance = camera.position.distanceTo(target.mesh.getWorldPosition(new THREE.Vector3()));
    const minimumRadius = distance * pixelsToWorld * MIN_HIT_RADIUS_PX;
    const baseRadius = mesh.geometry.boundingSphere.radius;
    mesh.scale.setScalar(Math.max(1, minimumRadius / baseRadius));
  });
}

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
  const curDist = camera.position.distanceTo(controls.target);
  if(curDist > zoomMax){
    const dir = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target).add(dir.multiplyScalar(zoomMax));
  }
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
    updateHitMeshes();
    const hits = raycaster.intersectObjects(selectableHits.map(hit => hit.mesh).filter(Boolean), false);
    const target = hits.length ? selectableHits.find(hit => hit.mesh === hits[0].object).target : null;
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
