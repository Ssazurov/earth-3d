import { CITIES, LANDMARKS, PLANTS, RU_CITIES, COSMODROMES, PLANETS, CONSTELLATIONS } from './data.js';
import { initUI } from './ui.js';

// --- сцена, камера, рендер ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(0, 0, 3.2);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);

// --- слой HTML-подписей поверх сцены ---
const labelRenderer = new THREE.CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

// --- управление мышью ---
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1.08;
controls.maxDistance = 260;
controls.enablePan = false;
controls.rotateSpeed = 0.5;
controls.zoomSpeed = 1.1;

// --- звёздное небо ---
function starField(count){
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(count*3);
  for(let i=0;i<count*3;i++) pos[i] = (Math.random()-0.5)*900;
  g.setAttribute('position', new THREE.BufferAttribute(pos,3));
  const m = new THREE.PointsMaterial({color:0xffffff, size:0.7, sizeAttenuation:true});
  return new THREE.Points(g, m);
}
scene.add(starField(6000));

// --- свет ---
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(5, 2, 5);
scene.add(sun);
scene.add(new THREE.AmbientLight(0x223355, 0.6));

// --- текстуры Земли ---
const loader = new THREE.TextureLoader();
const TEX = 'https://threejs.org/examples/textures/planets/';
const TEX4K = 'https://raw.githubusercontent.com/turban/webgl-earth/master/images/';
const dayMap   = loader.load(TEX4K + '2_no_clouds_4k.jpg');
const bumpMap  = loader.load(TEX4K + 'elev_bump_4k.jpg');
const specMap  = loader.load(TEX4K + 'water_4k.png');
const cloudMap = loader.load(TEX4K + 'fair_clouds_4k.png');
[dayMap, bumpMap, specMap, cloudMap].forEach(t => { t.anisotropy = renderer.capabilities.getMaxAnisotropy(); });

const earthGeo = new THREE.SphereGeometry(1, 256, 256);
const earthMat = new THREE.MeshPhongMaterial({
  map: dayMap, bumpMap: bumpMap, bumpScale: 0.02,
  specularMap: specMap, specular: new THREE.Color(0x333333), shininess: 8
});
const earth = new THREE.Mesh(earthGeo, earthMat);
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
const cloudMat = new THREE.MeshPhongMaterial({map: cloudMap, transparent: true, opacity: 0.35, depthWrite: false});
const clouds = new THREE.Mesh(cloudGeo, cloudMat);
scene.add(clouds);

