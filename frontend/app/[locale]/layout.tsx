import type { Metadata, Viewport } from "next";
import { Cairo, Inter } from "next/font/google";
import { notFound } from "next/navigation";

import BackgroundForRoute from "@/components/background/BackgroundForRoute";
import BackToTop from "@/components/BackToTop";
import MotionProvider from "@/components/MotionProvider";
import ScrollProgress from "@/components/ScrollProgress";
import { getDictionary, isLocale, locales, type Locale } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/locale-context";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MentorPanel from "@/components/MentorPanel";
import ThemeScript from "@/components/ThemeScript";

import "../globals.css";

// Cairo covers Arabic and Latin; Inter carries the Latin UI. Both are self-
// hosted by next/font, so the app has no runtime dependency on Google Fonts.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-latin",
  display: "swap",
});
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-arabic",
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
};

export const viewport: Viewport = {
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
      <body className={`${inter.variable} ${cairo.variable}`}>
        <ThemeScript />
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
          </MotionProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
