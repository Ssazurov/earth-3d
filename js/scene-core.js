// Базовая инфраструктура сцены: рендерер, камера, орбит-контролы,
// CSS2D-рендерер подписей, основной направленный свет.
// Всё остальное (Земля, маркеры, объекты) добавляется в scene другими модулями.

// --- сцена, камера, рендер ---
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 60000);
camera.position.set(0, 0, 3.2);

export const renderer = new THREE.WebGLRenderer({antialias:true, logarithmicDepthBuffer:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);

// --- слой HTML-подписей поверх сцены ---
export const labelRenderer = new THREE.CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

// --- управление мышью ---
export const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1.08;
controls.maxDistance = 260;
controls.enablePan = false;
controls.rotateSpeed = 0.5;
controls.zoomSpeed = 1.1;

// звёздное небо — см. skyGroup ниже (makeBackgroundStars/makeMilkyWay),
// он рекопируется на позицию камеры каждый кадр, поэтому границы нет
// ни при каком удалении/повороте (убран старый фиксированный куб-звездфилд,
// который был конечным и давал видимую границу при отдалении дальше 450 ед.)

// --- свет ---
export const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(5, 2, 5);
scene.add(sun);
scene.add(new THREE.AmbientLight(0x223355, 0.6));
