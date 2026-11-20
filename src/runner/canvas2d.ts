import type { Simulation2D, View2D } from "../types";

/** Cap the device pixel ratio: sharper than 2× costs a lot of fill rate for little gain. */
const MAX_DPR = 2;

/**
 * A canvas that fills `container` and maps the simulation's world coordinates onto it,
 * preserving the aspect ratio (letterboxing) and staying sharp on HiDPI screens.
 */
export function createCanvas2D(container: HTMLElement, sim: Simulation2D) {
  const canvas = document.createElement("canvas");
  canvas.className = "sim-canvas";
  container.append(canvas);
  const ctx = canvas.getContext("2d")!;
  const { width: ww, height: wh } = sim.world;

  // Mapping world → CSS pixels: css = offset + world * scale
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let dpr = 1;
  const view: View2D = { width: ww, height: wh, pixelsPerUnit: 1 };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    scale = Math.min(rect.width / ww, rect.height / wh);
    offsetX = (rect.width - ww * scale) / 2;
    offsetY = (rect.height - wh * scale) / 2;
    view.pixelsPerUnit = scale * dpr;
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const bg = getComputedStyle(container).getPropertyValue("--color-canvas-bg").trim() || "#000";

  return {
    canvas,
    /** Clear, set up the world transform and call `draw`. */
    render(draw: (ctx: CanvasRenderingContext2D, view: View2D) => void) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, offsetX * dpr, offsetY * dpr);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, ww, wh);
      ctx.clip();
      draw(ctx, view);
      ctx.restore();
    },
    /** Convert client (CSS) coordinates of a pointer event to world coordinates. */
    toWorld(clientX: number, clientY: number): { x: number; y: number } {
      const rect = canvas.getBoundingClientRect();
      return { x: (clientX - rect.left - offsetX) / scale, y: (clientY - rect.top - offsetY) / scale };
    },
    dispose() {
      observer.disconnect();
      canvas.remove();
    },
  };
}

/** Dev helper: download the current canvas as a ≤ 400×300 WebP thumbnail. */
export function downloadThumbnail(canvas: HTMLCanvasElement, name = "thumbnail.webp") {
  const s = Math.min(1, 400 / canvas.width, 300 / canvas.height);
  const thumb = document.createElement("canvas");
  thumb.width = Math.round(canvas.width * s);
  thumb.height = Math.round(canvas.height * s);
  thumb.getContext("2d")!.drawImage(canvas, 0, 0, thumb.width, thumb.height);
  thumb.toBlob(
    (blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    },
    "image/webp",
    0.8,
  );
}