const nightMap = loader.load(TEX + 'earth_lights_2048.png');
const nightMat = new THREE.ShaderMaterial({
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
const glow = new THREE.Mesh(new THREE.SphereGeometry(1.15, 64, 64), glowMat);
scene.add(glow);

function latLonToVec3(lat, lon, r){
  const phi = (90 - lat) * Math.PI/180;
  const theta = (lon + 180) * Math.PI/180;
  return new THREE.Vector3(-r*Math.sin(phi)*Math.cos(theta), r*Math.cos(phi), r*Math.sin(phi)*Math.sin(theta));
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

const tooltip = document.createElement('div');
tooltip.style.cssText = 'position:fixed;pointer-events:none;display:none;z-index:20;'+
  'background:rgba(0,20,40,.9);color:#fff;font:13px sans-serif;padding:6px 10px;'+
  'border-radius:6px;border:1px solid rgba(255,255,255,.25);white-space:nowrap';
document.body.appendChild(tooltip);
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();
const hitMeshes = [];

const DOT_COLORS = {city:0xff5555, landmark:0xffd76a, ru:0x66ccff, plant:0x66ffa3, cosmodrome:0xff8a5c};
function tierOf(kind, isCapital){
  if(kind === 'city') return isCapital ? 0 : 1;
  if(kind === 'plant') return 1;
  if(kind === 'cosmodrome') return 1;
  if(kind === 'landmark') return 2;
  return 3;
}
const markers = [];
function addMarker(name, lat, lon, kind, country, flag, isCapital){
  const tier = tierOf(kind, isCapital);
  const dir = latLonToVec3(lat, lon, 1).normalize();
  const pos = dir.clone().multiplyScalar(1.003);

  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 8), new THREE.MeshBasicMaterial({color: DOT_COLORS[kind]}));
  dot.position.copy(pos);
  earth.add(dot);

  const div = document.createElement('div');
  div.className = 'city-label' + (kind !== 'city' ? ' ' + kind : '');
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
  hit.userData = {name, country, flag};
  dot.add(hit);
  hitMeshes.push(hit);

  markers.push({dot, label, dir, tier, kind});
}
CITIES.forEach(([n,lat,lon,country,flag,cap]) => addMarker(n,lat,lon,'city',country,flag,cap));
LANDMARKS.forEach(([n,lat,lon,country,flag]) => addMarker(n,lat,lon,'landmark',country,flag));
PLANTS.forEach(([n,lat,lon,country,flag]) => addMarker(n,lat,lon,'plant',country,flag));
RU_CITIES.forEach(([n,lat,lon]) => addMarker(n,lat,lon,'ru','Россия','🇷🇺'));
COSMODROMES.forEach(([n,lat,lon,country,flag]) => addMarker(n,lat,lon,'cosmodrome',country,flag));

renderer.domElement.addEventListener('mousemove', (e) => {
  mouseNDC.x = (e.clientX/innerWidth)*2 - 1;
  mouseNDC.y = -(e.clientY/innerHeight)*2 + 1;
  raycaster.setFromCamera(mouseNDC, camera);
  const hits = raycaster.intersectObjects(hitMeshes, false).filter(h => h.object.parent.visible);
  if(hits.length){
    const d = hits[0].object.userData;
    tooltip.innerHTML = `${d.flag||''} <b>${d.name}</b>` + (d.country ? ' — '+d.country : '');
    tooltip.style.left = (e.clientX+14)+'px';
    tooltip.style.top  = (e.clientY+14)+'px';
    tooltip.style.display = 'block';
    renderer.domElement.style.cursor = 'pointer';
  } else {
    tooltip.style.display = 'none';
    renderer.domElement.style.cursor = 'default';
  }
});

const VIS = {constellations:true, city:true, plant:true, planets:true, labels:true};
const objectSpeed = new Map();
let paused = false;
function kindVisible(kind){
  if(kind==='plant') return VIS.plant;
  if(kind==='city'||kind==='ru') return VIS.city;
  return true;
}

function speedMul(mesh){ return objectSpeed.has(mesh) ? objectSpeed.get(mesh) : 1; }

const camDir = new THREE.Vector3();
function updateMarkers(){
  camDir.copy(camera.position).normalize();
  const dist = camera.position.length();
  const maxTier = dist < 2.0 ? 3 : dist < 2.8 ? 2 : dist < 4.2 ? 1 : 0;
  const halfFovRad = THREE.MathUtils.degToRad(camera.fov/2);
  const earthDiaPx = innerHeight / (dist * Math.tan(halfFovRad));
  const widthLimit = earthDiaPx / 5;
  citiesFirstVisible = false;
  for(const m of markers){
    const worldDir = m.dir.clone().applyQuaternion(earth.quaternion);
    const facing = worldDir.dot(camDir) > 0.1 && kindVisible(m.kind);
    const fitsWidth = m.label.element.offsetWidth < widthLimit;
    const vis = facing && m.tier <= maxTier && fitsWidth;
    m.label.element.style.opacity = vis ? '1' : '0';
    m.dot.visible = facing;
    if(m.tier === 0 && vis) citiesFirstVisible = true;
  }
  if(issLabel) issLabel.element.style.opacity = citiesFirstVisible ? '1' : '0';
}
let citiesFirstVisible = false;
let issLabel = null;

// --- спутники ---
const satGroup = new THREE.Group();
scene.add(satGroup);
const satellites = [];
function orbitPoint(radius, incl, node, angle){
  const p = new THREE.Vector3(Math.cos(angle)*radius, 0, Math.sin(angle)*radius);
  p.applyAxisAngle(new THREE.Vector3(1,0,0), incl);
  p.applyAxisAngle(new THREE.Vector3(0,1,0), node);
  return p;
}
for(let i=0;i<6;i++){
  const radius = 1.35 + Math.random()*0.35;
  const incl = Math.random()*Math.PI;
  const node = Math.random()*Math.PI*2;
  const speed = 0.15 + Math.random()*0.25;
  const phase = Math.random()*Math.PI*2;

  const pts = [];
  for(let a=0;a<=64;a++) pts.push(orbitPoint(radius, incl, node, (a/64)*Math.PI*2));
  const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color:0x3399ff, transparent:true, opacity:0.25}));
  satGroup.add(line);

  const sat = makeSatelliteMesh();
  satGroup.add(sat);
  satellites.push({sat, radius, incl, node, speed, phase});
}
function makeSatelliteMesh(){
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({color:0xd8d8d8, metalness:0.5, roughness:0.4});
  const panelMat = new THREE.MeshStandardMaterial({color:0x16336b, metalness:0.4, roughness:0.4, emissive:0x0a1a3a});
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.01,0.01,0.014), bodyMat));
  [-1,1].forEach(side => {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.026,0.001,0.011), panelMat);
    wing.position.x = side*0.02;
    g.add(wing);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.0007,0.0007,0.012,4), bodyMat);
    strut.rotation.z = Math.PI/2;
    strut.position.x = side*0.007;
    g.add(strut);
  });
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.004,8,8,0,Math.PI*2,0,Math.PI/2), bodyMat);
  dish.rotation.x = Math.PI/2;
  dish.position.z = 0.008;
  g.add(dish);
  return g;
}
function updateSatellites(t){
  for(const s of satellites){
    const pos = orbitPoint(s.radius, s.incl, s.node, s.phase + t*s.speed);
    s.sat.position.copy(pos);
    s.sat.lookAt(0,0,0);
  }
}

