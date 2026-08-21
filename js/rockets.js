// Ракеты: старт с космодрома → стыковка с МКС → возврат капсулы с парашютом.

import { scene } from './scene-core.js';
import { earth } from './earth.js';
import { hitMeshes, currentTransportSpeed, SETTINGS } from './state.js';
import { latLonToVec3 } from './geo.js';
import { COSMODROMES } from './data.js';
import { showCountdownText, hideCountdown } from './tooltip.js';
import { issPosAt } from './iss.js';

const LAUNCH_WORDS = {
  'Россия': 'Поехали!', 'Казахстан': 'Кеттik!', 'США': 'Liftoff!', 'Франция': 'Allumage !'
};
function launchWordFor(country){ return LAUNCH_WORDS[country] || 'Поехали!'; }
const CREW_SURNAMES = {
  'Россия':     ['Иванов','Петров','Соколов','Кузнецов','Морозов','Волков','Новиков','Егоров'],
  'Казахстан':  ['Нурланов','Абенов','Жаксыбеков','Сатпаев','Сериков','Токтаров'],
  'США':        ['Smith','Johnson','Miller','Davis','Wilson','Anderson','Clark'],
  'Франция':    ['Dupont','Martin','Bernard','Petit','Robert','Moreau']
};
function randomInitial(cyrillic){
  const letters = cyrillic ? 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ' : 'ABCDEFGHJKLMNOPRSTVW';
  return letters[Math.floor(Math.random()*letters.length)];
}
function makeCrew(country){
  const cyrillic = country === 'Россия' || country === 'Казахстан';
  const pool = (CREW_SURNAMES[country] || CREW_SURNAMES['Россия']).slice();
  const n = 2 + Math.floor(Math.random()*2);
  const crew = [];
  for(let i=0;i<n && pool.length;i++){
    const surname = pool.splice(Math.floor(Math.random()*pool.length),1)[0];
    crew.push(`${surname} ${randomInitial(cyrillic)}.${randomInitial(cyrillic)}.`);
  }
  return crew;
}
let _chuteTex = null;
function getParachuteTexture(){
  if(_chuteTex) return _chuteTex;
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32,6,2,32,6,58);
  g.addColorStop(0,'#fff176'); g.addColorStop(0.5,'#ff7043'); g.addColorStop(1,'#b71c1c');
  ctx.fillStyle = g; ctx.fillRect(0,0,64,64);
  _chuteTex = new THREE.CanvasTexture(c);
  return _chuteTex;
}
function makeRocket(){
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({color:0xf0f0f0, metalness:0.35, roughness:0.45});
  const noseMat = new THREE.MeshStandardMaterial({color:0xcc4422, metalness:0.2, roughness:0.5});
  const finMat = new THREE.MeshStandardMaterial({color:0x777777, metalness:0.3, roughness:0.5});
  const rocketParts = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0035,0.0035,0.026,10), bodyMat);
  body.rotation.x = Math.PI/2;
  rocketParts.add(body);
  const noseGeo = new THREE.ConeGeometry(0.0035, 0.014, 10);
  noseGeo.rotateX(Math.PI/2);
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.position.z = 0.02;
  rocketParts.add(nose);
  for(let i=0;i<4;i++){
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.0012,0.007,0.007), finMat);
    const ang = i*(Math.PI/2);
    fin.position.set(Math.cos(ang)*0.0035, Math.sin(ang)*0.0035, -0.013);
    fin.rotation.z = ang;
    rocketParts.add(fin);
  }
  const flameGeo = new THREE.ConeGeometry(0.0026, 0.016, 8);
  flameGeo.rotateX(-Math.PI/2);
  const flame = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({color:0xffaa33, transparent:true, opacity:0.85}));
  flame.position.z = -0.021;
  rocketParts.add(flame);
  g.add(rocketParts);

  const fireball = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), new THREE.MeshBasicMaterial({color:0xff7733}));
  fireball.visible = false;
  g.add(fireball);

  const capsule = new THREE.Mesh(new THREE.ConeGeometry(0.003, 0.006, 8), bodyMat);
  capsule.rotation.x = Math.PI/2; // align cone axis with descent direction (was sideways)
  capsule.visible = false;
  g.add(capsule);
  const WIND_TILT = THREE.MathUtils.degToRad(17); // chute drifts ahead of capsule
  const chute = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8, 0, Math.PI*2, 0, Math.PI*0.42), new THREE.MeshBasicMaterial({map:getParachuteTexture(), side:THREE.DoubleSide}));
  chute.position.set(0.02*Math.sin(WIND_TILT), 0, 0.02*Math.cos(WIND_TILT));
  chute.rotation.x = Math.PI/2;
  chute.rotation.y = -WIND_TILT;
  chute.visible = false;
  g.add(chute);

  const cosmo = new THREE.Group();
  const cosmoMat = new THREE.MeshStandardMaterial({color:0xffffff});
  const chead = new THREE.Mesh(new THREE.SphereGeometry(0.0018,8,8), cosmoMat);
  chead.position.y = 0.004;
  const cbody = new THREE.Mesh(new THREE.CylinderGeometry(0.0016,0.002,0.006,6), cosmoMat);
  cosmo.add(chead, cbody);
  cosmo.position.z = 0.006;
  cosmo.visible = false;
  g.add(cosmo);

  g.userData = {flame, fireball, capsule, chute, cosmo, rocketParts};
  g.visible = false;
  return g;
}
export const rocketPool = [];
for(let i=0;i<SETTINGS.rocketPoolSize;i++){
  const mesh = makeRocket();
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), new THREE.MeshBasicMaterial({visible:false}));
  hit.userData = {name:'Ракета', country:'', flag:'', from:'', to:''};
  mesh.add(hit);
  hitMeshes.push(hit);
  rocketPool.push({mesh, hit, state:'idle', t:0, from:null});
}
let cosmoIdx = 0;
function nextCosmodrome(){ const pad = COSMODROMES[cosmoIdx % COSMODROMES.length]; cosmoIdx++; return pad; }

