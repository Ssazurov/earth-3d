import { scene, camera, renderer } from './scene-core.js';
import { earth } from './earth.js';
import { hitMeshes, raycaster, mouseNDC, VIS } from './state.js';
import { tooltip, renderTooltipHTML } from './tooltip.js';
import { getFlagMaterial } from './flags.js';
import { latLonToVec3 } from './geo.js';
import { CITIES, LANDMARKS, PLANTS, RU_CITIES, CITIES2, COSMODROMES } from './data.js';
import { moon } from './moon.js';

// Маркеры городов/достопримечательностей/электростанций/космодромов на Земле:
// точки+подписи (addMarker), тултип по наведению, видимость по уровням (tierOf/kindVisible),
// updateMarkers() — какие подписи показывать в зависимости от зума/поворота Земли.

const DOT_COLORS = {city:0xff5555, landmark:0xffd76a, ru:0x66ccff, city2:0x66ccff, plant:0x66ffa3, cosmodrome:0xff8a5c};
function tierOf(kind, isCapital){
  if(kind === 'city') return isCapital ? 0 : 1;
  if(kind === 'plant') return 1;
  if(kind === 'cosmodrome') return 1;
  if(kind === 'landmark') return 2;
  return 3;
}
export const markers = [];
export function addMarker(name, lat, lon, kind, country, flag, isCapital){
  const tier = tierOf(kind, isCapital);
  const dir = latLonToVec3(lat, lon, 1).normalize();
  const pos = dir.clone().multiplyScalar(1.003);

  const isCityDot = kind==='city' || kind==='ru' || kind==='city2';
  const dotRadius = isCityDot ? 0.007*0.35 : 0.007;
  const dotMat = isCityDot
    ? new THREE.MeshBasicMaterial({color: DOT_COLORS[kind], transparent:true, opacity:0.85})
    : new THREE.MeshBasicMaterial({color: DOT_COLORS[kind]});
  const dot = new THREE.Mesh(new THREE.SphereGeometry(dotRadius, 12, 12), dotMat);
  dot.position.copy(pos);
  earth.add(dot);

  const div = document.createElement('div');
  div.className = 'city-label' + (kind !== 'city' ? ' ' + kind : '') + (kind === 'city' && isCapital ? ' capital' : '');
  div.textContent = name;
  const label = new THREE.CSS2DObject(div);
  label.position.set(0,0,0);
  dot.add(label);

  let flagSpr = null;
  if(isCapital && flag){
    flagSpr = new THREE.Sprite(getFlagMaterial(flag));
    flagSpr.scale.set(0.0315, 0.0315, 1);
    flagSpr.position.set(0, 0.028, 0);
    dot.add(flagSpr);
  }

  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), new THREE.MeshBasicMaterial({visible:false}));
  hit.userData = {name, country, flag, kind};
  dot.add(hit);
  hitMeshes.push(hit);

  markers.push({dot, label, flagSpr, dir, tier, kind, isCapital: !!isCapital});
}
CITIES.forEach(([n,lat,lon,country,flag,cap]) => addMarker(n,lat,lon,'city',country,flag,cap));
LANDMARKS.forEach(([n,lat,lon,country,flag]) => addMarker(n,lat,lon,'landmark',country,flag));
PLANTS.forEach(([n,lat,lon,country,flag]) => addMarker(n,lat,lon,'plant',country,flag));
RU_CITIES.forEach(([n,lat,lon]) => addMarker(n,lat,lon,'ru','Россия','🇷🇺'));
CITIES2.forEach(([n,lat,lon,country,flag]) => addMarker(n,lat,lon,'city2',country,flag));
COSMODROMES.forEach(([n,lat,lon,country,flag]) => addMarker(n,lat,lon,'cosmodrome',country,flag));

