import { camera, controls } from './scene-core.js';

// --- лог-шкала масштаба (движок в панели <-> колесо мыши) ---
// ZOOM_MAX не константа: пересчитывается так, чтобы на максимуме движка
// всегда были видны все планеты Солнечной системы независимо от того,
// какой объект выбран центром камеры (см. updateZoomMax ниже)
export const ZOOM_MIN = 1.08;
export let ZOOM_MAX = 260;
export function distToZoomNorm(d){
  return (Math.log(d)-Math.log(ZOOM_MIN))/(Math.log(ZOOM_MAX)-Math.log(ZOOM_MIN));
}
export function zoomNormToDist(n){
  return Math.exp(Math.log(ZOOM_MIN) + n*(Math.log(ZOOM_MAX)-Math.log(ZOOM_MIN)));
}
export function setCameraZoom(norm){
  const dir = camera.position.clone().sub(controls.target);
  if(dir.lengthSq() < 1e-6) dir.set(0,0,1);
  dir.normalize();
  const d = zoomNormToDist(THREE.MathUtils.clamp(norm,0,1));
  camera.position.copy(controls.target).add(dir.multiplyScalar(d));
  controls.update();
}

export function setZoomMax(v){ ZOOM_MAX = v; }

