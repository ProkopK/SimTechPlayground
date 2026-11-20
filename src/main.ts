import "./styles/main.css";
import { parseRoute } from "./router";
import { mountLanding } from "./ui/landing";
import { mountSimPage } from "./ui/simPage";

const app = document.querySelector<HTMLDivElement>("#app")!;
let cleanup: () => void = () => {};

function navigate() {
  cleanup();
  const route = parseRoute(location.hash);
  cleanup = route.page === "sim" ? mountSimPage(app, route.id) : mountLanding(app);
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", navigate);
navigate();
