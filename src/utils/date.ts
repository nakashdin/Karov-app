/**
 * Today's date as YYYY-MM-DD, in the LOCAL timezone — never
 * `new Date().toISOString().slice(0, 10)`, which is UTC. Israel is UTC+3
 * (UTC+2 in winter); found live, 2026-08-27, in scripts/shared/kashrut-
 * write.mjs's own history (this is the canonical home now — that file
 * keeps a deliberate mirror instead of a second independent
 * implementation, see that file's own header for why): a write at ~02:47
 * local computed "2026-08-26" and stamped it as `lastVerifiedAt`,
 * backdating every write inside the ~2-3 hour window after local midnight
 * for as long as the UTC pattern existed.
 *
 * Same bug found a second time, live, in src/utils/certificate.ts's
 * getCertificateState — display/filter code this time, not a write path.
 * The stakes there are sharper: on the night 152 certificates all expire
 * simultaneously (2026-09-11 → 09-12), the UTC pattern makes the app read
 * every one of them as still valid for the ~2-3 hours after Israeli local
 * midnight when they have, in fact, already lapsed — the app asserting a
 * certificate is current at the exact hour it stops being true, across 152
 * businesses at once. `toISOString()` is the obvious thing to reach for
 * here; it is wrong for this specific use, which is why every caller that
 * needs "today" in the sense a user in Israel means it routes through this
 * function instead of calling it directly.
 *
 * `when` is injectable, defaulting to `new Date()`, SPECIFICALLY so this
 * can be pinned by a test that constructs a known UTC instant falling near
 * local midnight and asserts the LOCAL calendar date, not the UTC one —
 * without that, a correctness test can only pass "because the machine
 * happens to be run at a moment where the two agree," which is most of any
 * given day and proves nothing about the ~2-3 hour window that actually
 * matters (Reviewer's own framing, 2026-08-27).
 */
export function localDateISO(when: Date = new Date()): string {
  const y = when.getFullYear();
  const m = String(when.getMonth() + 1).padStart(2, '0');
  const day = String(when.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
