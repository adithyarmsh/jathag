"use client";

// "Dasha periods" (step 0.3.7, D-113 item 2, FR-TM-01…04): the Mahadashas from birth; each opens to its
// Antardashas, each of those to its Pratyantardashas. Sub-rows are only put on the page when opened
// (up to 729 Pratyantardashas otherwise). Openers are buttons with aria-expanded. The current period at
// each level says "You are here"; the one running at birth shows its true start and "Began before birth";
// periods that ended before birth are not shown (D-113 item 3). 0.3.7.2 (D-117 item 3): each row has a
// left rule in its level's colour, the same tokens as the "Right now" tiers (--tier-1/2/3).

import { useState, type ReactNode } from "react";
import { fill } from "@/lib/chart-format";
import { antardashaRows, mahadashaRows, pratyantardashaRows, type PeriodRow } from "@/lib/dasha-view";
import type { DashaLevel, ListContext } from "@/lib/list-context";
import { Chevron, ListCard, Marker, Sep } from "./list-bits";

function RowText({ row, ctx }: { row: PeriodRow; ctx: ListContext }) {
  const t = ctx.t.lists;
  return (
    <span className="dasha-row-text">
      <span className="dasha-lord">{row.lordName}</span>
      <Sep />
      <span className="tabular-nums">{row.range}</span>
      {(row.current || row.beganBeforeBirth) && (
        <span className="flex flex-wrap gap-1.5">
          {row.current && (
            <>
              <Sep />
              <Marker strong>{t.youAreHere}</Marker>
            </>
          )}
          {row.beganBeforeBirth && (
            <>
              <Sep />
              <Marker>{t.beganBeforeBirth}</Marker>
            </>
          )}
        </span>
      )}
    </span>
  );
}

const pluralLabel = (level: DashaLevel, ctx: ListContext) =>
  fill(ctx.t.lists.levelLabel, { level: ctx.t.lists.levelsPlural[level], term: ctx.t.lists.terms[level] });

/** "Antardashas (medium-term) in the Venus Mahadasha" */
function subLabel(child: DashaLevel, parent: PeriodRow, ctx: ListContext) {
  const t = ctx.t.lists;
  return fill(t.subListLabel, { levels: t.levelsPlural[child], term: t.terms[child], lord: parent.lordName, level: t.levels[parent.level] });
}

function SubList({ id, label, rows, render }: { id: string; label: string; rows: PeriodRow[]; render: (r: PeriodRow) => ReactNode }) {
  return (
    <div id={id} className="dasha-sub">
      <p id={`${id}-label`} className="text-sm font-semibold text-muted">
        {label}
      </p>
      <ol aria-labelledby={`${id}-label`} className="mt-1">
        {rows.map(render)}
      </ol>
    </div>
  );
}

export function DashaList({ ctx }: { ctx: ListContext }) {
  const t = ctx.t.lists;
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (key: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  // A plain function, not a component: a component defined here would be re-created on every render,
  // and the button would lose keyboard focus when it is pressed.
  function opener(row: PeriodRow, child: DashaLevel, levelClass: string) {
    const isOpen = open.has(row.key);
    const subId = `dasha-sub-${row.key}`;
    return (
      <button
        type="button"
        className={`dasha-opener dasha-row ${levelClass}`}
        aria-expanded={isOpen}
        aria-controls={isOpen ? subId : undefined}
        onClick={() => toggle(row.key)}
      >
        <Chevron open={isOpen} />
        <RowText row={row} ctx={ctx} />
        <span className="sr-only">
          {" "}
          ({fill(t.opensLabel, { levels: t.levelsPlural[child], lord: row.lordName, level: t.levels[row.level] })})
        </span>
      </button>
    );
  }

  const renderPratyantar = (r: PeriodRow) => (
    <li key={r.key} className="dasha-leaf dasha-row dasha-row-3">
      <RowText row={r} ctx={ctx} />
    </li>
  );

  const renderAntar = (r: PeriodRow) => (
    <li key={r.key}>
      {opener(r, "pratyantardasha", "dasha-row-2")}
      {open.has(r.key) && (
        <SubList
          id={`dasha-sub-${r.key}`}
          label={subLabel("pratyantardasha", r, ctx)}
          rows={pratyantardashaRows(ctx, r.path[0]!, r.path[1]!)}
          render={renderPratyantar}
        />
      )}
    </li>
  );

  const renderMaha = (r: PeriodRow) => (
    <li key={r.key}>
      {opener(r, "antardasha", "dasha-row-1")}
      {open.has(r.key) && (
        <SubList id={`dasha-sub-${r.key}`} label={subLabel("antardasha", r, ctx)} rows={antardashaRows(ctx, r.path[0]!)} render={renderAntar} />
      )}
    </li>
  );

  return (
    <ListCard id="dasha-list-title" title={t.dashas.title}>
      <p className="mt-1 text-sm text-muted">{t.dashas.intro}</p>
      <p className="mt-1 text-sm text-muted">{fill(t.clockNote, { offset: ctx.offset })}</p>
      <h3 id="dasha-maha-label" className="list-subheading mt-5">
        {pluralLabel("mahadasha", ctx)}
      </h3>
      <ol aria-labelledby="dasha-maha-label" className="mt-2">
        {mahadashaRows(ctx).map(renderMaha)}
      </ol>
    </ListCard>
  );
}
