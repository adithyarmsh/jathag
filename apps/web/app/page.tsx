import { Divider } from "@/components/divider";
import { STAR_D } from "@/components/icons";
import { Tag } from "@/components/tag";
import { getMessages, richText, type Messages } from "@/lib/i18n";
import { BirthForm } from "./birth-form";

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

/**
 * "What you'll get" (rendered once, D-094 item 10a; spec §5.1). Desktop: three plain items under a
 * short star divider in the left column (h3 + one line, no cards). Phones and tablets: after a divider,
 * three inner cards below the form (D-064). The "Coming soon" tag is only on
 * "Plain-language explanations" (D-133): next to its heading on desktop, under its text on phones.
 */
function Features({ t }: { t: Messages }) {
  return (
    <section aria-labelledby="features-title" className="hero-features">
      <div className="lg:hidden">
        <Divider inGrid />
      </div>
      {/* Desktop: the short star divider of the left column */}
      <div aria-hidden="true" className="hidden max-w-[500px] items-center gap-4 py-4 lg:flex">
        <span className="divider-line" />
        <svg viewBox="0 0 24 24" className="divider-star" focusable="false">
          <path d={STAR_D} />
        </svg>
        <span className="divider-line" />
      </div>
      <div className="bg-bg pt-6 lg:pt-6">
        <h2 id="features-title" className="type-label">
          {t.hero.featuresLabel}
        </h2>
        {/* Inner cards on phones: plain border, no hover highlight (D-066), no numbers (D-067) */}
        <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 lg:max-w-[520px] lg:grid-cols-1 lg:gap-[22px]">
          {t.hero.features.map((f) => (
            <li key={f.title} className="feature-item">
              <h3 className="type-h3">{f.title}</h3>
              <p className="feature-text">{f.text}</p>
              {"soon" in f && f.soon && (
                <span className="feature-tag">
                  <Tag kind="soon">{t.hero.comingSoon}</Tag>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function Home() {
  const t = getMessages();

  return (
    <>
      {/* B2 split from 1024 px (spec §1.5): form column 440 px with a 48 px gap, from 1200 px 480 px and
          80 px. Below 1024 px one column: words + heading + intro → form → What you'll get. The chart
          itself opens on its own page, /chart (step 0.5.1, D-138). */}
      <main className="home-grid mx-auto grid w-full max-w-[1168px] flex-1 grid-cols-1 items-start gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:py-16">
        {/* Left on desktop. On phones and tablets the hero box itself dissolves (CSS) so the intro comes
            first and "What you'll get" goes last (D-064). Solid background: no star behind the text. */}
        <section aria-labelledby="hero-title" className="hero bg-bg lg:pt-6">
          <div className="hero-intro bg-bg pt-2 lg:pt-0">
            <ul
              aria-label={t.hero.nativeWordsLabel}
              className="flex flex-wrap gap-x-3.5 gap-y-1 text-[14px] leading-[22px] text-muted lg:gap-x-[18px] lg:text-base lg:leading-6"
            >
              {nativeWords.map((w) => (
                <li key={w.lang}>
                  <span lang={w.lang} title={w.name}>
                    {w.word}
                  </span>
                </li>
              ))}
            </ul>

            <h1 id="hero-title" className="type-display type-hero mt-4 max-w-[540px] text-balance lg:mt-6">
              {richText(t.hero.title, (part, key) => (
                <em key={key} className="hero-em">
                  {part}
                </em>
              ))}
            </h1>

            <p className="type-body-lg mt-4 max-w-[500px] text-pretty text-muted lg:mt-6">
              {richText(t.hero.intro, (part, key) => (
                <span key={key} className="soft-highlight">
                  {part}
                </span>
              ))}
            </p>
          </div>

          <Features t={t} />
        </section>

        {/* Right on desktop: the birth form; "See my chart" opens /chart */}
        <BirthForm t={t} />
      </main>
    </>
  );
}
