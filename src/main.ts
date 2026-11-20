import "./styles/main.css";
import { parseRoute } from "./router";
import { mountLanding } from "./ui/landing";

const app = document.querySelector<HTMLDivElement>("#app")!;
let cleanup: () => void = () => {};

function navigate() {
  cleanup();
  const route = parseRoute(location.hash);
  if (route.page === "sim") {
    // The simulation page (runner, controls) is loaded on demand to keep the landing page small.
    let cancelled = false;
    let unmount: (() => void) | undefined;
    cleanup = () => {
      cancelled = true;
      unmount?.();
    };
    import("./ui/simPage").then(({ mountSimPage }) => {
      if (!cancelled) unmount = mountSimPage(app, route.id);
    });
  } else {
    cleanup = mountLanding(app);
  }
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", navigate);
navigate();