let activeCountdownRocket = null;
const ROCKET_SPEED_MUL = 5;

export function launchRocket(r, pad){
  pad = pad || nextCosmodrome();
  r.from = latLonToVec3(pad[1], pad[2], 1).normalize();
  r.padLat = pad[1]; r.padLon = pad[2];
  earth.add(r.mesh);
  r.mesh.position.copy(r.from);
  r.mesh.lookAt(r.from.clone().multiplyScalar(2));
  r.mesh.visible = true;
  const u = r.mesh.userData;
  u.rocketParts.visible = true; u.flame.visible = false;
  u.fireball.visible = false; u.capsule.visible = false; u.chute.visible = false; u.cosmo.visible = false;
  r.state = 'countdown'; r.t = 0; r.lastNum = null;
  r.launchWord = launchWordFor(pad[3]);
  r.crew = makeCrew(pad[3]);
  r.launchTime = new Date();
  r.landTime = null;
  activeCountdownRocket = r;
  r.hit.userData = {
    name: 'Ракета', flag: pad[4], country: pad[3],
    from: `${pad[0]} (${pad[3]})`, to: 'МКС (околоземная орбита)',
    crew: r.crew.join(', '), launchTime: r.launchTime
  };
}
export function updateRockets(dt, t){
  const mdt = dt * currentTransportSpeed(earth) * ROCKET_SPEED_MUL;
  for(const r of rocketPool){
    if(r.state === 'idle') continue;
    const u = r.mesh.userData;
    if(r.state === 'countdown'){
      r.t += dt;
      if(r.t < 5){
        const num = 5 - Math.floor(r.t);
        if(num !== r.lastNum){ r.lastNum = num; showCountdownText(String(num)); }
        if(num <= 3) u.flame.visible = true;
      } else if(r.t < 6){
        if(r.lastNum !== 0){ r.lastNum = 0; showCountdownText(r.launchWord); }
      } else {
        if(activeCountdownRocket === r){ hideCountdown(); activeCountdownRocket = null; }
        r.state = 'ascend'; r.t = 0;
      }
    } else if(r.state === 'ascend'){
      r.t += mdt/120*SETTINGS.ascendMul;
      const h = 1 + r.t*0.42;
      r.mesh.position.copy(r.from).multiplyScalar(h);
      r.mesh.lookAt(r.from.clone().multiplyScalar(h+1));
      if(r.t >= 1){
        r.state = 'transfer'; r.t = 0;
        u.flame.visible = false;
        r.startPos = r.mesh.position.clone().applyQuaternion(earth.quaternion);
        earth.remove(r.mesh); scene.add(r.mesh); r.mesh.position.copy(r.startPos);
      }
    } else if(r.state === 'transfer'){
      r.t += mdt/40;
      const issPos = issPosAt(t);
      r.mesh.position.lerpVectors(r.startPos, issPos, Math.min(r.t,1));
      r.mesh.lookAt(issPos);
      if(r.t >= 1){ r.state = 'docked'; r.dockT = 0; }
    } else if(r.state === 'docked'){
      r.dockT += dt;
      r.mesh.position.copy(issPosAt(t)).add(new THREE.Vector3(-0.05,0,0));
      if(r.dockT > 10){
        r.state = 'undock'; r.t = 0; u.flame.visible = true;
        r.undockStart = r.mesh.position.clone();
      }
    }
 else if(r.state === 'undock'){
      r.t += mdt/16;
      const away = r.undockStart.clone().normalize().multiplyScalar(r.undockStart.length()*(1+r.t*0.8));
      r.mesh.position.lerpVectors(r.undockStart, away, Math.min(r.t,1));
      if(r.t >= 1){
        r.state = 'reentry'; r.t = 0;
        u.flame.visible = false;
        r.reentryStart = r.mesh.position.clone();
        const offAngle = THREE.MathUtils.degToRad(4 + Math.random()*5);
        const axis = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
        r.landLocal = r.from.clone().applyQuaternion(new THREE.Quaternion().setFromAxisAngle(axis, offAngle));
      }
    } else if(r.state === 'reentry'){
      r.t += mdt/70;
      const target = r.landLocal.clone().applyQuaternion(earth.quaternion).multiplyScalar(1.25);
      r.mesh.position.lerpVectors(r.reentryStart, target, Math.min(r.t,1));
      r.mesh.lookAt(target);
      if(r.t >= 1){
        r.state = 'burn'; r.t = 0;
        u.rocketParts.visible = false; u.fireball.visible = true;
        u.fireball.scale.setScalar(1);
        r.burnStart = r.mesh.position.clone();
      }
    } else if(r.state === 'burn'){
      r.t += mdt/4;
      const target = r.landLocal.clone().applyQuaternion(earth.quaternion).multiplyScalar(1.05);
      r.mesh.position.lerpVectors(r.burnStart, target, Math.min(r.t,1));
      r.mesh.lookAt(target);
      u.fireball.scale.setScalar(1 - 0.5*Math.min(r.t,1));
      if(r.t >= 1){
        r.state = 'parachute'; r.t = 0;
        u.fireball.visible = false; u.capsule.visible = true; u.chute.visible = true;
        r.chuteStart = r.mesh.position.clone();
      }
    }
 else if(r.state === 'parachute'){
      r.t += mdt/9*SETTINGS.parachuteMul;
      const target = r.landLocal.clone().applyQuaternion(earth.quaternion).multiplyScalar(1.001);
      r.mesh.position.lerpVectors(r.chuteStart, target, Math.min(r.t,1));
      r.mesh.lookAt(target);
      if(r.t >= 1){
        r.state = 'landed'; r.t = 0;
        u.chute.visible = false; u.cosmo.visible = true;
        scene.remove(r.mesh);
        r.mesh.position.copy(r.landLocal).multiplyScalar(1.001);
        r.mesh.lookAt(r.landLocal.clone().multiplyScalar(1.02));
        earth.add(r.mesh);
        r.landTime = new Date();
        r.hit.userData = {
          name: 'Спускаемая капсула', flag: r.hit.userData.flag, country: r.hit.userData.country,
          from: r.hit.userData.from, to: r.hit.userData.to,
          crew: r.hit.userData.crew, launchTime: r.hit.userData.launchTime, landTime: r.landTime
        };
      }
    } else if(r.state === 'landed'){
      // ничего не делаем — капсула и космонавт остаются до перезагрузки окна
    }
  }
}
