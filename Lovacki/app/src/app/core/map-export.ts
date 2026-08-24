import { Stand, isFeeding, isSmallFeeding } from './models';
import { downloadBlob } from './file-download';

const COLOR_FREE = '#43a047';
const COLOR_TAKEN = '#e53935';
const COLOR_FEED_LARGE = '#f4b400';
const COLOR_FEED_SMALL = '#ef6c00';
const COLOR_SALT = '#7cb342';

const HUNTING_PATHS = [
  'M16 1 29 13H3Z',
  'M7 13h18v9H7z',
  'M5 22h22v2.4H5z',
  'M9 24h2.4L8 38H5.4z',
  'M20.6 24H23L26.6 38h-2.6z',
  'M14.8 24h2.4v14h-2.4z',
];

export interface MapExportLabels {
  title: string;
  date: string;
  free: string;
  taken: string;
  feedLarge: string;
  feedSmall: string;
}

export async function downloadMarkedMap(options: {
  imageSrc: string;
  stands: Stand[];
  takenIds: ReadonlySet<string>;
  filename: string;
  labels: MapExportLabels;
}): Promise<void> {
  const image = await loadImage(options.imageSrc);
  const scale = image.naturalWidth >= 2000 ? 1 : 2;
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas is not available');
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, width, height);

  const pinH = clamp(height * 0.03, 30, 58);
  const largeH = pinH * 0.9;
  const smallH = pinH * 0.7;
  for (const stand of options.stands) {
    const x = stand.x * width;
    const y = stand.y * height;
    if (isSmallFeeding(stand)) {
      drawSmallFeedingPin(ctx, x, y, smallH, COLOR_FEED_SMALL, stand.code);
      continue;
    }
    if (isFeeding(stand)) {
      drawLargeFeedingPin(ctx, x, y, largeH, COLOR_FEED_LARGE, stand.code);
      continue;
    }
    const color = options.takenIds.has(stand.id) ? COLOR_TAKEN : COLOR_FREE;
    drawHuntingPin(ctx, x, y, pinH, color, stand.code);
  }

  drawLegend(ctx, width, height, options.labels);

  const blob = await canvasToBlob(canvas);
  downloadBlob(blob, options.filename);
}

function drawHuntingPin(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  h: number,
  color: string,
  code: string,
): void {
  const s = h / 40;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.translate(-16, -40);
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 0.7;
  for (const path of HUNTING_PATHS) {
    const shape = new Path2D(path);
    ctx.fill(shape);
    ctx.stroke(shape);
  }
  ctx.restore();
  drawCode(ctx, cx, cy - h * 0.62, h * 0.28, code);
}

function drawLargeFeedingPin(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  h: number,
  color: string,
  code: string,
): void {
  const s = h / 32;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.translate(-16, -32);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(16, 16, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  drawCode(ctx, cx, cy - h * 0.5, h * 0.36, code);
}

function drawSmallFeedingPin(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  h: number,
  color: string,
  code: string,
): void {
  const s = h / 22;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.translate(-16, -22);
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 0.7;
  const trough = new Path2D('M2 4h18l8 14H2z');
  ctx.fill(trough);
  ctx.stroke(trough);
  ctx.fillStyle = COLOR_SALT;
  ctx.beginPath();
  ctx.arc(30, 8, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawCode(ctx, cx - h * 0.12, cy - h * 0.48, h * 0.32, code);
}

function drawCode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  font: number,
  code: string,
): void {
  const size = Math.max(8, font);
  ctx.save();
  ctx.font = `700 ${size}px system-ui, "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, size * 0.22);
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.fillStyle = '#fff';
  ctx.strokeText(code, x, y);
  ctx.fillText(code, x, y);
  ctx.restore();
}

function drawLegend(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  labels: MapExportLabels,
): void {
  const pad = Math.max(12, width * 0.012);
  const unit = Math.max(12, width * 0.009);
  const boxW = unit * 22;
  const boxH = unit * 9.6;
  const x = pad;
  const y = height - boxH - pad;
  ctx.save();
  ctx.fillStyle = 'rgba(16, 36, 28, 0.88)';
  roundRect(ctx, x, y, boxW, boxH, unit * 0.5);
  ctx.fill();
  ctx.fillStyle = '#f4efe4';
  ctx.font = `700 ${unit * 1.05}px system-ui, "Segoe UI", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(labels.title, x + unit, y + unit * 0.7);
  ctx.font = `500 ${unit * 0.85}px system-ui, "Segoe UI", sans-serif`;
  ctx.fillStyle = 'rgba(244, 239, 228, 0.75)';
  ctx.fillText(labels.date, x + unit, y + unit * 2);
  const rows: Array<[string, string]> = [
    [COLOR_FREE, labels.free],
    [COLOR_TAKEN, labels.taken],
    [COLOR_FEED_LARGE, labels.feedLarge],
    [COLOR_FEED_SMALL, labels.feedSmall],
  ];
  rows.forEach(([color, text], index) => {
    const rowY = y + unit * 3.4 + index * unit * 1.45;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + unit * 1.35, rowY + unit * 0.45, unit * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4efe4';
    ctx.font = `600 ${unit * 0.9}px system-ui, "Segoe UI", sans-serif`;
    ctx.fillText(text, x + unit * 2.2, rowY);
  });
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error('Could not create PNG'));
    }, 'image/png');
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