renderer.domElement.addEventListener('mousemove', (e) => {
  mouseNDC.x = (e.clientX/innerWidth)*2 - 1;
  mouseNDC.y = -(e.clientY/innerHeight)*2 + 1;
  raycaster.setFromCamera(mouseNDC, camera);
  const hits = raycaster.intersectObjects(hitMeshes, false).filter(h => h.object.parent.visible);
  if(hits.length){
    const d = hits[0].object.userData;
    tooltip.innerHTML = renderTooltipHTML(d);
    tooltip.style.left = (e.clientX+14)+'px';
    tooltip.style.top  = (e.clientY+14)+'px';
    tooltip.style.display = 'block';
    renderer.domElement.style.cursor = 'pointer';
  } else {
    tooltip.style.display = 'none';
    renderer.domElement.style.cursor = 'default';
  }
});

function kindVisible(m){
  if(m.kind==='plant') return VIS.plant;
  if(m.kind==='city' && m.isCapital) return VIS.capitals;
  if(m.kind==='city'||m.kind==='ru'||m.kind==='city2') return VIS.city;
  return true;
}

// Начальная дистанция камеры (scene-core.js: camera.position.set(0,0,3.2)).
// При зуме на 30% ближе неё названия столиц скрываются, чтобы не перегружать
// экран подписями — остаётся только флаг (см. issue #16).
const FLAG_LABEL_HIDE_DIST = 3.2 * 0.7;

const camDir = new THREE.Vector3();
const _markerWorld = new THREE.Vector3();
const _toPoint = new THREE.Vector3();
const _toMoon = new THREE.Vector3();
// Подписи городов/столиц рисуются CSS2DRenderer поверх WebGL-сцены и не
// учитывают глубину сама по себе (issue #19). Проверяем, не закрыта ли
// точка маркера Луной по лучу камера->маркер (сфера-луч).
function occludedByMoon(pointWorld){
  if(!moon.visible) return false;
  const moonR = 0.27;
  _toPoint.copy(pointWorld).sub(camera.position);
  const distToPoint = _toPoint.length();
  if(distToPoint < 1e-6) return false;
  _toPoint.divideScalar(distToPoint);
  _toMoon.copy(moon.position).sub(camera.position);
  const tca = _toMoon.dot(_toPoint);
  if(tca < 0 || tca > distToPoint) return false;
  const d2 = _toMoon.lengthSq() - tca*tca;
  return d2 < moonR*moonR;
}
export function updateMarkers(){
  camDir.copy(camera.position).normalize();
  const dist = camera.position.length();
  const maxTier = dist < 2.0 ? 3 : dist < 2.8 ? 2 : dist < 4.2 ? 1 : 0;
  const halfFovRad = THREE.MathUtils.degToRad(camera.fov/2);
  const earthDiaPx = innerHeight / (dist * Math.tan(halfFovRad));
  const widthLimit = earthDiaPx / 5;
  const hideCapitalLabel = dist < FLAG_LABEL_HIDE_DIST;
  citiesFirstVisible = false;
  for(const m of markers){
    const worldDir = m.dir.clone().applyQuaternion(earth.quaternion);
    const rawFacing = worldDir.dot(camDir) > 0.1;
    const facing = rawFacing && kindVisible(m);
    const fitsWidth = m.label.element.offsetWidth < widthLimit;
    const moonOccluded = occludedByMoon(m.dot.getWorldPosition(_markerWorld));
    let vis = facing && m.tier <= maxTier && fitsWidth;
    if(m.isCapital && hideCapitalLabel) vis = false;
    if(vis && moonOccluded) vis = false;
    m.label.element.style.opacity = vis ? '1' : '0';
    const showFlag = m.isCapital && rawFacing && VIS.flags && !moonOccluded;
    m.dot.visible = facing || showFlag;
    if(m.flagSpr) m.flagSpr.visible = showFlag;
    if(m.tier === 0 && vis) citiesFirstVisible = true;
  }
  if(issLabel) issLabel.element.style.opacity = citiesFirstVisible ? '1' : '0';
}
let citiesFirstVisible = false;
export let issLabel = null;
export function setIssLabel(label){ issLabel = label; }