// --- рейсы ---
const FLIGHT_ROUTES = [
  [CITIES[0], CITIES[1]], [CITIES[2], CITIES[12]], [CITIES[3], CITIES[6]],
  [CITIES[4], CITIES[13]], [CITIES[9], CITIES[11]], [CITIES[7], CITIES[14]]
];
function makePlaneMesh(){
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({color:0xf2f2f2, metalness:0.3, roughness:0.4});
  const glassMat = new THREE.MeshStandardMaterial({color:0x2a3a4a, metalness:0.6, roughness:0.2});
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.0028,0.0028,0.022,8), bodyMat);
  fuselage.rotation.x = Math.PI/2;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.0028,0.008,8), bodyMat);
  nose.rotation.x = Math.PI/2;
  nose.position.z = 0.015;
  g.add(nose);
  g.add(fuselage);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.0022,6,6), glassMat);
  cockpit.position.z = 0.014;
  g.add(cockpit);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.026,0.0008,0.006), bodyMat);
  g.add(wing);
  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.0008,0.006,0.005), bodyMat);
  tailFin.position.set(0,0.003,-0.011);
  g.add(tailFin);
  const stab = new THREE.Mesh(new THREE.BoxGeometry(0.012,0.0006,0.0035), bodyMat);
  stab.position.z = -0.011;
  g.add(stab);
  const navL = new THREE.Mesh(new THREE.SphereGeometry(0.0009,6,6), new THREE.MeshBasicMaterial({color:0xff2222}));
  navL.position.set(-0.013,0,0);
  const navR = new THREE.Mesh(new THREE.SphereGeometry(0.0009,6,6), new THREE.MeshBasicMaterial({color:0x22ff44}));
  navR.position.set(0.013,0,0);
  g.add(navL, navR);
  const trailGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,-0.012), new THREE.Vector3(0,0,-0.05)]);
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({color:0xffffff, transparent:true, opacity:0.35}));
  g.add(trail);
  g.userData = {navL, navR, trail};
  return g;
}
const planes = FLIGHT_ROUTES.map(([from, to]) => {
  const a = latLonToVec3(from[1], from[2], 1).normalize();
  const b = latLonToVec3(to[1],   to[2],   1).normalize();
  const mesh = makePlaneMesh();
  earth.add(mesh);
  return {a, b, mesh, t: 0, dur: (8 + Math.random()*4)*5, alt: 0.12, forward: true,
    state: Math.random()<0.5?'flying':'grounded', groundT: Math.random()*10, groundWait: 12+Math.random()*18, blink: Math.random()*Math.PI*2};
});
const _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3();
function updatePlanes(dt){
  for(const p of planes){
    p.blink += dt*4;
    const on = Math.sin(p.blink) > 0.3;
    p.mesh.userData.navL.visible = on;
    p.mesh.userData.navR.visible = on;

    if(p.state === 'grounded'){
      p.groundT += dt;
      p.mesh.userData.trail.visible = false;
      const at = p.forward ? p.a : p.b;
      p.mesh.position.copy(at);
      if(p.groundT >= p.groundWait){
        p.state = 'flying'; p.t = 0; p.forward = !p.forward;
      }
      continue;
    }

    p.mesh.userData.trail.visible = true;
    p.t += dt / p.dur;
    if(p.t >= 1){
      p.t = 1; p.state = 'grounded'; p.groundT = 0; p.groundWait = 12 + Math.random()*18;
    }
    const from = p.forward ? p.a : p.b, to = p.forward ? p.b : p.a;
    const h = 1 + p.alt*Math.sin(Math.PI*p.t);

    _p1.copy(from).lerp(to, p.t).normalize();
    p.mesh.position.copy(_p1).multiplyScalar(h);
    p.mesh.up.copy(_p1);

    _p2.copy(from).lerp(to, Math.min(p.t+0.01,1)).normalize().multiplyScalar(h);
    p.mesh.lookAt(_p2);
  }
}

// --- корабли и танкеры ---
const SHIP_ROUTES = [
  [[51.9,4.5],[48,-10],[40,-40],[40.7,-74.0]],
  [[31.2,121.5],[33,160],[35,-170],[33.7,-118.2]],
  [[1.3,103.8],[6,90],[6.9,79.8]],
  [[-23.9,-46.3],[-15,-25],[0,-5],[6.5,3.4]],
  [[-33.9,151.2],[-36.8,174.8]]
];
const TANKER_ROUTES = [
  [[26.0,51.0],[26.6,56.5],[12,65],[19.0,72.8]],
  [[29.5,-95.0],[25,-85],[35,-40],[49,-5],[51.9,4.0]],
  [[26.7,50.2],[26.6,56.5],[5,75],[2,101],[1.3,103.8]],
  [[6.5,3.4],[0,-10],[10,-45],[29.5,-95.0]]
];
function makeHullMesh(size, color, isTanker){
  // локальная ось движения — Z (как ожидает lookAt в updateSeaCraft)
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({color, metalness:0.2, roughness:0.6});
  const deckMat = new THREE.MeshStandardMaterial({color:0xffffff, metalness:0.1, roughness:0.7});
  const [W,H,L] = size;
  const hull = new THREE.Mesh(new THREE.BoxGeometry(W,H,L), hullMat);
  g.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(W*0.55, L*0.22, 4), hullMat);
  bow.rotation.x = -Math.PI/2; bow.rotation.z = Math.PI/4;
  bow.position.set(0, 0, L/2 + L*0.06);
  g.add(bow);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(W*0.7,H*2.2,L*0.12), deckMat);
  bridge.position.set(0, H*1.4, -L*0.33);
  g.add(bridge);
  if(isTanker){
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(H*0.15,H*0.15,L*0.6,6), hullMat);
    pipe.rotation.x = Math.PI/2;
    pipe.position.set(0, H*0.8, L*0.05);
    g.add(pipe);
  } else {
    const colors = [0xcc3333,0x3366cc,0xdddd33,0x33aa55];
    for(let i=0;i<5;i++){
      const box = new THREE.Mesh(new THREE.BoxGeometry(W*0.75,H*1.6,L*0.13), new THREE.MeshStandardMaterial({color:colors[i%colors.length]}));
      box.position.set(0, H*1.1, -L*0.28 + i*L*0.15);
      g.add(box);
    }
  }
  return g;
}
function buildSeaCraft(routes, color, size, kindLabel, durMin, durSpan, isTanker){
  return routes.map(wps => {
    const pts = wps.map(([lat,lon]) => latLonToVec3(lat, lon, 1).normalize());
    const mesh = makeHullMesh(size, color, isTanker);
    earth.add(mesh);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(size[2]*1.6, 8, 8), new THREE.MeshBasicMaterial({visible:false}));
    hit.userData = {name: kindLabel, country:'', flag:''};
    mesh.add(hit);
    hitMeshes.push(hit);
    return {pts, mesh, t: Math.random(), dur: (durMin + Math.random()*durSpan)*8, forward: Math.random() < 0.5};
  });
}
const ships   = buildSeaCraft(SHIP_ROUTES,   0xdddddd, [0.010,0.006,0.022], 'Контейнеровоз', 20, 12, false);
const tankers = buildSeaCraft(TANKER_ROUTES, 0x2b2b2b, [0.013,0.008,0.030], 'Танкер',        24, 14, true);
const _s1 = new THREE.Vector3(), _s2 = new THREE.Vector3();
function updateSeaCraft(list, dt){
  for(const s of list){
    s.t += dt / s.dur;
    if(s.t >= 1){ s.t = 0; s.forward = !s.forward; }
    const segCount = s.pts.length - 1;
    const pos = s.forward ? s.t*segCount : (1-s.t)*segCount;
    const idx = Math.min(Math.floor(pos), segCount-1);
    const local = pos - idx;
    const from = s.pts[idx], to = s.pts[idx+1];

    _s1.copy(from).lerp(to, local).normalize();
    s.mesh.position.copy(_s1).multiplyScalar(1.001);

    _s2.copy(from).lerp(to, Math.min(local+0.02,1)).normalize().multiplyScalar(1.001);
    s.mesh.lookAt(_s2);
  }
}
function updateShips(dt){ updateSeaCraft(ships, dt); updateSeaCraft(tankers, dt); }

