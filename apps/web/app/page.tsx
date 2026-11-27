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
 * "What you'll get" (rendered once, D-094 item 10a). Desktop: inside the hero card. Phones and
 * tablets: CSS moves it below the form and the planet table (D-064). A small "Coming soon" tag marks
 * what is not live yet (D-094 item 9): the chart drawing, the explanations and the timeline.
 */
function Features({ t }: { t: Messages }) {
  return (
    <section aria-labelledby="features-title" className="hero-features">
      <h2 id="features-title" className="sr-only">
        {t.hero.featuresLabel}
      </h2>
      {/* Inner cards: plain border, no hover highlight (D-066), no numbers (D-067) */}
      {/* Equal-height cards (auto-rows-fr), the "Coming soon" tag pinned to the bottom (D-115 item 1).
          1024–1279 px: one column, so nothing sticks out of the narrow hero (spec §1.5; full rule in 0.4.6) */}
      <ul className="grid auto-rows-fr grid-cols-1 gap-3 md:grid-cols-3 lg:mt-10 lg:grid-cols-1 xl:grid-cols-3">
        {t.hero.features.map((f) => (
          <li key={f.title} className="card-inner flex flex-col bg-raised p-4">
            <h3 className="type-h3">{f.title}</h3>
            <p className="mt-2 text-[14px] leading-[22px] text-muted">
              {f.text}
              {"soonText" in f && <> {f.soonText}</>}
            </p>
            {(("soon" in f && f.soon) || "soonText" in f) && (
              <p className="mt-auto pt-4">
                <Tag kind="soon">{t.hero.comingSoon}</Tag>
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Home() {
  const t = getMessages();

  return (
    <>
      <main className="mx-auto grid w-full max-w-[1168px] flex-1 grid-cols-1 items-start gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_520px] lg:gap-10 lg:py-12">
        {/* Left: hero. On phones and tablets the hero box itself dissolves (CSS) so the intro card comes
            first and "What you'll get" goes last: intro → form → table → cards (D-064). */}
        <section
          aria-labelledby="hero-title"
          className="hero card-outer p-4 sm:p-6 lg:p-8"
        >
          <div className="hero-intro card-outer p-4 sm:p-6">
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
              className="type-display mt-6 text-balance"
            >
              {richText(t.hero.title, (part, key) => (
                <em key={key} className="hero-em">
                  {part}
                </em>
              ))}
            </h1>

            <p className="type-body-lg mt-6 max-w-[38rem] text-pretty text-muted">
              {richText(t.hero.intro, (part, key) => (
                <span key={key} className="soft-highlight">
                  {part}
                </span>
              ))}
            </p>
          </div>

          <Features t={t} />
        </section>

        {/* Right: the birth form; the planet table appears below it (full width on desktop) */}
        <BirthForm t={t} />
      </main>
    </>
  );
}
