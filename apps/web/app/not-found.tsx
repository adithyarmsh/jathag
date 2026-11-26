// Page not found (design spec §6.12 state G), inside the app shell.

import type { Metadata } from "next";
import { ButtonLink } from "@/components/button";
import { Card } from "@/components/card";
import { getMessages } from "@/lib/i18n";

const t = getMessages().pages.notFound;

export const metadata: Metadata = { title: t.title, description: t.description };

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-[808px] flex-1 px-4 py-11 sm:px-6 lg:py-16">
      <Card as="section" aria-labelledby="not-found-title" className="flex flex-col items-center gap-3 px-5 py-8 text-center lg:py-10">
        <h1 id="not-found-title" className="type-h2 text-balance">
          {t.heading}
        </h1>
        <p className="text-[14px] leading-[22px] text-muted">{t.text}</p>
        <ButtonLink href="/" className="mt-2">
          {t.button}
        </ButtonLink>
      </Card>
    </main>
  );
}
