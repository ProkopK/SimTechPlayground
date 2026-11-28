import { NEW_ISSUE_URL } from "../config";
import { t } from "../i18n";
import { el } from "./dom";

/**
 * Footer with feedback links to the GitHub issue forms. On a simulation page, `simId`
 * pre-fills the bug form's "simulation" field (issue forms accept `?<field id>=<value>`).
 */
export function createFooter(simId?: string): HTMLElement {
  const bug = new URLSearchParams({ template: "bug_report.yml" });
  if (simId) bug.set("simulation", simId);
  const link = (href: string, label: string) => el("a", { href, target: "_blank", rel: "noopener" }, label);
  return el(
    "footer",
    { class: "footer" },
    link(`${NEW_ISSUE_URL}?${bug}`, t("footer.reportBug")),
    link(`${NEW_ISSUE_URL}?template=simulation_request.yml`, t("footer.requestSim")),
  );
}
