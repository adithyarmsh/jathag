import { ThemeSwitch } from "./theme-switch";

// A small, fixed starfield. Positions come from a seeded generator so every
// visit (and every build) draws exactly the same sky.
function makeStars(count: number) {
  let seed = 27; // fixed seed: 27 nakshatras
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  return Array.from({ length: count }, (_, i) => ({
    x: +(rand() * 100).toFixed(2),
    y: +(rand() * 100).toFixed(2),
    r: +(0.6 + rand() * 0.9).toFixed(2),
    o: +(0.15 + rand() * 0.35).toFixed(2),
    twinkle: i % 6 === 0,
    delay: +(rand() * 6).toFixed(2),
  }));
}

const stars = makeStars(54);

// "Horoscope / birth chart" in Indian languages, ordered by number of
// first-language speakers (Census of India 2011).
const nativeWords = [
  { lang: "hi", name: "Hindi", word: "कुंडली" },
  { lang: "bn", name: "Bengali", word: "কোষ্ঠী" },
  { lang: "te", name: "Telugu", word: "జాతకం" },
  { lang: "ta", name: "Tamil", word: "ஜாதகம்" },
  { lang: "kn", name: "Kannada", word: "ಜಾತಕ" },
  { lang: "ml", name: "Malayalam", word: "ജാതകം" },
];

function Starfield() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 h-full w-full"
      preserveAspectRatio="none"
    >
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={`${s.x}%`}
          cy={`${s.y}%`}
          r={s.r}
          fill="var(--star)"
          opacity={s.o}
          className={s.twinkle ? "twinkle" : undefined}
          style={
            s.twinkle
              ? ({ "--o": s.o, animationDelay: `${s.delay}s` } as React.CSSProperties)
              : undefined
          }
        />
      ))}
    </svg>
  );
}

function Ornament() {
  return (
    <div aria-hidden="true" className="flex items-center justify-center gap-3 text-gold">
      <span className="h-px w-16 bg-current opacity-70 sm:w-24" />
      <svg width="10" height="10" viewBox="0 0 10 10" className="fill-current">
        <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" />
      </svg>
      <span className="h-px w-16 bg-current opacity-70 sm:w-24" />
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Starfield />
      <header className="relative flex justify-end px-5 pt-5 sm:px-8 sm:pt-6">
        <ThemeSwitch />
      </header>
      <main className="relative flex flex-1 items-center justify-center px-6 py-16">
        <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
          <p className="font-serif text-5xl font-bold tracking-[0.1em] text-gold sm:text-6xl md:text-7xl">
            Jathag
          </p>
          <ul
            aria-label="Jathag in Indian languages"
            className="mt-4 grid grid-cols-3 gap-x-5 gap-y-1.5 text-sm text-muted sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-3"
          >
            {nativeWords.map((w, i) => (
              <li key={w.lang} className="flex items-center justify-center gap-x-3">
                {i > 0 && (
                  <span aria-hidden="true" className="hidden text-gold/70 sm:inline">
                    ·
                  </span>
                )}
                <span lang={w.lang} title={w.name}>
                  {w.word}
                </span>
              </li>
            ))}
          </ul>

          <div className="my-10 w-full">
            <Ornament />
          </div>

          <h1 className="font-serif text-4xl leading-tight font-normal text-balance sm:text-5xl md:text-6xl">
            Know your chart, not just your sign.
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-pretty text-muted sm:text-lg">
            A calm, precise Vedic astrology app. Accurate charts, honest explanations, no ads, no
            fear.
          </p>

          <p className="mt-10 rounded-full border border-gold/50 px-4 py-1.5 text-xs font-medium tracking-[0.2em] text-gold uppercase">
            Coming soon
          </p>
        </div>
      </main>

      <footer className="relative px-6 pb-8 text-center text-sm text-muted">
        © 2026 Jathag ·{" "}
        <a
          href="https://github.com/adithyarmsh/jathag"
          className="underline decoration-gold/60 underline-offset-4 hover:text-fg"
        >
          Open source
        </a>{" "}
        (AGPL-3.0)
      </footer>
    </>
  );
}
