import { drawArt, lookupArt, artMap } from '../core/art.js';

export function roundedRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, rr);
}

export function drawCloud(ctx, x, y, scale = 1, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, 42 * scale, 0, Math.PI * 2);
  ctx.arc(x + 48 * scale, y - 25 * scale, 54 * scale, 0, Math.PI * 2);
  ctx.arc(x + 102 * scale, y, 44 * scale, 0, Math.PI * 2);
  ctx.roundRect(x - 34 * scale, y, 170 * scale, 52 * scale, 26 * scale);
  ctx.fill();
  ctx.restore();
}

// icon: optional key from art_map.json "ui" (e.g. 'home'); shown on the left when the picture is loaded.
// Keys listed in ui.mirror (back, prev) show their picture flipped.
export function drawCandyButton(ctx, x, y, w, h, label, pressed = false, icon = null) {
  ctx.save();
  const offset = pressed ? 12 : 0;
  ctx.fillStyle = '#b65f24';
  ctx.beginPath();
  ctx.roundRect(x, y + 18, w, h, 46);
  ctx.fill();
  ctx.fillStyle = pressed ? '#f7b958' : '#ffd56f';
  ctx.beginPath();
  ctx.roundRect(x, y + offset, w, h, 46);
  ctx.fill();
  ctx.fillStyle = '#6b3f2b';
  const uiScale = Math.max(1, Math.min(1.3, Number(globalThis.__LL_UI_SCALE) || 1));
  ctx.font = `700 ${Math.round(h * 0.42 * uiScale)}px ui-rounded, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const iconSize = h * 0.74;
  const hasIcon = icon && drawArt(ctx, lookupArt('ui', icon), x + h * 0.18 + iconSize / 2, y + offset + h / 2, iconSize, iconSize, { flipX: Boolean(artMap()?.ui?.mirror?.includes(icon)) });
  if (hasIcon) {
    const room = w - h * 0.18 - iconSize - h * 0.3, width = ctx.measureText?.(label)?.width ?? 0;
    if (width > room) ctx.font = `700 ${Math.floor(h * 0.42 * uiScale * room / width)}px ui-rounded, system-ui, sans-serif`;
  }
  ctx.fillText(label, hasIcon ? x + (h * 0.18 + iconSize + w) / 2 : x + w / 2, y + offset + h / 2 + 2);
  ctx.restore();
}
