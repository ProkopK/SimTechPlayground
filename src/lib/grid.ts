/**
 * Draw a 2D grid of numbers (e.g. spins, temperature, velocity) as a colored image.
 *
 *   drawGrid(ctx, data, nx, ny, viridis, { min: 0, max: 1 });
 *
 * `data` is row-major: the value of cell (x, y) is `data[y * nx + x]`, y pointing down.
 * The grid is drawn into the rectangle (x, y, width, height) in world coordinates; by
 * default each cell is one world unit, i.e. (0, 0, nx, ny). Cells stay crisp when scaled up.
 */
import { colormapIndex, type Colormap } from "./colormaps";

export interface GridOptions {
  /** Value mapped to the first colormap color (default 0). */
  min?: number;
  /** Value mapped to the last colormap color (default 1). */
  max?: number;
  /** Target rectangle in world coordinates (default: 0, 0, nx, ny). */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  /** Color for NaN cells, e.g. obstacles, as "#rrggbb" (default transparent). */
  nanColor?: string;
}

interface Buffer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  image: ImageData;
  pixels: Uint32Array;
}

// One reusable offscreen buffer per grid size, so drawing allocates nothing per frame.
const buffers = new Map<string, Buffer>();

function getBuffer(nx: number, ny: number): Buffer {
  const key = `${nx}x${ny}`;
  let buf = buffers.get(key);
  if (!buf) {
    const canvas = document.createElement("canvas");
    canvas.width = nx;
    canvas.height = ny;
    const ctx = canvas.getContext("2d")!;
    const image = ctx.createImageData(nx, ny);
    buf = { canvas, ctx, image, pixels: new Uint32Array(image.data.buffer) };
    buffers.set(key, buf);
  }
  return buf;
}

/** Packed RGBA (little-endian, as in ImageData) for a CSS color like "#808080". */
function packColor(css: string | undefined): number {
  const m = css?.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return 0; // transparent
  return ((255 << 24) | (parseInt(m[3], 16) << 16) | (parseInt(m[2], 16) << 8) | parseInt(m[1], 16)) >>> 0;
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  data: ArrayLike<number>,
  nx: number,
  ny: number,
  colormap: Colormap,
  options: GridOptions = {},
): void {
  const { min = 0, max = 1 } = options;
  const buf = getBuffer(nx, ny);
  const nan = packColor(options.nanColor);
  const n = nx * ny;
  for (let i = 0; i < n; i++) {
    const v = data[i];
    buf.pixels[i] = v === v ? colormap[colormapIndex(v, min, max)] : nan; // v !== v ⇔ NaN
  }
  buf.ctx.putImageData(buf.image, 0, 0);

  const smoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buf.canvas, options.x ?? 0, options.y ?? 0, options.width ?? nx, options.height ?? ny);
  ctx.imageSmoothingEnabled = smoothing;
}
