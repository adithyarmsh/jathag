// Footer (design spec §4, FR-UI-04, D-068, D-094): a 1 px line on top. Line 1: About · FAQ ·
// Disclaimer · Privacy · Sources & credits · Source code (the AGPL source). Line 2: the licence line.
// Then "v<step> · <commit> · Made by Adithya": on the right on desktop, the last line on phones.

import Link from "next/link";
import { richText, type Messages } from "@/lib/i18n";
import { AUTHOR_URL, FOOTER_HREF, FOOTER_LINKS } from "@/lib/shell";
import { STEP, versionLabel } from "@/lib/version";

export function SiteFooter({ t, commit }: { t: Messages["footer"]; commit: string | undefined }) {
  return (
    <footer className="site-footer mt-auto border-t border-line">
      <div className="type-small page-frame flex max-w-[1168px] flex-col gap-3 px-4 pt-6 pb-7 text-muted sm:px-6 lg:flex-row lg:justify-between lg:gap-6">
        <div className="flex flex-col gap-3 lg:gap-1.5">
          <nav aria-label={t.label}>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 lg:gap-x-[18px]">
              {FOOTER_LINKS.map((l) => (
                <li key={l}>
                  {l === "sourceCode" ? (
                    <a href={FOOTER_HREF[l]} className="footer-link inline-block py-1 lg:py-0">
                      {t.links[l]}
                    </a>
                  ) : (
                    <Link href={FOOTER_HREF[l]} className="footer-link inline-block py-1 lg:py-0">
                      {t.links[l]}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
          <p>{t.licence}</p>
        </div>
        <p className="tabular-nums lg:self-end">
          {/* Version of the site (D-094 item 8): the step number lives in lib/version.ts only */}
          {versionLabel(STEP, commit, t)} ·{" "}
          {richText(t.madeBy, (part, key) => (
            <a key={key} href={AUTHOR_URL} target="_blank" rel="noopener noreferrer" className="footer-link">
              {part}
              <span className="sr-only"> {t.newTab}</span>
            </a>
          ))}
        </p>
      </div>
    </footer>
  );
}
