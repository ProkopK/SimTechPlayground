/**
 * 3D view for `renderer: "3d"` simulations. Three.js is loaded only here, on demand,
 * so the landing page and 2D simulations never download it.
 *
 * The shell provides renderer, camera, lights and OrbitControls (rotate/zoom with mouse
 * and touch); the simulation adds its objects in `setup3d` and updates them in `update3d`.
 */
import type { Object3D } from "three";
import type { Simulation3D, Three3D } from "../types";
import type { SimView } from "./runner";

const MAX_DPR = 2;
const AUTO_ROTATE_RESUME_MS = 5000;

export async function createThreeView(container: HTMLElement, sim: Simulation3D): Promise<SimView & { canvas: HTMLCanvasElement }> {
  const [THREE, { OrbitControls }] = await Promise.all([import("three"), import("three/addons/controls/OrbitControls.js")]);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: import.meta.env.DEV, // lets the dev thumbnail key (T) read the canvas
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
  const canvas = renderer.domElement;
  canvas.className = "sim-canvas";
  container.append(canvas);

  const scene = new THREE.Scene();
  const bg = getComputedStyle(container).getPropertyValue("--color-canvas-bg").trim() || "#000000";
  scene.background = new THREE.Color(bg);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
  camera.position.set(...(sim.camera?.position ?? [0, 0, 50]));

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...(sim.camera?.target ?? [0, 0, 0]));
  controls.enableDamping = true;
  controls.autoRotateSpeed = 1;

  // Slow auto-rotation for the projector; pauses while someone interacts.
  let resumeTimer = 0;
  controls.autoRotate = !!sim.autoRotate;
  const onStart = () => {
    controls.autoRotate = false;
    clearTimeout(resumeTimer);
  };
  const onEnd = () => {
    if (sim.autoRotate) resumeTimer = window.setTimeout(() => (controls.autoRotate = true), AUTO_ROTATE_RESUME_MS);
  };
  controls.addEventListener("start", onStart);
  controls.addEventListener("end", onEnd);

  // Basic lighting, kept across resets (everything else in the scene belongs to the simulation).
  const shellObjects = new Set<Object3D>([new THREE.AmbientLight(0xffffff, 0.6), new THREE.DirectionalLight(0xffffff, 1.2)]);
  [...shellObjects][1].position.set(1, 2, 3);
  shellObjects.forEach((o) => scene.add(o));

  const resize = () => {
    const { width, height } = container.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  /** Remove and free everything the simulation added to the scene. */
  function clearSimObjects() {
    for (const child of [...scene.children]) {
      if (shellObjects.has(child)) continue;
      scene.remove(child);
      child.traverse((o: any) => {
        o.geometry?.dispose();
        for (const m of [o.material].flat()) m?.dispose();
      });
    }
  }

  const three: Three3D = { THREE, scene, camera, controls };
  let handles: unknown;
  let last = performance.now();

  return {
    canvas,
    reset(state, values) {
      clearSimObjects();
      handles = sim.setup3d(three, state, values);
    },
    render(state, values) {
      const now = performance.now();
      controls.update((now - last) / 1000); // frame-rate independent auto-rotation
      last = now;
      sim.update3d(handles, state, values);
      renderer.render(scene, camera);
    },
    dispose() {
      clearTimeout(resumeTimer);
      observer.disconnect();
      controls.dispose();
      clearSimObjects();
      renderer.dispose();
      renderer.forceContextLoss(); // release the WebGL context right away
      canvas.remove();
    },
  };
}