// --- созвездия ---
const SKY_R = 480;
function raDecToVec3(raH, decDeg, r){ return latLonToVec3(decDeg, raH*15, r); }
const skyGroup = new THREE.Group();
scene.add(skyGroup);
CONSTELLATIONS.forEach(c => {
  const pts = c.stars.map(([ra,dec]) => raDecToVec3(ra, dec, SKY_R));
  skyGroup.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts), new THREE.PointsMaterial({color:0xffffff, size:3, sizeAttenuation:false})));
  const segPts = [];
  c.lines.forEach(([i,j]) => segPts.push(pts[i], pts[j]));
  skyGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segPts), new THREE.LineBasicMaterial({color:0x6699ff, transparent:true, opacity:0.5})));
  // имя созвездия выносим от звёзд: центроид фигуры + смещение по касательной к небесной сфере
  const centroid = new THREE.Vector3();
  pts.forEach(p => centroid.add(p));
  centroid.divideScalar(pts.length).normalize().multiplyScalar(SKY_R);
  const radial = centroid.clone().normalize();
  const worldUp = new THREE.Vector3(0,1,0);
  let tangent = worldUp.clone().sub(radial.clone().multiplyScalar(worldUp.dot(radial)));
  if (tangent.lengthSq() < 1e-6) tangent.set(1,0,0);
  tangent.normalize();
  const div = document.createElement('div');
  div.className = 'city-label planet constellation-label';
  div.textContent = c.name;
  const label = new THREE.CSS2DObject(div);
  label.position.copy(centroid).add(tangent.clone().multiplyScalar(20));
  skyGroup.add(label);

  const alphaPt = pts[c.alphaIdx];
  skyGroup.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints([alphaPt]), new THREE.PointsMaterial({color:0xffcc33, size:7, sizeAttenuation:false})));
  const alphaDiv = document.createElement('div');
  alphaDiv.className = 'city-label star';
  alphaDiv.textContent = c.alpha;
  const alphaLabel = new THREE.CSS2DObject(alphaDiv);
  alphaLabel.position.copy(alphaPt);
  skyGroup.add(alphaLabel);
});

// --- мягкий спрайт-точка для звёзд и Млечного Пути ---
function makeSoftDot(){
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(16,16,0,16,16,16);
  g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.4,'rgba(255,255,255,.6)'); g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0,0,32,32);
  return new THREE.CanvasTexture(c);
}
const softDot = makeSoftDot();

