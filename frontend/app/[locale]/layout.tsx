import type { Metadata, Viewport } from "next";
import { Cairo, Noto_Kufi_Arabic, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { notFound } from "next/navigation";

import BackgroundForRoute from "@/components/background/BackgroundForRoute";
import BackToTop from "@/components/BackToTop";
import InstallPrompt from "@/components/InstallPrompt";
import MotionProvider from "@/components/MotionProvider";
import ScrollProgress from "@/components/ScrollProgress";
import { getDictionary, isLocale, locales, type Locale } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/locale-context";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MentorPanel from "@/components/MentorPanel";
import ThemeKeeper from "@/components/ThemeKeeper";
import ThemeScript from "@/components/ThemeScript";

import "../globals.css";

/** Empty in development, "/masar-ai" in production. Set in next.config.mjs. */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/*
 * Four faces, two per script, and the pairing is the point.
 *
 * Inter was the safe choice and it made the app look like every other dashboard
 * on the internet. The brief for a graduation project is to be recognisable, so
 * headings now run in Space Grotesk -- a geometric grotesque with enough quirks
 * in its numerals and its `g` that a reader can name the page from a thumbnail
 * -- over Plus Jakarta Sans for body text, which carries more character than
 * Inter at the same legibility.
 *
 * Arabic is not an afterthought here: Noto Kufi Arabic is the Arabic answer to
 * a geometric grotesque, so an Arabic heading reads as the *same* design
 * decision rather than as a fallback, and Cairo stays for Arabic body text
 * where Naskh-adjacent forms are easier over long passages.
 *
 * All four are self-hosted by next/font, so the app still has no runtime
 * dependency on Google Fonts and works offline.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-latin",
  display: "swap",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-arabic",
  display: "swap",
});
const kufi = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  variable: "--font-display-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Masar AI — Your path, guided by data",
    template: "%s · Masar AI",
  },
  description:
    "AI career guidance for students in the United Arab Emirates: ranked career "
    + "recommendations, skill-gap analysis and a learning roadmap, in English and Arabic.",
  applicationName: "Masar AI",

  // Written with the base path baked in: these are emitted into static HTML,
  // and a bare "/manifest.webmanifest" would 404 under /masar-ai/.
  manifest: `${BASE}/manifest.webmanifest`,
  icons: {
    icon: [
      { url: `${BASE}/favicon-32.png`, sizes: "32x32", type: "image/png" },
      { url: `${BASE}/icon-192.png`, sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: `${BASE}/apple-touch-icon.png`, sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "Masar",
    // The status bar tints itself from the page behind it, which is what keeps
    // the installed app from showing a black bar above the header.
    statusBarStyle: "default",
  },
};


export const viewport: Viewport = {
  // Lets the app draw into the safe areas when installed to the Home Screen;
  // the CSS uses env(safe-area-inset-*) to keep content clear of the notch.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1418" },
  ],
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const typed = locale as Locale;
  const dictionary = getDictionary(typed);
  const dir = typed === "ar" ? "rtl" : "ltr";

  return (
    <html lang={typed} dir={dir} suppressHydrationWarning>
      <body
        className={
          `${jakarta.variable} ${spaceGrotesk.variable} `
          + `${cairo.variable} ${kufi.variable}`
        }
      >
        <ThemeScript />
        <ThemeKeeper />
        <LocaleProvider locale={typed} dictionary={dictionary}>
          <MotionProvider>
              <BackgroundForRoute />
              <ScrollProgress rtl={dir === "rtl"} />
              <a
                href="#main"
                className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded focus:bg-[var(--brand)] focus:px-4 focus:py-2 focus:text-[var(--brand-ink)]"
              >
                {dictionary.nav.skipToContent}
              </a>
              <div className="flex min-h-screen flex-col">
                <Header />
                <main id="main" className="flex-1">
                  {children}
                </main>
                <Footer />
              </div>
              <MentorPanel />
              <BackToTop label={dictionary.nav.backToTop} />
              <InstallPrompt />
          </MotionProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
