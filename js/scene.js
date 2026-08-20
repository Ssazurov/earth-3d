// --- база: сцена/камера/рендер/Земля/маркеры/тултип ---
// Отсюда берут scene/camera/hitMeshes/latLonToVec3 все остальные модули.
import { CITIES, LANDMARKS, PLANTS, RU_CITIES, CITIES2, COSMODROMES } from './data.js';

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(0, 0, 3.2);

export const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);

export const labelRenderer = new THREE.CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

export const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1.08;
controls.maxDistance = 260;
controls.enablePan = false;
controls.rotateSpeed = 0.5;
controls.zoomSpeed = 1.1;

function starField(count){
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(count*3);
  for(let i=0;i<count*3;i++) pos[i] = (Math.random()-0.5)*900;
  g.setAttribute('position', new THREE.BufferAttribute(pos,3));
  const m = new THREE.PointsMaterial({color:0xffffff, size:0.7, sizeAttenuation:true});
  return new THREE.Points(g, m);
}
scene.add(starField(6000));

export const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(5, 2, 5);
scene.add(sun);
scene.add(new THREE.AmbientLight(0x223355, 0.6));

export const loader = new THREE.TextureLoader();
export const TEX = 'https://threejs.org/examples/textures/planets/';
const TEX4K = 'https://raw.githubusercontent.com/turban/webgl-earth/master/images/';
const dayMap   = loader.load(TEX4K + '2_no_clouds_4k.jpg');
const bumpMap  = loader.load(TEX4K + 'elev_bump_4k.jpg');
const specMap  = loader.load(TEX4K + 'water_4k.png');
const cloudMap = loader.load(TEX4K + 'fair_clouds_4k.png');
[dayMap, bumpMap, specMap, cloudMap].forEach(t => { t.anisotropy = renderer.capabilities.getMaxAnisotropy(); });

const earthGeo = new THREE.SphereGeometry(1, 256, 256);
export const earthMat = new THREE.MeshPhongMaterial({
  map: dayMap, bumpMap: bumpMap, bumpScale: 0.02,
  specularMap: specMap, specular: new THREE.Color(0x333333), shininess: 8
});
export const earth = new THREE.Mesh(earthGeo, earthMat);
scene.add(earth);
{
  const div = document.createElement('div');
  div.className = 'city-label planet';
  div.textContent = 'Земля';
  const label = new THREE.CSS2DObject(div);
  label.position.set(0, 1.2, 0);
  earth.add(label);
}

const cloudGeo = new THREE.SphereGeometry(1.01, 128, 128);
export const cloudMat = new THREE.MeshPhongMaterial({map: cloudMap, transparent: true, opacity: 0.35, depthWrite: false});
export const clouds = new THREE.Mesh(cloudGeo, cloudMat);
scene.add(clouds);

const nightMap = loader.load(TEX + 'earth_lights_2048.png');
export const nightMat = new THREE.ShaderMaterial({
  uniforms: { nightTex:{value:nightMap}, sunDirection:{value:new THREE.Vector3(1,0,0)} },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormalW;
    void main(){
      vUv = uv;
      vNormalW = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }`,
  fragmentShader: `
    uniform sampler2D nightTex;
    uniform vec3 sunDirection;
    varying vec2 vUv;
    varying vec3 vNormalW;
    void main(){
      float night = clamp(-dot(vNormalW, sunDirection), 0.0, 1.0);
      vec4 lights = texture2D(nightTex, vUv);
      gl_FragColor = vec4(lights.rgb, lights.r * night);
    }`,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
});
const nightMesh = new THREE.Mesh(new THREE.SphereGeometry(1.001, 64, 64), nightMat);
earth.add(nightMesh);

const glowMat = new THREE.ShaderMaterial({
  uniforms: {},
  vertexShader: `
    varying vec3 vNormal;
    void main(){
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }`,
  fragmentShader: `
    varying vec3 vNormal;
    void main(){
      float i = pow(0.65 - dot(vNormal, vec3(0,0,1.0)), 3.0);
      gl_FragColor = vec4(0.3,0.6,1.0,1.0) * i;
    }`,
  blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true
});
export const glow = new THREE.Mesh(new THREE.SphereGeometry(1.15, 64, 64), glowMat);
scene.add(glow);

export function latLonToVec3(lat, lon, r){
  const phi = (90 - lat) * Math.PI/180;
  const theta = (lon + 180) * Math.PI/180;
  return new THREE.Vector3(-r*Math.sin(phi)*Math.cos(theta), r*Math.cos(phi), r*Math.sin(phi)*Math.sin(theta));
}

// общая геометрическая утилита для круговых орбит (спутники, МКС)
export function orbitPoint(radius, incl, node, angle){
  const p = new THREE.Vector3(Math.cos(angle)*radius, 0, Math.sin(angle)*radius);
  p.applyAxisAngle(new THREE.Vector3(1,0,0), incl);
  p.applyAxisAngle(new THREE.Vector3(0,1,0), node);
  return p;
}

{
  const moscowDir = latLonToVec3(CITIES[0][1], CITIES[0][2], 1);
  const az0 = Math.atan2(moscowDir.x, moscowDir.z);
  earth.rotation.y = -az0;
}

const flagMatCache = {};
function getFlagMaterial(emoji){
  if(flagMatCache[emoji]) return flagMatCache[emoji];
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.font = '46px "Segoe UI Emoji","Noto Color Emoji",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 32, 34);
  const mat = new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c), transparent:true, depthTest:false});
  flagMatCache[emoji] = mat;
  return mat;
}

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

export const raycaster = new THREE.Raycaster();
export const mouseNDC = new THREE.Vector2();
export const hitMeshes = [];
function fmtDT(d){ return d.toLocaleString('ru-RU', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}); }
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

const DOT_COLORS = {city:0xff5555, landmark:0xffd76a, ru:0x66ccff, city2:0x66ccff, plant:0x66ffa3, cosmodrome:0xff8a5c};
function tierOf(kind, isCapital){
  if(kind === 'city') return isCapital ? 0 : 1;
  if(kind === 'plant') return 1;
  if(kind === 'cosmodrome') return 1;
  if(kind === 'landmark') return 2;
  return 3;
}
export const markers = [];
function addMarker(name, lat, lon, kind, country, flag, isCapital){
  const tier = tierOf(kind, isCapital);
  const dir = latLonToVec3(lat, lon, 1).normalize();
  const pos = dir.clone().multiplyScalar(1.003);

  const isCityDot = kind==='city' || kind==='ru' || kind==='city2';
  const dotRadius = isCityDot ? 0.007*0.35 : 0.007;
  const dotMat = isCityDot
    ? new THREE.MeshBasicMaterial({color: DOT_COLORS[kind], transparent:true, opacity:0.25})
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

  if(isCapital && flag){
    const flagSpr = new THREE.Sprite(getFlagMaterial(flag));
    flagSpr.scale.set(0.045, 0.045, 1);
    flagSpr.position.set(0, 0.028, 0);
    dot.add(flagSpr);
  }

  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), new THREE.MeshBasicMaterial({visible:false}));
  hit.userData = {name, country, flag, kind};
  dot.add(hit);
  hitMeshes.push(hit);

  markers.push({dot, label, dir, tier, kind, isCapital: !!isCapital});
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
