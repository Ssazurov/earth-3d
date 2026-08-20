// Солнце и планеты Солнечной системы (не Земля/Луна — они в earth.js/moon.js).
// updatePlanets(t) двигает Солнце и планеты по орбите с учётом distScale.

import { scene, sun } from './scene-core.js';
import { nightMat } from './earth.js';
import { hitMeshes, globalSpeed, distScale } from './state.js';
import { PLANETS } from './data.js';

export const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(3.5, 32, 32), new THREE.MeshBasicMaterial({color:0xffdd77}));
const sunDir = new THREE.Vector3(-160, 15, -60).normalize();
export const SUN_BASE_DIST = 10;
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
  const sunHit = new THREE.Mesh(new THREE.SphereGeometry(3.5*1.3, 8, 8), new THREE.MeshBasicMaterial({visible:false}));
  sunHit.userData = {
    name: 'Солнце', diameterKm: 1392700, distEarthMinMln: 149.6,
    rotPeriod: '~25 сут (экватор)', tempC: '~5500°C (поверхность)'
  };
  sunMesh.add(sunHit);
  hitMeshes.push(sunHit);
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

export const solarBodies = [];
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
  const hit = new THREE.Mesh(new THREE.SphereGeometry(p.size*1.5, 8, 8), new THREE.MeshBasicMaterial({visible:false}));
  hit.userData = {
    name: p.name, diameterKm: p.diameterKm, distSunMln: p.distSunMln,
    distEarthMinMln: p.distEarthMinMln, moons: p.moons, period: p.period
  };
  mesh.add(hit);
  hitMeshes.push(hit);
  solarBodies.push({mesh, dist:p.dist, speed:p.speed, phase:Math.random()*Math.PI*2, size:p.size, spin:p.spin});
});

export function updatePlanets(t){
  sunMesh.position.copy(sunDir).multiplyScalar(SUN_BASE_DIST*distScale);
  solarBodies.forEach(b => {
    const a = b.phase + t*b.speed*globalSpeed;
    const d = b.dist*distScale;
    b.mesh.position.set(
      sunMesh.position.x + Math.cos(a)*d,
      sunMesh.position.y,
      sunMesh.position.z + Math.sin(a)*d
    );
    b.mesh.rotation.y = t*b.spin*globalSpeed;
  });
}
