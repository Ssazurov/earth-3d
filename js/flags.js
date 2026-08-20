// Флаги стран для маркеров-столиц: emoji -> ISO-код -> SVG-текстура,
// с fallback на emoji-глиф (Windows не рисует флаги системным шрифтом).

const flagMatCache = {};
function emojiToISO(emoji){
  const cps = [...emoji].map(c => c.codePointAt(0));
  if(cps.length < 2) return null;
  const letters = cps.map(cp => String.fromCharCode(cp - 0x1F1E6 + 65));
  return /^[A-Z]{2}$/.test(letters.join('')) ? letters.join('').toLowerCase() : null;
}
function drawFlagEmoji(ctx, emoji){
  ctx.clearRect(0,0,64,64);
  ctx.font = '46px "Segoe UI Emoji","Noto Color Emoji",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 32, 34);
}
export function getFlagMaterial(emoji){
  if(flagMatCache[emoji]) return flagMatCache[emoji];
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({map:tex, transparent:true, depthTest:false});
  flagMatCache[emoji] = mat;
  const iso = emojiToISO(emoji);
  if(iso){
    // системный шрифт Windows (Segoe UI Emoji) не рисует флаги-эмодзи —
    // показывает двухбуквенный код страны. Грузим SVG-флаг вместо глифа.
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.clearRect(0,0,64,64);
      const w = 54, h = 40;
      ctx.drawImage(img, (64-w)/2, (64-h)/2, w, h);
      tex.needsUpdate = true;
    };
    img.onerror = () => { drawFlagEmoji(ctx, emoji); tex.needsUpdate = true; };
    img.src = `https://cdn.jsdelivr.net/npm/flag-icons@7.2.3/flags/4x3/${iso}.svg`;
  } else {
    drawFlagEmoji(ctx, emoji);
    tex.needsUpdate = true;
  }
  return mat;
}
