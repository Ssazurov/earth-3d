// Общее runtime-состояние, которое нужно разным модулям сцены.
// Настройки (SETTINGS) читаются один раз здесь, чтобы все модули видели
// одни и те же значения.

import { loadSettings } from './settings.js';
export const SETTINGS = loadSettings();

// --- picking (клик/ховер по объектам) ---
export const raycaster = new THREE.Raycaster();
export const mouseNDC = new THREE.Vector2();
export const hitMeshes = [];

// --- видимость слоёв (панель справа, initUI onToggle) ---
export const VIS = {
  constellations: SETTINGS.visConstellations, city: SETTINGS.visCity,
  capitals: SETTINGS.visCapitals, plant: SETTINGS.visPlant,
  planets: SETTINGS.visPlanets, labels: SETTINGS.visLabels
};

// --- скорость симуляции (ползунок в панели, влияет на всё: earth/планеты/МКС/транспорт) ---
export const EARTH_DEFAULT_SPEED = SETTINGS.earthSpeed;
export let globalSpeed = EARTH_DEFAULT_SPEED;
export function setGlobalSpeed(v){ globalSpeed = v; }
export function currentTransportSpeed(){ return globalSpeed; }
export function speedMul(){ return globalSpeed; }

// --- пауза, масштаб Земля-Солнце, автовращение — переключаются из main.js/ui.js ---
export let paused = false;
export function setPaused(v){ paused = v; }

export let distScale = SETTINGS.sunDist;
export function setDistScale(v){ distScale = v; }

export let autoRotate = true;
export function setAutoRotate(v){ autoRotate = v; }
