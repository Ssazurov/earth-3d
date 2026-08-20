// Главный файл — инициализация сцены, UI, animation loop.

import { CITIES } from './data.js';
import { latLonToVec3 } from './geo.js';
import { SETTINGS, paused, setPaused, globalSpeed, setGlobalSpeed, currentTransportSpeed, distScale, setDistScale, autoRotate, setAutoRotate, VIS } from './state.js';
import { scene, camera, renderer, labelRenderer, controls } from './scene-core.js';
import { earth, clouds, updateEarthDetail } from './earth.js';
import { updateMarkers } from './markers.js';
import { updateSatellites } from './satellites.js';
import { updatePlanes } from './planes.js';
import { updateShips } from './seacraft.js';
import { skyGroup } from './sky.js';
import { distToZoomNorm, setCameraZoom } from './zoom.js';
import { solarBodies, updatePlanets } from './solar-system.js';
import { updateMoon } from './moon.js';
import { updateISS } from './iss.js';
import { updateCosmonaut } from './iss.js';
import { updateRockets } from './rockets.js';
import { selectable, focused, updateZoomMax, init as initSelection } from './selection.js';
import { initUI } from './ui.js';
import { initHelp } from './help.js';
import { initSettings } from './settings.js';
import { initDescription } from './description.js';

// --- старт: Москва по центру ---
{
  const moscowDir = latLonToVec3(CITIES[0][1], CITIES[0][2], 1);
  const az0 = Math.atan2(moscowDir.x, moscowDir.z);
  earth.rotation.y = -az0;
}

// --- UI ---
const help = initHelp();
const settingsUI = initSettings();
initDescription({ onHelpClick: () => help.toggle() });
const ui = initUI({
  onSpeedChange(v){ setGlobalSpeed(v); },
  onDistScaleChange(v){ setDistScale(v); updateZoomMax(focused); },
  onZoomChange(v){ setCameraZoom(v); },
  onToggle(key, val){
    if(key==='constellations') skyGroup.visible = val;
    else if(key==='planets') solarBodies.forEach(b => {
      b.mesh.visible = val;
      const labelObj = b.mesh.children.find(c => c.isCSS2DObject);
      if(labelObj) labelObj.visible = val;
    });
    else if(key==='labels') document.body.classList.toggle('hide-labels', !val);
    else VIS[key] = val;
  },
  onPauseToggle(v){ setPaused(v); },
  onHelpToggle(){ help.toggle(); },
  onSettingsToggle(){ settingsUI.toggle(); },
  settings: SETTINGS
});
if(!VIS.labels) document.body.classList.add('hide-labels');
skyGroup.visible = VIS.constellations;
solarBodies.forEach(b => {
  b.mesh.visible = VIS.planets;
  const labelObj = b.mesh.children.find(c => c.isCSS2DObject);
  if(labelObj) labelObj.visible = VIS.planets;
});
updateZoomMax(focused);
initSelection(ui);

// --- анимация ---
let idleTimer = 0;
renderer.domElement.addEventListener('mousedown', (e) => { if(e.button === 0) setAutoRotate(false); });
renderer.domElement.addEventListener('touchstart', () => { setAutoRotate(false); });
addEventListener('mouseup', () => { idleTimer = 0; });
addEventListener('touchend', () => { idleTimer = 0; });

const clock = new THREE.Clock();
let simTime = 0;
function animate(){
  requestAnimationFrame(animate);
  if(!controls.enabled) return;
  const dt = clock.getDelta();
  const effDt = paused ? 0 : dt;
  if(!paused) simTime += dt;
  if(autoRotate){
    if(!paused) earth.rotation.y += 0.0009*globalSpeed;
  } else {
    idleTimer++;
    if(idleTimer > 240) setAutoRotate(true);
  }
  if(!paused) clouds.rotation.y += 0.0013;
  updateSatellites(simTime * currentTransportSpeed());
  updatePlanes(effDt * currentTransportSpeed());
  updateShips(effDt * currentTransportSpeed());
  updatePlanets(simTime);
  updateMoon(simTime);
  updateISS(simTime);
  updateCosmonaut(effDt);
  updateRockets(effDt, simTime);
  if(!focused.isEarth){
    const targetPos = focused.mesh.position.clone();
    const delta = new THREE.Vector3().subVectors(targetPos, controls.target);
    const lerpFactor = Math.min(dt * 8, 1);
    camera.position.add(delta.multiplyScalar(lerpFactor));
    controls.target.lerp(targetPos, lerpFactor);
  }
  controls.update();
  skyGroup.position.copy(camera.position);
  updateMarkers();
  updateEarthDetail(camera);
  const zn = distToZoomNorm(camera.position.distanceTo(controls.target));
  ui.setZoom(zn);
  document.body.classList.toggle('max-zoomout', zn > 0.92);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
  updateZoomMax(focused);
});
