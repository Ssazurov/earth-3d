// Геометрические утилиты общего назначения — без внешнего состояния.

export function latLonToVec3(lat, lon, r){
  const phi = (90 - lat) * Math.PI/180;
  const theta = (lon + 180) * Math.PI/180;
  return new THREE.Vector3(-r*Math.sin(phi)*Math.cos(theta), r*Math.cos(phi), r*Math.sin(phi)*Math.sin(theta));
}

export function raDecToVec3(raH, decDeg, r){
  return latLonToVec3(decDeg, raH*15, r);
}

export function orbitPoint(radius, incl, node, angle){
  const p = new THREE.Vector3(Math.cos(angle)*radius, 0, Math.sin(angle)*radius);
  p.applyAxisAngle(new THREE.Vector3(1,0,0), incl);
  p.applyAxisAngle(new THREE.Vector3(0,1,0), node);
  return p;
}
