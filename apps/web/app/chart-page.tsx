"use client";

// The chart page /chart (step 0.5.1, design spec §6, D-138). Everything here happens in the browser: the
// birth comes from this browser's saved profile (only its id is in the address) or, for "?sample", the
// made-up reference birth R01 (never saved).
//
// 1. Which birth (lib/chart-page.ts chartSourceFromUrl): "?profile=<id>" → the home form's in-memory
//    hand-off for that id (components/chart-handoff.ts; also works when storage is blocked), else the
//    saved profile. Nothing usable (no id, an unknown id, unreadable storage) → the home page, replacing
//    this entry so Back does not loop.
// 2. The result: the hand-off's when the form just calculated it (no second request), else one POST
//    /api/chart with the same body the form builds (lib/chart-page.ts requestFromBirth). State B while
//    waiting, state C ("We couldn't reach the calculator" + Try again) when it fails.
// 3. The page: details bar (name, details, coordinates on desktop, "Edit details"; the sample has "Make
//    your own chart" instead), the edit panel (the SAME form component as the home page, filled with the
//    profile, D-138 Q4 B), the contents panel and the seven sections in the D-129 order with star dividers.
//    Edit: a successful "Update chart" has already saved the same profile; the page shows the new result,
//    closes the panel and goes back to the top of the chart. Cancel closes it unchanged.
// The title is set here ("Meera's chart · Jathag"); no birth detail is ever in the title or the address.

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChartResponse } from "@jathag/api";
import { errorFor } from "@/lib/api-errors";
import { birthSummary } from "@/lib/birth-summary";
import {
  birthPlaceLabel,
  birthTime24,
  chartHeading,
  chartHref,
  chartOwner,
  chartSourceFromUrl,
  chartTitle,
  coordinatesLine,
  detailsLine,
  pickBirth,
  requestFromBirth,
  shortPlace,
  type ChartSource,
} from "@/lib/chart-page";
import { browserStore, readChartStyle, type ChartStyle } from "@/lib/chart-style";
import { headingId } from "@/lib/contents";
import { formFromBirth } from "@/lib/form-values";
import type { Messages } from "@/lib/i18n";
import { listContext } from "@/lib/list-context";
import type { BirthInputs } from "@/lib/profiles";
import { Button, ButtonLink } from "@/components/button";
import { takeHandoff, updateHandoff } from "@/components/chart-handoff";
import { Divider } from "@/components/divider";
import { findProfile, markOpened } from "@/components/profiles-store";
import { BirthChartSection } from "./birth-chart-section";
import { BirthFormCard, type FormDone } from "./birth-form";
import { ContentsPanel, useActiveSection } from "./contents-panel";
import { DashaList } from "./dasha-list";
import { LifeAreaList } from "./life-area-list";
import { ChartSection } from "./list-bits";
import { PlanetTable } from "./planet-table";
import { RightNow } from "./right-now";
import { SadeSatiSection } from "./sade-sati-section";
import { TransitList } from "./transit-list";

interface Shown {
  source: ChartSource;
  id: string | null;
  name: string;
  birth: BirthInputs;
}

type Status = { kind: "loading" } | { kind: "error"; message: string | null } | { kind: "ready"; result: ChartResponse };

const storedStyle = (): ChartStyle => readChartStyle(browserStore());

