import { earth } from './earth.js';
import { latLonToVec3 } from './geo.js';
import { hitMeshes, SETTINGS } from './state.js';
import { CITIES } from './data.js';

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
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshBasicMaterial({visible:false}));
  mesh.add(hit);
  hitMeshes.push(hit);
  return {a, b, mesh, hit, cityFrom: from, cityTo: to, t: 0, dur: (8 + Math.random()*4)*6 / SETTINGS.planeSpeedMul, alt: 0.12, forward: true,
    state: 'grounded', groundT: Math.random()*10, groundWait: 12+Math.random()*18, blink: Math.random()*Math.PI*2};
});
// самолётов в воздухе одновременно должно быть 3–5: часть флота стартует уже в полёте
const PLANES_MIN_AIRBORNE = 3, PLANES_MAX_AIRBORNE = 5;
{
  const initialAirborne = PLANES_MIN_AIRBORNE + Math.floor(Math.random()*(PLANES_MAX_AIRBORNE-PLANES_MIN_AIRBORNE+1));
  const order = planes.map((_,i)=>i).sort(()=>Math.random()-0.5).slice(0, Math.min(initialAirborne, planes.length));
  order.forEach(i => { planes[i].state = 'flying'; planes[i].t = Math.random(); });
}
const _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3();
export function updatePlanes(dt){
  for(const p of planes){
    const cityFrom = p.forward ? p.cityFrom : p.cityTo;
    const cityTo = p.forward ? p.cityTo : p.cityFrom;
    p.hit.userData = {
      name: 'Авиарейс', flag: cityFrom[4], country: cityFrom[3],
      from: `${cityFrom[0]} (${cityFrom[3]})`, to: `${cityTo[0]} (${cityTo[3]})`
    };
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
        const airborne = planes.filter(x => x.state === 'flying').length;
        if(airborne >= PLANES_MAX_AIRBORNE){
          p.groundWait = p.groundT + 3 + Math.random()*5; // в воздухе уже максимум — ждём ещё
        } else {
          p.state = 'flying'; p.t = 0; p.forward = !p.forward;
        }
      }
      continue;
    }

    p.mesh.userData.trail.visible = true;
    p.t += dt / p.dur;
    if(p.t >= 1){
      const airborne = planes.filter(x => x.state === 'flying').length;
      if(airborne - 1 < PLANES_MIN_AIRBORNE){
        p.t = 0; p.forward = !p.forward; // не даём числу в воздухе упасть ниже минимума — разворот без посадки
      } else {
        p.t = 1; p.state = 'grounded'; p.groundT = 0; p.groundWait = 12 + Math.random()*18;
      }
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
