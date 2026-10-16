import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque, Noto_Sans } from "next/font/google";
import Link from "next/link";
import { BottomNav, SettingsLink, TopNav } from "@/components/layout/app-nav";
import { PersistenceNotice } from "@/components/layout/persistence-notice";
import { SyncBootstrap } from "@/hooks/use-account";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-lexi-display",
  subsets: ["latin"],
});

const body = Atkinson_Hyperlegible_Next({
  variable: "--font-lexi-body",
  subsets: ["latin", "latin-ext"],
  // No metric overrides exist for this family yet; fall back to the system stack.
  adjustFontFallback: false,
  fallback: ["system-ui", "sans-serif"],
});

/** Phonetic transcriptions need full IPA coverage (ɝ, ʊ, ŋ, ˈ…). */
const ipa = Noto_Sans({
  variable: "--font-lexi-ipa",
  subsets: ["latin", "latin-ext"],
  weight: "400",
  preload: false,
});

const DESCRIPTION = "Practica vocabulario en inglés cada día, con pronunciación y ejemplos traducidos.";

/** Absolute URLs for the share preview: the real domain in production, the deployment URL in previews. */
const SITE_URL =
  process.env.VERCEL_ENV === "production"
    ? "https://lexiapp.app"
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Lexi — vocabulario en inglés", template: "%s · Lexi" },
  description: DESCRIPTION,
  applicationName: "Lexi",
  openGraph: {
    type: "website",
    siteName: "Lexi",
    locale: "es_CO",
    title: "Lexi — vocabulario en inglés",
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1022" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} ${ipa.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
        >
          Saltar al contenido
        </a>
        <header className="border-b border-line/70">
          <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="font-display text-2xl font-bold tracking-tight" aria-label="Lexi, inicio">
              lexi<span className="text-accent">.</span>
            </Link>
            <div className="flex items-center gap-1">
              <TopNav />
              <SettingsLink />
            </div>
          </div>
        </header>
        <main id="contenido" className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 sm:px-6 md:pb-16">
          <PersistenceNotice />
          {children}
        </main>
        <BottomNav />
        <SyncBootstrap />
      </body>
    </html>
  );
}
