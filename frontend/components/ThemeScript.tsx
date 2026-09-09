/**
 * Applies the stored theme before first paint.
 *
 * This has to be an inline script in the document rather than a React effect:
 * an effect runs after hydration, which is late enough for a dark-mode user to
 * see a white flash on every navigation.
 */
export default function ThemeScript() {
  const script = `
(function () {
  try {
    var stored = localStorage.getItem("masar.theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme =
      stored === "dark" || stored === "light" ? stored : (prefersDark ? "dark" : "light");

    // The accent scheme is applied here too: setting it in an effect would
    // repaint every branded element one frame after the page appears.
    var scheme = localStorage.getItem("masar.scheme");
    var known = ["uae", "gulf", "sand", "royal", "sunset", "teal"];
    document.documentElement.dataset.scheme =
      known.indexOf(scheme) !== -1 ? scheme : "uae";

    var ui = localStorage.getItem("masar.ui");
    var styles = ["default", "glass", "minimal"];
    document.documentElement.dataset.ui =
      styles.indexOf(ui) !== -1 ? ui : "default";
  } catch (e) {
    document.documentElement.dataset.theme = "light";
    document.documentElement.dataset.scheme = "uae";
    document.documentElement.dataset.ui = "default";
  }
})();`.trim();

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