export function ChartPage({ t }: { t: Messages }) {
  const router = useRouter();
  const [shown, setShown] = useState<Shown | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [editOpen, setEditOpen] = useState(false);
  const [style, setStyle] = useState<ChartStyle>("south");
  /** A new key restarts the edit form (opened again after a change or a Cancel). */
  const [editKey, setEditKey] = useState(0);
  /** The address this page last loaded (React may keep the page alive while hidden and show it again). */
  const loadedFor = useRef<string | null>(null);
  /** Only the latest request may fill the page (an older answer arriving late is dropped). */
  const latest = useRef(0);

  async function calculate(birth: BirthInputs) {
    const mine = ++latest.current;
    setStatus({ kind: "loading" });
    const body = requestFromBirth(birth, t);
    if (!body) {
      setStatus({ kind: "error", message: t.errors.INVALID_REQUEST });
      return;
    }
    try {
      const res = await fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (mine !== latest.current) return;
      if (res.ok && data?.chart) setStatus({ kind: "ready", result: data as ChartResponse });
      else setStatus({ kind: "error", message: data ? errorFor(data?.error?.code, t.errors).message : null });
    } catch {
      if (mine === latest.current) setStatus({ kind: "error", message: null });
    }
  }

  // Which birth, once the page is in the browser (storage and the address only exist there).
  useEffect(() => {
    const search = window.location.search;
    if (loadedFor.current === search) return;
    loadedFor.current = search;
    const source = chartSourceFromUrl(search);
    const picked = pickBirth(source, { handoff: takeHandoff, profile: findProfile });
    if (!source || !picked) {
      loadedFor.current = null;
      router.replace("/");
      return;
    }
    if (picked.fromStorage && picked.id) markOpened(picked.id);
    const next: Shown = { source, id: picked.id, name: picked.name, birth: picked.birth };
    const result = picked.result;
    // "&edit" (Edit on /profiles) opens the panel once and leaves the address.
    if (source.kind === "profile" && source.edit) {
      window.history.replaceState(window.history.state, "", chartHref(source.id) + window.location.hash);
      loadedFor.current = window.location.search;
    }
    /* eslint-disable react-hooks/set-state-in-effect -- read from the address and storage, which only exist in the browser */
    setShown(next);
    setStyle(storedStyle());
    setEditOpen(source.kind === "profile" && source.edit);
    /* eslint-enable react-hooks/set-state-in-effect */
    if (result) {
      latest.current++;
      setStatus({ kind: "ready", result });
    } else void calculate(next.birth);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per address (re-run when a kept page is shown again)
  }, []);

  const owner = shown ? chartOwner(shown.source, shown.name, t.profiles.defaultName) : null;

  // The tab title: the name is the user's own label, shown only in their browser (D-138). After an
  // in-app move here, Next.js writes the page's default title once more; keep ours while on this page.
  const title = owner ? chartTitle(owner, t.chartPage) : null;
  useEffect(() => {
    if (!title) return;
    const apply = () => {
      if (document.title !== title) document.title = title;
    };
    apply();
    const mo = new MutationObserver(apply);
    mo.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => mo.disconnect();
  }, [title]);

  const ready = status.kind === "ready" ? status.result : null;
  const ctx = useMemo(() => (ready ? listContext(ready, t) : null), [ready, t]);
  const active = useActiveSection(ctx);

  // After loading: a section in the address (#transits) is scrolled to once the sections exist.
  const jumped = useRef(false);
  useEffect(() => {
    if (!ctx || jumped.current) return;
    jumped.current = true;
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [ctx]);

  /** "Update chart" succeeded: the profile is saved; show the new result and go back to the chart. */
  function edited(done: FormDone) {
    if (!shown) return;
    const next: Shown = { ...shown, id: done.id, name: done.name, birth: done.birth };
    setShown(next);
    updateHandoff({ id: done.id, name: done.name, birth: done.birth });
    if (done.id !== shown.id) window.history.replaceState(window.history.state, "", chartHref(done.id));
    setStyle(done.style);
    latest.current++;
    setStatus({ kind: "ready", result: done.result });
    setEditOpen(false);
    setEditKey((k) => k + 1);
    requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("chart")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      document.getElementById(headingId("chart"))?.focus({ preventScroll: true });
    });
  }

  const p = t.chartPage;
  const names = owner ? chartHeading(owner, p) : null;
  const shownBirth = shown
    ? birthSummary(
        { name: "", date: shown.birth.date, time: birthTime24(shown.birth), place: birthPlaceLabel(shown.birth, t), repeatedTime: shown.birth.repeatedTime ?? null },
        t,
      ).birth
    : null;
  const editStart = useMemo(() => (shown ? formFromBirth(shown.birth, shown.name === t.profiles.defaultName ? "" : shown.name) : null), [shown, t.profiles.defaultName]);

  return (
    <main className="chart-main mx-auto w-full max-w-[1168px] flex-1 px-4 py-6 sm:px-6 lg:py-8">
      <noscript>
        <p className="card-outer p-4 text-[15px]">{p.noScript}</p>
      </noscript>

      {shown && names && (
        <section aria-label={p.details.label} className="details-bar card-outer">
          <div className="min-w-0">
            <p className="font-display text-[22px] leading-7 break-words">{names.barName}</p>
            <p className="mt-1 text-[14px] leading-[22px] text-muted break-words">
              {detailsLine(shown.birth, t)}
              {ready && <span className="hidden lg:inline"> · {coordinatesLine(ready, p)}</span>}
            </p>
            {shown.source.kind === "sample" && <p className="mt-1 text-[13px] leading-5 text-muted">{p.details.sampleNote}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {shown.source.kind === "sample" ? (
              <ButtonLink href="/">{p.details.makeOwn}</ButtonLink>
            ) : (
              <Button
                variant="quiet"
                aria-expanded={editOpen}
                aria-controls="edit-panel"
                onClick={() => {
                  setEditKey((k) => k + 1);
                  setEditOpen((o) => !o);
                }}
              >
                {p.details.edit}
              </Button>
            )}
          </div>
        </section>
      )}

      {/* Edit details in place (D-138 Q4 B): the home page's form, filled with this profile */}
      {shown && editOpen && editStart && shown.id && (
        <section id="edit-panel" aria-labelledby="edit-panel-title" className="edit-panel card-outer">
          <h2 id="edit-panel-title" className="type-h3">
            {p.edit.heading}
          </h2>
          <p className="mt-1 text-[14px] leading-[22px] text-muted">{p.edit.text}</p>
          <div className="mt-5">
            <BirthFormCard
              key={editKey}
              t={t}
              start={editStart}
              editing={{ id: shown.id, name: shown.name }}
              onDone={edited}
              onCancel={() => {
                setEditOpen(false);
                document.querySelector<HTMLElement>('[aria-controls="edit-panel"]')?.focus();
              }}
            />
          </div>
        </section>
      )}

      {/* State B: calculating (spec §6.12) */}
      <div aria-live="polite">
        {status.kind === "loading" && (
          <div className="card-outer mt-6 p-4 lg:p-6">
            <p className="text-[15px] leading-6 font-semibold">{t.form.calculating.title}</p>
            <div className="busy-bar mt-2" />
            <p className="field-hint mt-2">{t.form.calculating.text}</p>
          </div>
        )}
      </div>
      {/* State C: the calculator could not be reached (or answered with an error) */}
      <div role="alert">
        {status.kind === "error" && shown && (
          <div className="card-outer mt-6 p-4 lg:p-6">
            <p className="text-[15px] leading-6 font-semibold">{status.message ?? t.form.unreachable.title}</p>
            {!status.message && <p className="field-hint mt-1">{p.unreachableText}</p>}
            <Button variant="quiet" className="mt-3" onClick={() => void calculate(shown.birth)}>
              {t.form.unreachable.retry}
            </Button>
          </div>
        )}
      </div>

      {ready && ctx && shown && names && shownBirth && (
        <div className="chart-layout">
          <ContentsPanel t={p.contents} active={active} />
          <div className="min-w-0">
            <BirthChartSection
              result={ready}
              birth={shownBirth}
              heading={names.heading}
              place={shortPlace(birthPlaceLabel(shown.birth, t))}
              northNote={style === "north" ? t.form.chartStyle.northNote : undefined}
              t={t}
            />
            <Divider />
            {/* Keyed by the calculation moment: a new result starts with every opener closed */}
            <RightNow key={`r-${ready.dashas.asOf}`} ctx={ctx} />
            <Divider />
            <DashaList key={`d-${ready.dashas.asOf}`} ctx={ctx} />
            <Divider />
            <LifeAreaList ctx={ctx} />
            <Divider />
            <SadeSatiSection key={`s-${ready.dashas.asOf}`} ctx={ctx} />
            <Divider />
            <TransitList key={`t-${ready.dashas.asOf}`} ctx={ctx} />
            <Divider />
            <PlanetsSection result={ready} t={t} />
          </div>
        </div>
      )}
    </main>
  );
}

function PlanetsSection({ result, t }: { result: ChartResponse; t: Messages }) {
  const p = t.chartPage.planets;
  return (
    <ChartSection id="planets" eyebrow={p.eyebrow} heading={p.heading} intro={p.oneLiner}>
      <div className="mt-6">
        <PlanetTable result={result} t={t} labelledBy={headingId("planets")} />
      </div>
    </ChartSection>
  );
}
