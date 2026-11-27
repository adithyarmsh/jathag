// A page that is not built yet (step 0.4.5, founder-confirmed: no dead links in the header or footer).
// The app shell comes from the layout; here: an eyebrow, the page's h1, one muted line, a "Coming soon"
// tag and a quiet button back to the home page. Each page is filled at its own roadmap step.

import type { Metadata } from "next";
import { getMessages, richText } from "@/lib/i18n";
import { ButtonLink } from "./button";
import { Card } from "./card";
import { Tag } from "./tag";

export type PlaceholderKey = "profiles" | "settings" | "about" | "faq" | "disclaimer" | "privacy" | "sources";

/** Each page's own <title> and description (SEO groundwork, spec §4); robots stay noindex (layout). */
export function placeholderMetadata(key: PlaceholderKey): Metadata {
  const p = getMessages().pages[key];
  return { title: p.title, description: p.description, openGraph: { title: p.title, description: p.description } };
}

export function PlaceholderPage({ page }: { page: PlaceholderKey }) {
  const t = getMessages().pages;
  const p = t[page];
  return (
    <main className="mx-auto w-full max-w-[808px] flex-1 px-4 py-11 sm:px-6 lg:py-16">
      <Card as="section" aria-labelledby="page-title" className="flex flex-col items-start gap-4 lg:p-8">
        <p className="type-label">{p.eyebrow}</p>
        <h1 id="page-title" className="type-h1 text-balance">
          {richText(p.heading, (part, key) => (
            <em key={key} className="hero-em">
              {part}
            </em>
          ))}
        </h1>
        <p className="type-body-lg text-muted">{t.placeholder.text}</p>
        <Tag kind="soon">{t.placeholder.comingSoon}</Tag>
        <ButtonLink href="/" variant="quiet" className="mt-2">
          {t.placeholder.back}
        </ButtonLink>
      </Card>
    </main>
  );
}
