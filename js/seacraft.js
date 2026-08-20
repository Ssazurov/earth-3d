import { earth } from './earth.js';
import { latLonToVec3 } from './geo.js';
import { hitMeshes, SETTINGS } from './state.js';

// --- корабли и танкеры ---
const SHIP_ROUTES = [
  {from:{name:'Роттердам',country:'Нидерланды'}, to:{name:'Нью-Йорк',country:'США'},
    wps:[[51.9,4.5],[48,-10],[40,-40],[40.7,-74.0]], vessel:'Maersk Triton', cargo:'Контейнеры (смешанный груз)'},
  {from:{name:'Шанхай',country:'Китай'}, to:{name:'Лос-Анджелес',country:'США'},
    wps:[[31.2,121.5],[33,160],[35,-170],[33.7,-118.2]], vessel:'Shanghai Pioneer', cargo:'Контейнеры (электроника)'},
  {from:{name:'Сингапур',country:'Сингапур'}, to:{name:'Коломбо',country:'Шри-Ланка'},
    wps:[[1.3,103.8],[6,90],[6.9,79.8]], vessel:'Straits Voyager', cargo:'Контейнеры (текстиль)'},
  {from:{name:'Сантос',country:'Бразилия'}, to:{name:'Лагос',country:'Нигерия'},
    wps:[[-23.9,-46.3],[-15,-25],[0,-5],[6.5,3.4]], vessel:'Santos Carrier', cargo:'Контейнеры (сельхозпродукция)'},
  {from:{name:'Сидней',country:'Австралия'}, to:{name:'Окленд',country:'Новая Зеландия'},
    wps:[[-33.9,151.2],[-36.8,174.8]], vessel:'Tasman Express', cargo:'Контейнеры (промышленные товары)'}
];
const TANKER_ROUTES = [
  {from:{name:'Рас-Таннура',country:'Саудовская Аравия'}, to:{name:'Мумбаи',country:'Индия'},
    wps:[[26.0,51.0],[26.6,56.5],[12,65],[19.0,72.8]], vessel:'Ras Tanura Star', cargo:'Сырая нефть'},
  {from:{name:'Хьюстон',country:'США'}, to:{name:'Роттердам',country:'Нидерланды'},
    wps:[[29.5,-95.0],[25,-85],[35,-40],[49,-5],[51.9,4.0]], vessel:'Gulf Voyager', cargo:'Нефтепродукты'},
  {from:{name:'Рас-Таннура',country:'Саудовская Аравия'}, to:{name:'Сингапур',country:'Сингапур'},
    wps:[[26.7,50.2],[26.6,56.5],[5,75],[2,101],[1.3,103.8]], vessel:'Arabian Falcon', cargo:'Сжиженный природный газ'},
  {from:{name:'Бонни',country:'Нигерия'}, to:{name:'Хьюстон',country:'США'},
    wps:[[6.5,3.4],[0,-10],[10,-45],[29.5,-95.0]], vessel:'Niger Delta Trader', cargo:'Сырая нефть'}
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
  return routes.map(route => {
    const pts = route.wps.map(([lat,lon]) => latLonToVec3(lat, lon, 1).normalize());
    const mesh = makeHullMesh(size, color, isTanker);
    earth.add(mesh);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(size[2]*1.6, 8, 8), new THREE.MeshBasicMaterial({visible:false}));
    mesh.add(hit);
    hitMeshes.push(hit);
    const s = {pts, mesh, hit, route, t: Math.random(), dur: (durMin + Math.random()*durSpan)*3 / SETTINGS.seacraftSpeedMul, forward: Math.random() < 0.5};
    hit.userData = {
      name: route.vessel || kindLabel, country: route.from.country,
      from: `${route.from.name} (${route.from.country})`, to: `${route.to.name} (${route.to.country})`,
      cargo: route.cargo, craft: s
    };
    return s;
  });
}
const ships   = buildSeaCraft(SHIP_ROUTES,   0xdddddd, [0.010,0.006,0.022], 'Контейнеровоз', 20, 12, false);
const tankers = buildSeaCraft(TANKER_ROUTES, 0x2b2b2b, [0.013,0.008,0.030], 'Танкер',        24, 14, true);
const _s1 = new THREE.Vector3(), _s2 = new THREE.Vector3();
function updateSeaCraft(list, dt){
  for(const s of list){
    s.t += dt / s.dur;
    if(s.t >= 1){ s.t = 0; s.forward = !s.forward; }
    const dep = s.forward ? s.route.from : s.route.to, arr = s.forward ? s.route.to : s.route.from;
    s.hit.userData.country = dep.country;
    s.hit.userData.from = `${dep.name} (${dep.country})`;
    s.hit.userData.to = `${arr.name} (${arr.country})`;
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
export function updateShips(dt){ updateSeaCraft(ships, dt); updateSeaCraft(tankers, dt); }
