import "./styles/main.css";
import { onLangChange, t } from "./i18n";
import { createLangSwitch } from "./ui/langSwitch";

const app = document.querySelector<HTMLDivElement>("#app")!;

function render() {
  app.replaceChildren();
  const h1 = document.createElement("h1");
  h1.textContent = t("site.title");
  const p = document.createElement("p");
  p.textContent = t("site.intro");
  app.append(h1, p, createLangSwitch());
}

onLangChange(render);
render();
