import { getMessages, richText, type Messages } from "@/lib/i18n";
import { BirthForm } from "./birth-form";
import { ThemeSwitch } from "./theme-switch";

// "Birth chart" in Indian languages, ordered by number of first-language
// speakers (Census of India 2011). These stay the same in every page language.
const nativeWords = [
  { lang: "hi", name: "Hindi", word: "कुंडली" },
  { lang: "bn", name: "Bengali", word: "কোষ্ঠী" },
  { lang: "te", name: "Telugu", word: "జాతకం" },
  { lang: "ta", name: "Tamil", word: "ஜாதகம்" },
  { lang: "kn", name: "Kannada", word: "ಜಾತಕ" },
  { lang: "ml", name: "Malayalam", word: "ജാതകം" },
];

const SOURCE_URL = "https://github.com/adithyarmsh/jathag";
const AUTHOR_URL = "https://yoloadithya.com";

function Features({ t }: { t: Messages }) {
  return (
    <>
      <h2 className="sr-only">{t.hero.featuresLabel}</h2>
      {/* Inner cards: plain border, no hover highlight (D-066), no numbers (D-067) */}
      <ul className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3 lg:mt-10">
        {t.hero.features.map((f) => (
          <li key={f.title} className="rounded-[18px] border border-line bg-bg px-5 py-6">
            <h3 className="text-base leading-snug font-semibold">{f.title}</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-muted">{f.text}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function Home() {
  const t = getMessages();

  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
          <div className="text-on-dust">
            <div className="flex items-center gap-3">
              <p className="font-serif text-[26px] leading-none font-semibold lg:text-[32px]">
                {t.header.wordmark}
              </p>
              <span className="rounded-full border border-accent-border px-2.5 py-[3px] text-[11px] leading-none font-semibold tracking-[.12em] text-accent-text uppercase">
                {t.header.beta}
              </span>
            </div>
            <p className="mt-1.5 text-sm font-medium text-muted">{t.header.tagline}</p>
          </div>
          <ThemeSwitch label={t.header.themeSwitch} />
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1240px] flex-1 grid-cols-1 items-start gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_520px] lg:gap-10 lg:px-8 lg:py-12">
        {/* Left: hero */}
        <section
          aria-labelledby="hero-title"
          className="card-outer rounded-[28px] bg-card px-6 py-8 shadow-soft sm:px-10 sm:py-10 lg:px-[52px] lg:py-12"
        >
          <ul
            aria-label={t.hero.nativeWordsLabel}
            className="grid grid-cols-3 gap-x-4 gap-y-1 text-base text-muted sm:flex sm:flex-wrap sm:items-center sm:gap-x-3"
          >
            {nativeWords.map((w, i) => (
              <li key={w.lang} className="flex items-center gap-x-3">
                {i > 0 && (
                  <span aria-hidden="true" className="hidden sm:inline">
                    ·
                  </span>
                )}
                <span lang={w.lang} title={w.name}>
                  {w.word}
                </span>
              </li>
            ))}
          </ul>

          <h1
            id="hero-title"
            className="mt-6 font-serif text-[44px] leading-none font-medium text-balance sm:text-[60px] lg:text-[80px]"
          >
            {richText(t.hero.title, (part, key) => (
              <span key={key} className="highlight-band">
                {part}
              </span>
            ))}
          </h1>

          <p className="mt-6 max-w-[38rem] text-lg leading-relaxed text-pretty text-muted">
            {richText(t.hero.intro, (part, key) => (
              <span key={key} className="soft-highlight">
                {part}
              </span>
            ))}
          </p>

          {/* Desktop: the "What you'll get" cards sit in the hero. Phones: below the form (D-064). */}
          <div className="hidden lg:block">
            <Features t={t} />
          </div>
        </section>

        {/* Right: the birth form; the planet table appears below it (full width on desktop) */}
        <BirthForm t={t} />

        {/* Phones and tablets only: "What you'll get" below the form (D-064) */}
        <section aria-label={t.hero.featuresLabel} className="lg:hidden">
          <Features t={t} />
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-[1240px] space-y-2 px-4 py-6 text-sm text-muted sm:px-6 lg:px-8">
          <p className="text-on-dust flex w-fit flex-col gap-x-4 gap-y-2 sm:flex-row sm:flex-wrap sm:items-baseline">
            <span>{t.footer.text}</span>
            <a href={SOURCE_URL} className="footer-link">
              {t.footer.sourceLink}
            </a>
          </p>
          <p className="text-on-dust w-fit">
            {richText(t.footer.madeBy, (part, key) => (
              <a key={key} href={AUTHOR_URL} target="_blank" rel="noopener noreferrer" className="footer-link">
                {part}
                <span className="sr-only"> {t.footer.newTab}</span>
              </a>
            ))}
          </p>
        </div>
      </footer>
    </>
  );
}
