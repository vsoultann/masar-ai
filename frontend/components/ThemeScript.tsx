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
  } catch (e) {
    document.documentElement.dataset.theme = "light";
  }
})();`.trim();

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