// --- фоновые звёзды по всей небесной сфере (равномерно во все стороны,
//     чтобы небо не зависело от того, какая планета выбрана) ---
function makeBackgroundStars(count, radius){
  const pos = [], col = []; const c = new THREE.Color();
  for(let i=0;i<count;i++){
    const v = new THREE.Vector3(THREE.MathUtils.randFloatSpread(2), THREE.MathUtils.randFloatSpread(2), THREE.MathUtils.randFloatSpread(2));
    if(v.lengthSq() < 1e-6) continue;
    v.normalize().multiplyScalar(radius);
    pos.push(v.x, v.y, v.z);
    const t = Math.random();
    c.setHSL(0.58 - t*0.2, 0.3, 0.6 + Math.random()*0.35);
    col.push(c.r, c.g, c.b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({size:2, map:softDot, vertexColors:true, transparent:true, opacity:.9, depthWrite:false, blending:THREE.AdditiveBlending, sizeAttenuation:false}));
}
skyGroup.add(makeBackgroundStars(4500, SKY_R*0.97));

// --- Млечный Путь: полоса вдоль реальной галактической плоскости ---
// полюс (NGP) и центр Галактики в экваториальных координатах (реальные приближённые значения)
const ngp = raDecToVec3(12.857, 27.13, 1).normalize();
const gc  = raDecToVec3(17.76, -28.94, 1).normalize();
const mwU = gc.clone().sub(ngp.clone().multiplyScalar(gc.dot(ngp))).normalize();
const mwV = new THREE.Vector3().crossVectors(ngp, mwU).normalize();
function makeMilkyWay(count, radius){
  const pos = [], col = []; const c = new THREE.Color();
  for(let i=0;i<count;i++){
    const glon = Math.random()*Math.PI*2;
    const bulge = 1 + 1.6*Math.exp(-(glon*glon)/(2*0.5*0.5)) + 1.6*Math.exp(-((glon-Math.PI*2)**2)/(2*0.5*0.5));
    const spreadDeg = 22/bulge; // у центра Галактики (Стрелец) полоса плотнее и ярче
    const glat = THREE.MathUtils.degToRad(THREE.MathUtils.randFloatSpread(2)*spreadDeg);
    const dir = mwU.clone().multiplyScalar(Math.cos(glat)*Math.cos(glon))
      .add(mwV.clone().multiplyScalar(Math.cos(glat)*Math.sin(glon)))
      .add(ngp.clone().multiplyScalar(Math.sin(glat)));
    dir.normalize().multiplyScalar(radius);
    pos.push(dir.x, dir.y, dir.z);
    c.setHSL(0.62, 0.12, 0.72 + Math.random()*0.25);
    col.push(c.r, c.g, c.b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({size:5, map:softDot, vertexColors:true, transparent:true, opacity:.32, depthWrite:false, blending:THREE.AdditiveBlending, sizeAttenuation:false}));
}
skyGroup.add(makeMilkyWay(9000, SKY_R*0.96));

// --- лог-шкала масштаба (движок в панели <-> колесо мыши) ---
const ZOOM_MIN = 1.08, ZOOM_MAX = 260;
function distToZoomNorm(d){
  return (Math.log(d)-Math.log(ZOOM_MIN))/(Math.log(ZOOM_MAX)-Math.log(ZOOM_MIN));
}
function zoomNormToDist(n){
  return Math.exp(Math.log(ZOOM_MIN) + n*(Math.log(ZOOM_MAX)-Math.log(ZOOM_MIN)));
}
function setCameraZoom(norm){
  const dir = camera.position.clone().sub(controls.target);
  if(dir.lengthSq() < 1e-6) dir.set(0,0,1);
  dir.normalize();
  const d = zoomNormToDist(THREE.MathUtils.clamp(norm,0,1));
  camera.position.copy(controls.target).add(dir.multiplyScalar(d));
  controls.update();
}

// --- Солнечная система ---
const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(3.5, 32, 32), new THREE.MeshBasicMaterial({color:0xffdd77}));
// Солнце на реальном расстоянии Земли (dist=10, та же шкала, что PLANETS[].dist)
const sunDir = new THREE.Vector3(-160, 15, -60).normalize();
const SUN_BASE_DIST = 10;
sunMesh.position.copy(sunDir).multiplyScalar(SUN_BASE_DIST);
scene.add(sunMesh);

function makeGlowSprite(colorInner, colorOuter, size){
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0, colorInner); g.addColorStop(1, colorOuter);
  ctx.fillStyle = g; ctx.fillRect(0,0,128,128);
  const mat = new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c), blending:THREE.AdditiveBlending, transparent:true, depthWrite:false});
  const spr = new THREE.Sprite(mat);
  spr.scale.set(size,size,1);
  return spr;
}
sunMesh.add(makeGlowSprite('rgba(255,245,220,1)', 'rgba(255,150,40,0)', 24));
{
  const div = document.createElement('div');
  div.className = 'city-label planet sun-label';
  div.textContent = 'Солнце';
  const label = new THREE.CSS2DObject(div);
  label.position.set(0, 4.1, 0);
  sunMesh.add(label);
}

sun.position.copy(sunMesh.position).normalize().multiplyScalar(5);
nightMat.uniforms.sunDirection.value.copy(sunMesh.position).normalize();

function makeBandedTexture(colors, size){
  const c = document.createElement('canvas'); c.width = size; c.height = size/2;
  const ctx = c.getContext('2d');
  const bands = 16;
  for(let i=0;i<bands;i++){
    ctx.fillStyle = colors[Math.floor(Math.random()*colors.length)];
    ctx.fillRect(0, i*(c.height/bands), c.width, c.height/bands + 2);
  }
  return new THREE.CanvasTexture(c);
}
function makeRockyTexture(base, dark, size){
  const c = document.createElement('canvas'); c.width = size; c.height = size/2;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base; ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle = dark;
  for(let i=0;i<220;i++){
    ctx.globalAlpha = 0.15 + Math.random()*0.25;
    ctx.beginPath();
    ctx.arc(Math.random()*c.width, Math.random()*c.height, 2+Math.random()*8, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return new THREE.CanvasTexture(c);
}
function planetTexture(p){
  return p.colors.rocky
    ? makeRockyTexture(p.colors.rocky[0], p.colors.rocky[1], 256)
    : makeBandedTexture(p.colors.banded, 512);
}

const solarBodies = [];
PLANETS.forEach(p => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.size, 48, 48), new THREE.MeshPhongMaterial({map:planetTexture(p), shininess:5}));
  mesh.rotation.z = 0.15;
  scene.add(mesh);
  if(p.rings){
    const rc = document.createElement('canvas'); rc.width = 4; rc.height = 128;
    const rctx = rc.getContext('2d');
    for(let y=0;y<128;y++){
      rctx.fillStyle = Math.random() < 0.25 ? 'rgba(120,100,70,0.25)' : 'rgba(203,184,138,0.8)';
      rctx.fillRect(0,y,4,1);
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(p.size*1.4, p.size*2.2, 64), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(rc), side:THREE.DoubleSide, transparent:true}));
    ring.rotation.x = Math.PI/2 - 0.4;
    mesh.add(ring);
  }
  const div = document.createElement('div');
  div.className = 'city-label planet';
  div.textContent = p.name;
  const label = new THREE.CSS2DObject(div);
  label.position.set(0, p.size+0.2, 0);
  mesh.add(label);
  solarBodies.push({mesh, dist:p.dist, speed:p.speed, phase:Math.random()*Math.PI*2, size:p.size, spin:p.spin});
});

