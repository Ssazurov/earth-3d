// Астероид: меш (icosahedron + шум) + затухающий хвост из частиц.
// Логика пролёта (движение, таймер раз в минуту) — отдельная задача (issue #13).

function makeAsteroidTexture(size){
  const c = document.createElement('canvas'); c.width = size; c.height = size/2;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#6b6258'; ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle = '#3c362f';
  for(let i=0;i<420;i++){
    ctx.globalAlpha = 0.15 + Math.random()*0.35;
    ctx.beginPath();
    ctx.arc(Math.random()*c.width, Math.random()*c.height, 1+Math.random()*6, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return new THREE.CanvasTexture(c);
}

function makeAsteroidGeometry(size){
  const geo = new THREE.IcosahedronGeometry(size, 3);
  const pos = geo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    const n = v.clone().normalize();
    const noise = 0.78 + Math.random()*0.44; // неровная форма, ±22%
    v.copy(n.multiplyScalar(v.length()*noise));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

const TAIL_COUNT = 260;
const TAIL_LENGTH = 9; // в единицах size (size=0.5 -> ~4.5)

function makeAsteroidTail(size){
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(TAIL_COUNT*3);
  const sizes = new Float32Array(TAIL_COUNT);
  const opac = new Float32Array(TAIL_COUNT);
  for(let i=0;i<TAIL_COUNT;i++){
    positions[i*3]=0; positions[i*3+1]=0; positions[i*3+2]=0;
    sizes[i]=0; opac[i]=0;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions,3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes,1));
  geo.setAttribute('aOpacity', new THREE.BufferAttribute(opac,1));

  const c = document.createElement('canvas'); c.width=32; c.height=32;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(16,16,0,16,16,16);
  g.addColorStop(0,'rgba(255,235,200,1)');
  g.addColorStop(1,'rgba(255,235,200,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,32,32);
  const dotTex = new THREE.CanvasTexture(c);

  const mat = new THREE.PointsMaterial({
    map: dotTex, size: size*0.9, sizeAttenuation:true,
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    vertexColors:false
  });
  const points = new THREE.Points(geo, mat);
  points.userData.length = TAIL_LENGTH*size;
  points.userData.count = TAIL_COUNT;
  points.frustumCulled = false;
  return points;
}

// Заполняет хвост частицами вдоль направления dir (единичный вектор,
// "откуда прилетел" астероид), с затуханием size/opacity к концу хвоста.
function updateAsteroidTail(tail, dir){
  const pos = tail.geometry.attributes.position;
  const sizeAttr = tail.geometry.attributes.aSize;
  const n = tail.userData.count;
  const len = tail.userData.length;
  for(let i=0;i<n;i++){
    const t = i/(n-1); // 0=у ядра, 1=конец хвоста
    const jitter = (Math.random()-0.5)*0.15*t;
    const dist = t*len;
    pos.setXYZ(i, dir.x*dist + jitter, dir.y*dist + jitter, dir.z*dist + jitter);
    sizeAttr.setX(i, (1-t)); // затухание размера к концу
  }
  pos.needsUpdate = true;
  sizeAttr.needsUpdate = true;
  tail.material.opacity = 0.9;
}

export function createAsteroid(size = 0.5){
  const geo = makeAsteroidGeometry(size);
  const tex = makeAsteroidTexture(512);
  const mat = new THREE.MeshPhongMaterial({map:tex, shininess:2, bumpMap:tex, bumpScale:0.03});
  const mesh = new THREE.Mesh(geo, mat);
  const tail = makeAsteroidTail(size);
  mesh.add(tail);
  mesh.visible = false; // включается логикой пролёта (issue #13)
  updateAsteroidTail(tail, new THREE.Vector3(-1,0,0));
  return {mesh, tail, size};
}
