// Луна: меш + орбита вокруг Земли. updateMoon(t) двигает её по орбите.

import { scene } from './scene-core.js';
import { loader, TEX } from './earth.js';
import { hitMeshes, speedMul } from './state.js';

const moonMap = loader.load(TEX + 'moon_1024.jpg');
export const moon = new THREE.Mesh(new THREE.SphereGeometry(0.27, 32, 32), new THREE.MeshStandardMaterial({map: moonMap, bumpMap: moonMap, bumpScale: 0.01, roughness:1, metalness:0}));
scene.add(moon);
{
  const div = document.createElement('div');
  div.className = 'city-label planet';
  div.textContent = 'Луна';
  const label = new THREE.CSS2DObject(div);
  label.position.set(0, 0.27+0.15, 0);
  moon.add(label);
  const moonHit = new THREE.Mesh(new THREE.SphereGeometry(0.27*1.5, 8, 8), new THREE.MeshBasicMaterial({visible:false}));
  moonHit.userData = {
    name: 'Луна', diameterKm: 3474, distEarthKm: 384400,
    distSunMln: 149.6, moons: 0, period: '27.3 сут'
  };
  moon.add(moonHit);
  hitMeshes.push(moonHit);
}
const moonOrbit = {dist:2.6, speed:0.18, incl:0.09, phase:Math.random()*Math.PI*2};
export function updateMoon(t){
  const mul = speedMul(moon);
  const a = moonOrbit.phase + t*moonOrbit.speed*mul;
  moon.position.set(Math.cos(a)*moonOrbit.dist, Math.sin(a)*moonOrbit.dist*Math.sin(moonOrbit.incl), Math.sin(a)*moonOrbit.dist*Math.cos(moonOrbit.incl));
}
