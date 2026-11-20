import type { PointerInfo } from "../types";

/**
 * Forwards mouse, touch and pen input on `target` as `PointerInfo` in world coordinates.
 * Uses Pointer Events, so touch behaves like a mouse with the left button held down.
 * Returns a function that removes the listeners.
 */
export function attachPointer(
  target: HTMLElement,
  toWorld: (clientX: number, clientY: number) => { x: number; y: number },
  handler: (info: PointerInfo) => void,
): () => void {
  const send = (type: PointerInfo["type"], e: PointerEvent) => {
    const { x, y } = toWorld(e.clientX, e.clientY);
    handler({
      type,
      x,
      y,
      buttons: e.buttons,
      button: e.button,
      pointerType: e.pointerType === "touch" || e.pointerType === "pen" ? e.pointerType : "mouse",
    });
  };

  const down = (e: PointerEvent) => {
    e.preventDefault();
    target.setPointerCapture(e.pointerId); // keep receiving moves when leaving the canvas
    send("down", e);
  };
  const move = (e: PointerEvent) => send("move", e);
  const up = (e: PointerEvent) => send("up", e);
  const noMenu = (e: Event) => e.preventDefault(); // right mouse button is used by simulations

  target.addEventListener("pointerdown", down);
  target.addEventListener("pointermove", move);
  target.addEventListener("pointerup", up);
  target.addEventListener("pointercancel", up);
  target.addEventListener("contextmenu", noMenu);
  return () => {
    target.removeEventListener("pointerdown", down);
    target.removeEventListener("pointermove", move);
    target.removeEventListener("pointerup", up);
    target.removeEventListener("pointercancel", up);
    target.removeEventListener("contextmenu", noMenu);
  };
}
