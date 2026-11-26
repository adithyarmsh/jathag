import type { Metadata, Viewport } from "next";
import {
  Fraunces,
  Inter,
  Noto_Serif_Bengali,
  Noto_Serif_Devanagari,
  Noto_Serif_Kannada,
  Noto_Serif_Malayalam,
  Noto_Serif_Tamil,
  Noto_Serif_Telugu,
} from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getMessages } from "@/lib/i18n";
import { THEME_COLOR, THEME_SCRIPT } from "@/lib/theme";
import { StarField } from "./star-field";
import "./globals.css";

// Fonts are downloaded at build time and served from this site (no calls to Google at runtime).
// Fraunces for headings (weight 400 with the optical-size axis; italic for the one emphasised hero
// phrase) and Inter for everything else (design spec §1.3). next/font only keeps the opsz axis when the
// weight axis is variable too, so the variable file is used; the site only sets weight 400.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal"],
  axes: ["opsz"],
  display: "swap",
});
// The italic is only used for the one emphasised hero phrase: its own family, not preloaded.
const frauncesItalic = Fraunces({
  variable: "--font-fraunces-italic",
  subsets: ["latin"],
  style: ["italic"],
  axes: ["opsz"],
  display: "swap",
  preload: false,
});

// Inter's variable file covers 400, 500 and 600 in one download (the only weights the site uses).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// One serif font per Indian script, used for the native-language words under the wordmark.
// (next/font needs the options written out in full for each font.)
const devanagari = Noto_Serif_Devanagari({ variable: "--font-hi", subsets: ["devanagari"], weight: ["400"], display: "swap", preload: false });
const bengali = Noto_Serif_Bengali({ variable: "--font-bn", subsets: ["bengali"], weight: ["400"], display: "swap", preload: false });
const telugu = Noto_Serif_Telugu({ variable: "--font-te", subsets: ["telugu"], weight: ["400"], display: "swap", preload: false });
const tamil = Noto_Serif_Tamil({ variable: "--font-ta", subsets: ["tamil"], weight: ["400"], display: "swap", preload: false });
const kannada = Noto_Serif_Kannada({ variable: "--font-kn", subsets: ["kannada"], weight: ["400"], display: "swap", preload: false });
const malayalam = Noto_Serif_Malayalam({ variable: "--font-ml", subsets: ["malayalam"], weight: ["400"], display: "swap", preload: false });

const messages = getMessages();
const { title, description } = messages.meta;

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "Jathag",
    type: "website",
  },
  // Keep the whole site out of search results until the v1.0 launch (FR-HOME-05, D-060).
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
  ],
};

const fontVars = [fraunces, frauncesItalic, inter, devanagari, bengali, telugu, tamil, kannada, malayalam]
  .map((f) => f.variable)
  .join(" ");

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVars} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Runs before the page paints so a chosen theme never flashes the wrong colours (lib/theme.ts).
            The choice is kept only in this browser (localStorage), never sent anywhere. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {/* Random background stars, made in the browser after loading (D-117 item 4) */}
        <StarField />
        {/* The app shell on every page (design spec §4) */}
        <SiteHeader t={{ header: messages.header, menu: messages.menu, footer: messages.footer }} />
        {/* On every page until the v1.0 launch (FR-HOME-05, D-060). Not sticky: it scrolls away (D-095). */}
        <p className="beta-band px-4 py-2.5 lg:text-center">{messages.betaBand}</p>
        {children}
        <SiteFooter t={messages.footer} commit={process.env.VERCEL_GIT_COMMIT_SHA} />
      </body>
    </html>
  );
}
