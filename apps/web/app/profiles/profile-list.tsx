"use client";

// The saved profiles on /profiles (step 0.4.7, design spec §11, the Profiles board, D-136). The page
// itself is drawn on the server (title, notice, "New chart"); this part fills in from the browser's
// storage. Until storage has been read it shows nothing visible (no flash of the empty state when
// there are profiles). Then: empty state A, or one card per profile, most recently used first, with
// Open (primary link) · Edit · Delete.
//
// Delete asks inside the card (role="alertdialog"): focus starts on "Keep it", Esc = Keep it (focus
// back on that card's Delete), and after deleting focus moves to the next card (or the one before),
// or to the "New chart" button when none is left.

import { useEffect, useMemo, useRef, useState } from "react";
import { fill } from "@/lib/chart-format";
import type { Messages } from "@/lib/i18n";
import { profileHref } from "@/lib/profile-link";
import { focusAfterDelete, profileCardView, type ProfileCardView } from "@/lib/profiles-view";
import { Button, buttonClass, ButtonLink } from "@/components/button";
import { STAR_D } from "@/components/icons";
import { removeProfile, useProfiles } from "@/components/profiles-store";

type ProfilesText = Messages["profiles"];

/** Element ids inside the list (also used to move focus). */
export const profileIds = {
  name: (id: string) => `profile-${id}-name`,
  open: (id: string) => `profile-${id}-open`,
  remove: (id: string) => `profile-${id}-delete`,
  question: (id: string) => `profile-${id}-question`,
  text: (id: string) => `profile-${id}-text`,
  keep: (id: string) => `profile-${id}-keep`,
};

/** State A (spec §6.12): gold star, heading, one line, "Make a chart". */
export function ProfilesEmpty({ t }: { t: ProfilesText }) {
  return (
    <section aria-labelledby="profiles-empty-title" className="card-outer flex flex-col items-center gap-2.5 px-5 py-8 text-center">
      <svg aria-hidden="true" focusable="false" width="28" height="28" viewBox="0 0 24 24" className="profile-empty-star">
        <path d={STAR_D} />
      </svg>
      <h2 id="profiles-empty-title" className="font-display text-[22px] leading-7">
        {t.empty.heading}
      </h2>
      <p className="text-[14px] leading-[22px] text-muted">{t.empty.text}</p>
      <ButtonLink href="/" className="mt-1.5">
        {t.empty.action}
      </ButtonLink>
    </section>
  );
}

/** The cards (exported for the render tests: no storage needed). */
export function ProfilesBoard({
  t,
  cards,
  confirmId,
  onAskDelete,
  onKeep,
  onDelete,
}: {
  t: ProfilesText;
  cards: readonly ProfileCardView[];
  /** The card whose delete check is open, if any. */
  confirmId: string | null;
  onAskDelete: (id: string) => void;
  onKeep: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <ul aria-label={t.listLabel} className="profile-grid">
      {cards.map((c) => (
        <li key={c.id}>
          <article aria-labelledby={profileIds.name(c.id)} className="card-outer profile-card">
            <div>
              <h2 id={profileIds.name(c.id)} className="font-display text-[22px] leading-7 break-words">
                {c.name}
              </h2>
              <p className="mt-1 text-[14px] leading-[22px] text-muted break-words tabular-nums">
                {c.when}
                <br />
                {c.place}
              </p>
            </div>
            {confirmId === c.id ? (
              <div
                role="alertdialog"
                aria-labelledby={profileIds.question(c.id)}
                aria-describedby={profileIds.text(c.id)}
                className="profile-confirm"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    onKeep(c.id);
                  }
                }}
              >
                <p className="text-[14px] leading-[22px]">
                  <strong id={profileIds.question(c.id)} className="font-semibold">
                    {fill(t.confirm.question, { name: c.name })}
                  </strong>{" "}
                  <span id={profileIds.text(c.id)}>{t.confirm.text}</span>
                </p>
                <div className="flex gap-2">
                  <Button id={profileIds.keep(c.id)} variant="quiet" className="profile-btn" onClick={() => onKeep(c.id)}>
                    {t.confirm.keep}
                  </Button>
                  <Button variant="destructive" className="profile-btn" onClick={() => onDelete(c.id)}>
                    {t.confirm.delete}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                {/* Plain links (a full page load): the chart page reads the id from the address (0.5.1) */}
                <a
                  id={profileIds.open(c.id)}
                  href={profileHref("open", c.id)}
                  aria-label={fill(t.openLabel, { name: c.name })}
                  className={buttonClass("primary", false, "profile-btn")}
                >
                  {t.open}
                </a>
                <a href={profileHref("edit", c.id)} aria-label={fill(t.editLabel, { name: c.name })} className={buttonClass("quiet", false, "profile-btn")}>
                  {t.edit}
                </a>
                <Button
                  id={profileIds.remove(c.id)}
                  variant="quiet"
                  aria-label={fill(t.deleteLabel, { name: c.name })}
                  className="profile-btn"
                  onClick={() => onAskDelete(c.id)}
                >
                  {t.delete}
                </Button>
              </div>
            )}
          </article>
        </li>
      ))}
    </ul>
  );
}

export function ProfileList({ t, messages, newChartId }: { t: ProfilesText; messages: Messages; newChartId: string }) {
  const profiles = useProfiles();
  const cards = useMemo(() => profiles?.map((p) => profileCardView(p, messages)) ?? null, [profiles, messages]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  /** Where focus goes after the next render (an element id). */
  const focusNext = useRef<string | null>(null);

  useEffect(() => {
    const target = focusNext.current;
    if (!target) return;
    focusNext.current = null;
    document.getElementById(target)?.focus();
  });

  if (!cards) {
    // Not read yet: nothing visible (screen readers hear that it is loading).
    return (
      <p aria-live="polite" className="sr-only">
        {t.loading}
      </p>
    );
  }

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
      {cards.length === 0 ? (
        <ProfilesEmpty t={t} />
      ) : (
        <ProfilesBoard
          t={t}
          cards={cards}
          confirmId={confirmId && cards.some((c) => c.id === confirmId) ? confirmId : null}
          onAskDelete={(id) => {
            setConfirmId(id);
            focusNext.current = profileIds.keep(id);
          }}
          onKeep={(id) => {
            setConfirmId(null);
            focusNext.current = profileIds.remove(id);
          }}
          onDelete={(id) => {
            const next = focusAfterDelete(
              cards.map((c) => c.id),
              id,
            );
            const name = cards.find((c) => c.id === id)?.name ?? "";
            setConfirmId(null);
            removeProfile(id);
            setAnnounce(fill(t.deleted, { name }));
            focusNext.current = next ? profileIds.open(next) : newChartId;
          }}
        />
      )}
    </>
  );
}
