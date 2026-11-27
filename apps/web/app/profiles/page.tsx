// "Your charts" (step 0.4.7, design spec §11, the Profiles board, D-136). Drawn on the server: eyebrow,
// h1, "New chart" (right of the title from 640 px, under it on phones) and the FR-PROF-03 notice. The
// saved profiles themselves live only in this browser, so the list fills in there (profile-list.tsx).
// Content width 928 px as on the board (three 300 px cards in a row on desktop).
// The page keeps its own title and description (en.json pages.profiles); the site stays noindex.

import type { Metadata } from "next";
import { ButtonLink } from "@/components/button";
import { Notice } from "@/components/notice";
import { getMessages } from "@/lib/i18n";
import { ProfileList } from "./profile-list";

const NEW_CHART_ID = "profiles-new-chart";

export function generateMetadata(): Metadata {
  const p = getMessages().pages.profiles;
  return { title: p.title, description: p.description, openGraph: { title: p.title, description: p.description } };
}

export default function ProfilesPage() {
  const t = getMessages();
  const p = t.pages.profiles;
  return (
    <main className="mx-auto flex w-full max-w-[976px] flex-1 flex-col gap-[18px] px-4 pt-7 pb-14 sm:px-6 lg:pt-12 lg:pb-16">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="type-label">{p.eyebrow}</p>
          <h1 className="type-h1 mt-1">{p.heading}</h1>
        </div>
        <ButtonLink href="/" id={NEW_CHART_ID}>
          {t.profiles.newChart}
        </ButtonLink>
      </div>
      <Notice>
        <p>{t.profiles.notice}</p>
      </Notice>
      <ProfileList t={t.profiles} messages={t} newChartId={NEW_CHART_ID} />
    </main>
  );
}
