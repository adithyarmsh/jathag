import type { Metadata, Viewport } from "next";
import {
  Cormorant_Garamond,
  Inter,
  Noto_Serif_Bengali,
  Noto_Serif_Devanagari,
  Noto_Serif_Kannada,
  Noto_Serif_Malayalam,
  Noto_Serif_Tamil,
  Noto_Serif_Telugu,
} from "next/font/google";
import { getMessages } from "@/lib/i18n";
import "./globals.css";

// Fonts are downloaded at build time and served from this site (no calls to Google at runtime).
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

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
    { media: "(prefers-color-scheme: dark)", color: "#0b1426" },
    { media: "(prefers-color-scheme: light)", color: "#f9f6f3" },
  ],
};

// Runs before the page paints so a chosen theme never flashes the wrong colours.
// The choice is kept only in this browser (localStorage), never sent anywhere.
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

const fontVars = [cormorant, inter, devanagari, bengali, telugu, tamil, kannada, malayalam]
  .map((f) => f.variable)
  .join(" ");

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVars} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {/* On every page until the v1.0 launch (FR-HOME-05, D-060) */}
        <p className="beta-notice border-b border-line px-4 py-2 text-center text-xs leading-snug text-muted sm:text-[13px]">
          {messages.betaNotice}
        </p>
        {children}
      </body>
    </html>
  );
}