// --- Луна ---
const moonMap = loader.load(TEX + 'moon_1024.jpg');
const moon = new THREE.Mesh(new THREE.SphereGeometry(0.27, 32, 32), new THREE.MeshStandardMaterial({map: moonMap, bumpMap: moonMap, bumpScale: 0.01, roughness:1, metalness:0}));
scene.add(moon);
{
  const div = document.createElement('div');
  div.className = 'city-label planet';
  div.textContent = 'Луна';
  const label = new THREE.CSS2DObject(div);
  label.position.set(0, 0.27+0.15, 0);
  moon.add(label);
}
const moonOrbit = {dist:2.6, speed:0.18, incl:0.09, phase:Math.random()*Math.PI*2};
function updateMoon(t){
  const mul = speedMul(moon);
  const a = moonOrbit.phase + t*moonOrbit.speed*mul;
  moon.position.set(Math.cos(a)*moonOrbit.dist, Math.sin(a)*moonOrbit.dist*Math.sin(moonOrbit.incl), Math.sin(a)*moonOrbit.dist*Math.cos(moonOrbit.incl));
}

// --- МКС (детализированная процедурная модель) ---
function buildISS(){
  const g = new THREE.Group();
  const trussMat = new THREE.MeshStandardMaterial({color:0xcfd4d8, metalness:0.6, roughness:0.4});
  const panelMat = new THREE.MeshStandardMaterial({color:0x14203a, metalness:0.3, roughness:0.5, emissive:0x060a16});
  const radMat   = new THREE.MeshStandardMaterial({color:0xf4f4f4, roughness:0.3});
  const modUS    = new THREE.MeshStandardMaterial({color:0xe6e6e6, metalness:0.3, roughness:0.5});
  const modRU    = new THREE.MeshStandardMaterial({color:0xb99a6a, metalness:0.2, roughness:0.6});

  // главная ферма (truss)
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.17,0.003,0.003), trussMat));

  // 8 крыльев солнечных батарей (4 пары вдоль фермы)
  [-0.075,-0.05,0.05,0.075].forEach(x => {
    [-1,1].forEach(side => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.003,0.05,0.017), panelMat);
      wing.position.set(x, 0, side*0.02);
      g.add(wing);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.0006,0.0006,0.02,4), trussMat);
      mast.rotation.x = Math.PI/2;
      mast.position.set(x, 0, side*0.011);
      g.add(mast);
    });
  });

  // белые радиаторы теплоотвода
  [-0.02,0.02].forEach(x => {
    const rad = new THREE.Mesh(new THREE.BoxGeometry(0.002,0.03,0.012), radMat);
    rad.position.set(x, 0.012, 0);
    g.add(rad);
  });

  // цепочка модулей поперёк фермы: Звезда/Заря (RU) → Юнити/Дестини/Гармони (US)
  [
    {len:0.020, r:0.0070, z:-0.030, mat:modRU},
    {len:0.018, r:0.0060, z:-0.012, mat:modRU},
    {len:0.012, r:0.0055, z: 0.002, mat:modUS},
    {len:0.020, r:0.0060, z: 0.018, mat:modUS},
    {len:0.014, r:0.0055, z: 0.034, mat:modUS},
  ].forEach(m => {
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(m.r,m.r,m.len,10), m.mat);
    cyl.rotation.x = Math.PI/2;
    cyl.position.set(0, -0.003, m.z);
    g.add(cyl);
  });

  // купол (Cupola)
  const cupola = new THREE.Mesh(new THREE.SphereGeometry(0.006,10,10,0,Math.PI*2,0,Math.PI/2), modUS);
  cupola.rotation.x = Math.PI;
  cupola.position.set(0, -0.01, 0.034);
  g.add(cupola);

  return g;
}
const issMesh = buildISS();
scene.add(issMesh);
{
  const div = document.createElement('div');
  div.className = 'city-label planet';
  div.textContent = 'МКС';
  const label = new THREE.CSS2DObject(div);
  label.position.set(0, 0.03, 0);
  issMesh.add(label);
  issLabel = label;
  issLabel.element.style.opacity = '0';
}
const issHit = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({visible:false}));
issHit.userData = {name:'МКС', country:'', flag:''};
issMesh.add(issHit);
hitMeshes.push(issHit);
const issOrbit = {radius:1.42, incl:0.9, node:0.4, speed:0.05, phase:0};
function issPosAt(t){ const mul=speedMul(issMesh); return orbitPoint(issOrbit.radius, issOrbit.incl, issOrbit.node, issOrbit.phase + t*issOrbit.speed*mul); }
function updateISS(t){ issMesh.position.copy(issPosAt(t)); }

