import { el, clear, pageHead, card, button, mount } from "../ui.js";
import { exportAll, importAll, clearAll } from "../store.js";
import { todayISO } from "../format.js";
import { buildDemo } from "../data/demo.js";

export default function render(root, { go }) {
  function draw(message) {
    clear(root);
    const data = exportAll();
    const sections = Object.keys(data).length;

    mount(root,
      pageHead("Data & Backup", "Your data lives only in this browser. Back it up so you never lose it."),
      message && el("div.card", { style: "border-color:var(--positive);background:var(--positive-weak)" }, el("strong", {}, message)),

      card(
        el("h2", {}, "Export a backup"),
        el("p.card-sub", {}, sections ? `${sections} data ${sections === 1 ? "section" : "sections"} ready to download as a JSON file.` : "No data saved yet — start using the app, then come back to back it up."),
        button("⬇ Download backup", doExport),
      ),

      card(
        el("h2", {}, "Restore from backup"),
        el("p.card-sub", {}, "Load a previously exported JSON file. This replaces all current data."),
        fileInput(),
      ),

      card(
        el("h2", {}, "Printable report"),
        el("p.card-sub", {}, "Open your browser's print dialog to save a clean PDF snapshot of the current screen."),
        button("🖨 Print / Save as PDF", () => window.print(), "secondary"),
      ),

      card(
        el("h2", {}, "Sample data"),
        el("p.card-sub", {}, "Load a realistic demo dataset to explore every feature. This replaces all current data."),
        button("✨ Load sample data", loadDemo, "secondary"),
      ),

      card(
        el("h2", {}, "Reset"),
        el("p.card-sub", {}, "Permanently delete everything stored in this browser. This cannot be undone."),
        button("🗑 Erase all data", doClear, "danger"),
      ),

      el("p.disclaimer", {}, "Data is stored in your browser's localStorage. Clearing your browser data, using private/incognito mode, or switching devices/browsers will lose it unless you've exported a backup."),
    );
  }

  function doExport() {
    const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledgerline-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function fileInput() {
    const input = el("input", { type: "file", accept: "application/json,.json" });
    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          if (!parsed || typeof parsed !== "object") throw new Error();
          if (!confirm("Restore this backup? It will replace all current data.")) return;
          importAll(parsed);
          draw("Backup restored successfully.");
        } catch {
          draw("⚠ That file isn't a valid Ledgerline backup.");
        }
      };
      reader.readAsText(file);
    });
    return el("label.field", {}, el("span", {}, "Choose a backup file"), input);
  }

  function loadDemo() {
    if (Object.keys(exportAll()).length && !confirm("Load sample data? This replaces all current data.")) return;
    importAll(buildDemo());
    go("/dashboard");
  }

  function doClear() {
    if (!confirm("Erase ALL data? This cannot be undone. Consider exporting a backup first.")) return;
    clearAll();
    go("/dashboard");
  }

  draw();
}
