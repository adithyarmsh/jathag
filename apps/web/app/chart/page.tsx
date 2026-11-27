// The chart page /chart (step 0.5.1, design spec §6, D-138). The birth lives only in this browser (a saved
// profile, by id) or is the made-up sample, so the page is filled in there (app/chart-page.tsx); the server
// sends the frame with its own title and description. The tab title is changed in the browser to the
// chart's name ("Meera's chart · Jathag"). Still noindex, like the whole site.

import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n";
import { ChartPage } from "../chart-page";

export function generateMetadata(): Metadata {
  const p = getMessages().chartPage;
  return { title: p.titleOwn, description: p.description, openGraph: { title: p.titleOwn, description: p.description } };
}

export default function Chart() {
  return <ChartPage t={getMessages()} />;
}
