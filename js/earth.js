// Меш Земли: дневная/ночная текстуры, облака, атмосферное свечение.
// updateEarthDetail() усиливает детализацию (bump/shininess) при приближении камеры.

import { scene, renderer } from './scene-core.js';

// --- текстуры Земли ---
export const loader = new THREE.TextureLoader();
export const TEX = 'https://threejs.org/examples/textures/planets/';
export const TEX4K = 'https://raw.githubusercontent.com/turban/webgl-earth/master/images/';
const dayMap   = loader.load(TEX4K + '2_no_clouds_4k.jpg');
const bumpMap  = loader.load(TEX4K + 'elev_bump_4k.jpg');
const specMap  = loader.load(TEX4K + 'water_4k.png');
const cloudMap = loader.load(TEX4K + 'fair_clouds_4k.png');
[dayMap, bumpMap, specMap, cloudMap].forEach(t => { t.anisotropy = renderer.capabilities.getMaxAnisotropy(); });

const earthGeo = new THREE.SphereGeometry(1, 256, 256);
export const earthMat = new THREE.MeshPhongMaterial({
  map: dayMap, bumpMap: bumpMap, bumpScale: 0.02,
  specularMap: specMap, specular: new THREE.Color(0x333333), shininess: 8
});
export const earth = new THREE.Mesh(earthGeo, earthMat);
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
export const cloudMat = new THREE.MeshPhongMaterial({map: cloudMap, transparent: true, opacity: 0.35, depthWrite: false});
export const clouds = new THREE.Mesh(cloudGeo, cloudMat);
scene.add(clouds);

const nightMap = loader.load(TEX + 'earth_lights_2048.png');
export const nightMat = new THREE.ShaderMaterial({
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
export const glow = new THREE.Mesh(new THREE.SphereGeometry(1.15, 64, 64), glowMat);
scene.add(glow);

export function updateEarthDetail(camera){
  const dist = camera.position.length();
  const close = THREE.MathUtils.clamp(1 - (dist - 1.4)/3, 0, 1);
  earthMat.bumpScale = 0.02 + close*0.07;
  earthMat.shininess = 8 + close*45;
  earthMat.specular.setScalar(0.2 + close*0.35);
  cloudMat.opacity = 0.35 + close*0.15;
}
