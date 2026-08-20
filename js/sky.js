import { scene } from './scene-core.js';
import { latLonToVec3, raDecToVec3 } from './geo.js';
import { hitMeshes } from './state.js';
import { CONSTELLATIONS } from './data.js';

// Звёздное небо: созвездия (точки+линии+подписи+альфа-звёзды с тултипом),
// равномерный фон звёзд по всей сфере, полоса Млечного Пути.
// skyGroup центрируется на камере каждый кадр в animate() (main.js) —
// поэтому небо не имеет видимой границы при любом отдалении.

// --- созвездия ---
const SKY_R = 480;
export const skyGroup = new THREE.Group();
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

  const alphaHit = new THREE.Mesh(new THREE.SphereGeometry(6, 8, 8), new THREE.MeshBasicMaterial({visible:false}));
  alphaHit.position.copy(alphaPt);
  alphaHit.userData = {
    name: c.alpha, constellation: c.name,
    alphaType: c.alphaType, alphaDistLy: c.alphaDistLy, alphaMag: c.alphaMag
  };
  skyGroup.add(alphaHit);
  hitMeshes.push(alphaHit);
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
