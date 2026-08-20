import { scene } from './scene-core.js';
import { orbitPoint } from './geo.js';
import { hitMeshes, SETTINGS } from './state.js';
import { SATELLITES } from './data.js';

// --- спутники ---
const satGroup = new THREE.Group();
scene.add(satGroup);
const satellites = [];
for(let i=0;i<6;i++){
  const radius = 1.35 + Math.random()*0.35;
  const incl = Math.random()*Math.PI;
  const node = Math.random()*Math.PI*2;
  const speed = (0.15 + Math.random()*0.25) * SETTINGS.satelliteSpeedMul;
  const phase = Math.random()*Math.PI*2;

  const pts = [];
  for(let a=0;a<=64;a++) pts.push(orbitPoint(radius, incl, node, (a/64)*Math.PI*2));
  const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color:0x3399ff, transparent:true, opacity:0.25}));
  satGroup.add(line);

  const sat = makeSatelliteMesh();
  satGroup.add(sat);
  const info = SATELLITES[i % SATELLITES.length];
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), new THREE.MeshBasicMaterial({visible:false}));
  hit.userData = {
    name: info[0], country: info[1], flag: info[2],
    purpose: info[3], launchDate: info[4], eolDate: info[5]
  };
  sat.add(hit);
  hitMeshes.push(hit);
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
export function updateSatellites(t){
  for(const s of satellites){
    const pos = orbitPoint(s.radius, s.incl, s.node, s.phase + t*s.speed);
    s.sat.position.copy(pos);
    s.sat.lookAt(0,0,0);
  }
}
