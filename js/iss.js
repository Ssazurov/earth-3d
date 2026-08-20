// МКС (процедурная модель) + орбита + анимация космонавта в открытом космосе.

import { scene } from './scene-core.js';
import { hitMeshes, speedMul } from './state.js';
import { orbitPoint } from './geo.js';
import { setIssLabel } from './markers.js';

function buildISS(){
  const g = new THREE.Group();
  const trussMat = new THREE.MeshStandardMaterial({color:0xcfd4d8, metalness:0.6, roughness:0.4});
  const panelMat = new THREE.MeshStandardMaterial({color:0x14203a, metalness:0.3, roughness:0.5, emissive:0x060a16});
  const radMat   = new THREE.MeshStandardMaterial({color:0xf4f4f4, roughness:0.3});
  const modUS    = new THREE.MeshStandardMaterial({color:0xe6e6e6, metalness:0.3, roughness:0.5});
  const modRU    = new THREE.MeshStandardMaterial({color:0xb99a6a, metalness:0.2, roughness:0.6});

  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.17,0.003,0.003), trussMat));

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

  [-0.02,0.02].forEach(x => {
    const rad = new THREE.Mesh(new THREE.BoxGeometry(0.002,0.03,0.012), radMat);
    rad.position.set(x, 0.012, 0);
    g.add(rad);
  });

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

  const cupola = new THREE.Mesh(new THREE.SphereGeometry(0.006,10,10,0,Math.PI*2,0,Math.PI/2), modUS);
  cupola.rotation.x = Math.PI;
  cupola.position.set(0, -0.01, 0.034);
  g.add(cupola);

  return g;
}
export const issMesh = buildISS();
scene.add(issMesh);
{
  const div = document.createElement('div');
  div.className = 'city-label planet';
  div.textContent = 'МКС';
  const label = new THREE.CSS2DObject(div);
  label.position.set(0, 0.03, 0);
  issMesh.add(label);
  label.element.style.opacity = '0';
  setIssLabel(label);
}
const issHit = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({visible:false}));
issHit.userData = {name:'МКС', country:'', flag:''};
issMesh.add(issHit);
hitMeshes.push(issHit);
const issOrbit = {radius:1.42, incl:0.9, node:0.4, speed:0.05, phase:0};
export function issPosAt(t){ const mul=speedMul(issMesh); return orbitPoint(issOrbit.radius, issOrbit.incl, issOrbit.node, issOrbit.phase + t*issOrbit.speed*mul); }
export function updateISS(t){ issMesh.position.copy(issPosAt(t)); }

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
export let cosmonautActive = false;
export function setCosmonautActive(v){ cosmonautActive = v; cosmonaut.visible = v; if(v) cosmonautT = 0; }
let cosmonautT = 0;
export function updateCosmonaut(dt){
  if(!cosmonautActive) return;
  cosmonautT += dt;
  const cycle = 6;
  const p = Math.min(cosmonautT/cycle, 1);
  const out = Math.sin(p*Math.PI);
  cosmonaut.position.set(0.03 + out*0.05, out*0.02, 0);
  cosmonaut.rotation.z += dt*0.6;
  if(p >= 1){ cosmonautActive = false; cosmonaut.visible = false; }
}
