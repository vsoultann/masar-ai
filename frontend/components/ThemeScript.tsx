import {
  SCHEME_KEY, SCHEMES, THEME_KEY, UI_KEY, UI_STYLES,
} from "@/lib/theme";

/**
 * Applies the stored theme before first paint.
 *
 * This has to be an inline script in the document rather than a React effect:
 * an effect runs after hydration, which is late enough for a dark-mode user to
 * see a white flash on every navigation.
 */
export default function ThemeScript() {
  /*
   * The key names and the allowed values are imported rather than retyped, so
   * this string and lib/theme.ts cannot drift apart. The logic is still
   * duplicated -- it has to be, because this runs before any bundle is parsed
   * -- but the data it depends on has one definition, and a test asserts the
   * two agree.
   */
  const script = `
(function () {
  try {
    var d = document.documentElement.dataset;
    var stored = localStorage.getItem(${JSON.stringify(THEME_KEY)});
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    d.theme = stored === "dark" || stored === "light" ? stored : (prefersDark ? "dark" : "light");

    // The accent scheme is applied here too: setting it in an effect would
    // repaint every branded element one frame after the page appears.
    var scheme = localStorage.getItem(${JSON.stringify(SCHEME_KEY)});
    var schemes = ${JSON.stringify([...SCHEMES])};
    d.scheme = schemes.indexOf(scheme) !== -1 ? scheme : ${JSON.stringify(SCHEMES[0])};

    var ui = localStorage.getItem(${JSON.stringify(UI_KEY)});
    var styles = ${JSON.stringify([...UI_STYLES])};
    d.ui = styles.indexOf(ui) !== -1 ? ui : ${JSON.stringify(UI_STYLES[0])};
  } catch (e) {
    var f = document.documentElement.dataset;
    f.theme = "light";
    f.scheme = ${JSON.stringify(SCHEMES[0])};
    f.ui = ${JSON.stringify(UI_STYLES[0])};
  }
})();`.trim();

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