const cosmonaut = new THREE.Group();
const suitMat = new THREE.MeshStandardMaterial({color:0xf2f2f2, emissive:0x222222});
const visorMat = new THREE.MeshStandardMaterial({color:0x223344, emissive:0x111122, metalness:0.6, roughness:0.3});
const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 10, 10), suitMat);
helmet.position.y = 0.009;
const visor = new THREE.Mesh(new THREE.SphereGeometry(0.0025, 8, 8), visorMat);
visor.position.set(0, 0.009, 0.003);
const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0055, 0.012, 8), suitMat);
const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.008, 0.003), new THREE.MeshStandardMaterial({color:0xdddddd, emissive:0x111111}));
backpack.position.z = -0.0045;
const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.002, 0.01, 6), suitMat);
legs.position.y = -0.011;
const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.011, 6), suitMat);
armL.position.set(0.007, 0, 0); armL.rotation.z = 0.35;
const armR = armL.clone(); armR.position.x = -0.007; armR.rotation.z = -0.35;
cosmonaut.add(helmet, visor, torso, backpack, legs, armL, armR);
cosmonaut.visible = false;
issMesh.add(cosmonaut);
let cosmonautT = 0, cosmonautActive = false;
function updateCosmonaut(dt){
  if(!cosmonautActive) return;
  cosmonautT += dt;
  const cycle = 6;
  const p = Math.min(cosmonautT/cycle, 1);
  const out = Math.sin(p*Math.PI);
  cosmonaut.position.set(0.03 + out*0.05, out*0.02, 0);
  cosmonaut.rotation.z += dt*0.6;
  if(p >= 1){ cosmonautActive = false; cosmonaut.visible = false; }
}

// --- ракеты ---
function makeRocket(){
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({color:0xf0f0f0, metalness:0.35, roughness:0.45});
  const noseMat = new THREE.MeshStandardMaterial({color:0xcc4422, metalness:0.2, roughness:0.5});
  const finMat = new THREE.MeshStandardMaterial({color:0x777777, metalness:0.3, roughness:0.5});
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0035,0.0035,0.026,10), bodyMat);
  body.rotation.x = Math.PI/2;
  g.add(body);
  const noseGeo = new THREE.ConeGeometry(0.0035, 0.014, 10);
  noseGeo.rotateX(Math.PI/2);
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.position.z = 0.02;
  g.add(nose);
  for(let i=0;i<4;i++){
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.0012,0.007,0.007), finMat);
    const ang = i*(Math.PI/2);
    fin.position.set(Math.cos(ang)*0.0035, Math.sin(ang)*0.0035, -0.013);
    fin.rotation.z = ang;
    g.add(fin);
  }
  const flameGeo = new THREE.ConeGeometry(0.0026, 0.016, 8);
  flameGeo.rotateX(-Math.PI/2);
  const flame = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({color:0xffaa33, transparent:true, opacity:0.85}));
  flame.position.z = -0.021;
  g.add(flame);
  g.userData.flame = flame;
  g.visible = false;
  return g;
}
const rocketPool = [];
for(let i=0;i<6;i++) rocketPool.push({mesh:makeRocket(), state:'idle', t:0, from:null});
function launchRocket(r){
  const pad = COSMODROMES[Math.floor(Math.random()*COSMODROMES.length)];
  r.from = latLonToVec3(pad[1], pad[2], 1).normalize();
  earth.add(r.mesh);
  r.mesh.position.copy(r.from);
  r.mesh.visible = true;
  r.mesh.userData.flame.visible = true;
  r.state = 'ascend'; r.t = 0;
}
let rocketTimer = 3 + Math.random()*4;
function updateRockets(dt, t){
  rocketTimer -= dt;
  if(rocketTimer <= 0){
    const idle = rocketPool.find(r => r.state === 'idle');
    if(idle) launchRocket(idle);
    rocketTimer = 6 + Math.random()*8;
  }
  for(const r of rocketPool){
    if(r.state === 'idle') continue;
    if(r.state === 'ascend'){
      r.t += dt/240;
      const h = 1 + r.t*0.42;
      r.mesh.position.copy(r.from).multiplyScalar(h);
      r.mesh.lookAt(r.from.clone().multiplyScalar(h+1));
      if(r.t >= 1){
        r.state = 'transfer'; r.t = 0;
        r.mesh.userData.flame.visible = false;
        r.startPos = r.mesh.position.clone().applyQuaternion(earth.quaternion);
        earth.remove(r.mesh); scene.add(r.mesh); r.mesh.position.copy(r.startPos);
      }
    } else if(r.state === 'transfer'){
      r.t += dt/40;
      const issPos = issPosAt(t);
      r.mesh.position.lerpVectors(r.startPos, issPos, Math.min(r.t,1));
      r.mesh.lookAt(issPos);
      if(r.t >= 1){ r.state = 'docked'; r.dockT = 0; }
    } else if(r.state === 'docked'){
      r.dockT += dt;
      r.mesh.position.copy(issPosAt(t)).add(new THREE.Vector3(-0.05,0,0));
      if(r.dockT > 8){ r.state = 'undock'; r.t = 0; r.mesh.userData.flame.visible = true; r.undockStart = r.mesh.position.clone(); }
    } else if(r.state === 'undock'){
      r.t += dt/20;
      const away = r.undockStart.clone().normalize().multiplyScalar(r.undockStart.length()*(1+r.t*3));
      r.mesh.position.lerpVectors(r.undockStart, away, Math.min(r.t,1));
      if(r.t >= 1){ r.mesh.visible = false; r.mesh.userData.flame.visible = false; scene.remove(r.mesh); r.state = 'idle'; }
    }
  }
}

