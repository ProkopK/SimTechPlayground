/**
 * Colormaps turn a number into a color. Each colormap is a lookup table of 256 colors,
 * stored as packed 32-bit RGBA values (the format `ImageData` uses), so that drawing a
 * grid is just one array lookup per cell.
 */
export type Colormap = Uint32Array;

type RGB = [number, number, number];

/** Build a colormap by linear interpolation between evenly spaced color stops. */
export function makeColormap(stops: RGB[]): Colormap {
  const lut = new Uint32Array(256);
  const bytes = new Uint8Array(lut.buffer);
  for (let i = 0; i < 256; i++) {
    const pos = (i / 255) * (stops.length - 1);
    const k = Math.min(Math.floor(pos), stops.length - 2);
    const f = pos - k;
    for (let c = 0; c < 3; c++) bytes[i * 4 + c] = Math.round(stops[k][c] + f * (stops[k + 1][c] - stops[k][c]));
    bytes[i * 4 + 3] = 255;
  }
  return lut;
}

/** Perceptually uniform, colorblind-friendly (dark purple → green → yellow). For magnitudes. */
export const viridis = makeColormap([
  [68, 1, 84],
  [72, 40, 120],
  [62, 74, 137],
  [49, 104, 142],
  [38, 130, 142],
  [31, 158, 137],
  [53, 183, 121],
  [110, 206, 88],
  [181, 222, 43],
  [253, 231, 37],
]);

export const plasma = makeColormap([
    [13, 8, 135],
    [42, 3, 147],
    [82, 5, 122],
    [126, 21, 87],
    [168, 33, 68],
    [210, 70, 32],
    [253, 130, 38],
    [248, 188, 35],
    [240, 249, 33],
]);

/** Diverging blue → white → red. For signed values (e.g. spin, vorticity), centered at 0. */
export const blueWhiteRed = makeColormap([
  [33, 102, 172],
  [146, 197, 222],
  [247, 247, 247],
  [244, 165, 130],
  [178, 24, 43],
]);

/** Index into a colormap for value `v` scaled from [min, max] (clamped). */
export function colormapIndex(v: number, min: number, max: number): number {
  const i = Math.round(((v - min) / (max - min)) * 255);
  return i < 0 ? 0 : i > 255 ? 255 : i;
}

/** CSS color string for `t` in [0, 1], e.g. for coloring particles. */
export function cssColor(cmap: Colormap, t: number): string {
  const c = cmap[colormapIndex(t, 0, 1)];
  return `rgb(${c & 255}, ${(c >>> 8) & 255}, ${(c >>> 16) & 255})`;
}
