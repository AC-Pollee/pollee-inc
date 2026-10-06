// Reputation tiers — kept for read-only display components that import this file.
// Reputation awarding is now performed server-side by backend functions
// (cast-vote, post-comment, award-clap-point, issue-strike) via the shared
// base44/shared/reputation.ts helper. Clients must not write reputation fields.
//
// This module is retained only for the level lookup used by display components.

const LEVELS = [
  { name: 'champion', min: 751 },
  { name: 'trusted', min: 501 },
  { name: 'contributor', min: 251 },
  { name: 'member', min: 101 },
  { name: 'newcomer', min: 0 },
];

export function levelFor(score) {
  for (const l of LEVELS) if (score >= l.min) return l.name;
  return 'newcomer';
}