// --- выбор центра камеры кликом ---
const selectable = [
  {mesh: earth, name:'Земля', size:1, isEarth:true},
  {mesh: moon,  name:'Луна',  size:0.27},
  {mesh: sunMesh, name:'Солнце', size:3.5},
  {mesh: issMesh, name:'МКС', size:0.05},
  ...solarBodies.map((b,i) => ({mesh:b.mesh, name:PLANETS[i].name, size:PLANETS[i].size}))
];
let focused = selectable[0];
function selectTarget(target){
  if(!target || target === focused) return;
  const delta = new THREE.Vector3().subVectors(target.mesh.position, controls.target);
  camera.position.add(delta);
  controls.target.copy(target.mesh.position);
  controls.minDistance = target.isEarth ? 1.08 : target.size*1.4 + 0.05;
  controls.maxDistance = ZOOM_MAX; // единый диапазон для всех целей — движок зума всегда доходит до максимума
  autoRotate = !!target.isEarth;
  focused = target;
  if(ui) ui.setFocused(target.name, speedMul(target.mesh));
}
renderer.domElement.addEventListener('click', (e) => {
  mouseNDC.x = (e.clientX/innerWidth)*2 - 1;
  mouseNDC.y = -(e.clientY/innerHeight)*2 + 1;
  raycaster.setFromCamera(mouseNDC, camera);
  const hits = raycaster.intersectObjects(selectable.map(s => s.mesh), false);
  let target = hits.length ? selectable.find(s => s.mesh === hits[0].object) : null;
  if(!target){
    const issHitRes = raycaster.intersectObject(issHit, false);
    if(issHitRes.length) target = selectable.find(s => s.mesh === issMesh);
  }
  if(target){
    const wasIss = target.mesh === issMesh;
    selectTarget(target);
    if(wasIss && !cosmonautActive){ cosmonautActive = true; cosmonautT = 0; cosmonaut.visible = true; }
  }
});
selectable.forEach(s => {
  const labelObj = s.mesh.children.find(c => c.isCSS2DObject);
  if(labelObj){
    labelObj.element.style.pointerEvents = 'auto';
    labelObj.element.style.cursor = 'pointer';
    labelObj.element.addEventListener('click', () => selectTarget(s));
  }
});

let distScale = 3;
const ui = initUI({
  onSpeedChange(v){ objectSpeed.set(focused.mesh, v); },
  onDistScaleChange(v){ distScale = v; },
  onZoomChange(v){ setCameraZoom(v); },
  onToggle(key, val){
    if(key==='constellations') skyGroup.visible = val;
    else if(key==='planets') solarBodies.forEach(b => b.mesh.visible = val);
    else if(key==='labels') document.body.classList.toggle('hide-labels', !val);
    else VIS[key] = val;
  },
  onPauseToggle(v){ paused = v; }
});

function updatePlanets(t){
  sunMesh.position.copy(sunDir).multiplyScalar(SUN_BASE_DIST*distScale);
  solarBodies.forEach(b => {
    const mul = speedMul(b.mesh);
    const a = b.phase + t*b.speed*mul;
    const d = b.dist*distScale;
    b.mesh.position.set(
      sunMesh.position.x + Math.cos(a)*d,
      sunMesh.position.y,
      sunMesh.position.z + Math.sin(a)*d
    );
    b.mesh.rotation.y = t*b.spin*mul;
  });
}

function updateEarthDetail(){
  const dist = camera.position.length();
  const close = THREE.MathUtils.clamp(1 - (dist - 1.4)/3, 0, 1);
  earthMat.bumpScale = 0.02 + close*0.07;
  earthMat.shininess = 8 + close*45;
  earthMat.specular.setScalar(0.2 + close*0.35);
  cloudMat.opacity = 0.35 + close*0.15;
}

// --- анимация ---
let autoRotate = true;
let idleTimer = 0;
renderer.domElement.addEventListener('mousedown', (e) => { if(e.button === 0) autoRotate = false; });
renderer.domElement.addEventListener('touchstart', () => { autoRotate = false; });
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
    if(!paused) earth.rotation.y += 0.0009*speedMul(earth);
  } else {
    idleTimer++;
    if(idleTimer > 240) autoRotate = true;
  }
  if(!paused) clouds.rotation.y += 0.0013;
  updateSatellites(simTime);
  updatePlanes(effDt);
  updateShips(effDt);
  updatePlanets(simTime);
  updateMoon(simTime);
  updateISS(simTime);
  updateCosmonaut(effDt);
  updateRockets(effDt, simTime);
  if(!focused.isEarth){
    const delta = new THREE.Vector3().subVectors(focused.mesh.position, controls.target);
    camera.position.add(delta);
    controls.target.add(delta);
  }
  controls.update();
  // небесная сфера всегда центрирована на камере — звёзды бесконечно далеко,
  // видны одинаково из любой точки Солнечной системы под любым углом
  skyGroup.position.copy(camera.position);
  updateMarkers();
  updateEarthDetail();
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
});
