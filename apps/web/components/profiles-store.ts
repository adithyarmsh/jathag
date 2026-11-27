"use client";

// Saved profiles in the browser (step 0.4.7; lib/profiles.ts has the rules and the format). Every
// change goes through here, which stores it under localStorage "profiles" and tells every part of the
// page that shows profiles (the /profiles list, the phone menu's count). Other tabs hear about it via
// the browser's "storage" event. Nothing here ever leaves the browser.

import { useMemo, useSyncExternalStore } from "react";
import {
  byLastUsed,
  deleteProfile,
  makeProfileId,
  PROFILES_KEY,
  readProfiles,
  saveCalculated,
  touchProfile,
  writeProfiles,
  type BirthInputs,
  type Profile,
} from "@/lib/profiles";

const EVENT = "jathag-profiles";

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null; // blocked
  }
}

/** The stored text (a string, so React can tell when it changed); null when nothing or blocked. */
function rawSnapshot(): string | null {
  try {
    return storage()?.getItem(PROFILES_KEY) ?? null;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === PROFILES_KEY) onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function write(profiles: readonly Profile[]): boolean {
  const ok = writeProfiles(storage(), profiles);
  window.dispatchEvent(new Event(EVENT));
  return ok;
}

/** The saved profiles, most recently used first; null while the page is drawn on the server (not read yet). */
export function useProfiles(): Profile[] | null {
  const raw = useSyncExternalStore(subscribe, rawSnapshot, () => undefined);
  return useMemo(() => (raw === undefined ? null : byLastUsed(readProfiles({ getItem: () => raw, setItem: () => {} }))), [raw]);
}

/** How many profiles are saved; null on the server. */
export function useProfileCount(): number | null {
  return useProfiles()?.length ?? null;
}

/** One profile by id (null when it is not there, e.g. deleted in another tab). */
export function findProfile(id: string): Profile | null {
  return readProfiles(storage()).find((p) => p.id === id) ?? null;
}

/**
 * After a successful "See my chart": keeps the inputs (lib/profiles.ts, saveCalculated). Returns the
 * profile's id and the name it now has (also when storage is blocked: then nothing is kept, and the
 * chart page gets the details in memory instead, components/chart-handoff.ts).
 */
export function saveFromForm(birth: BirthInputs, name: string, editingId: string | null, defaultName: string, fallbackName?: string): { id: string; name: string } {
  const before = readProfiles(storage());
  const { profiles, id } = saveCalculated(before, {
    birth, name, editingId, now: new Date().toISOString(), newId: makeProfileId, defaultName,
  });
  const stored = write(profiles);
  // Blocked storage while editing: nothing was kept, so the page keeps the id it already has.
  if (!stored && editingId) return { id: editingId, name: name.trim() || fallbackName || defaultName };
  return { id, name: profiles.find((p) => p.id === id)!.name };
}

/** Opening a profile moves it to the top of the list. */
export function markOpened(id: string) {
  write(touchProfile(readProfiles(storage()), id, new Date().toISOString()));
}

export function removeProfile(id: string) {
  write(deleteProfile(readProfiles(storage()), id));
}
