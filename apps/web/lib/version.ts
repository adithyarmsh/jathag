// The version shown in the footer (D-094 item 8): "v<step> · <short commit>", e.g. "v0.2.15 · 7e5a8dc".
//
// STEP is the roadmap step of this pull request; it is the ONLY place the step number lives.
// Update it in every PR (CLAUDE.md, "End of every PR"). The commit comes from Vercel at build time
// (VERCEL_GIT_COMMIT_SHA); locally there is none, so only the step is shown.

export const STEP = "0.3.5.1";

export function versionLabel(
  step: string,
  commitSha: string | undefined,
  t: { version: string; versionLocal: string },
): string {
  const commit = commitSha?.trim().slice(0, 7);
  return commit
    ? t.version.replace("{step}", step).replace("{commit}", commit)
    : t.versionLocal.replace("{step}", step);
}
