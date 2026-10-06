// Server-side reputation helper. Computes and applies reputation changes
// via the service role so clients cannot grant themselves arbitrary points.

const LEVELS = [
  { name: 'champion', min: 751 },
  { name: 'trusted', min: 501 },
  { name: 'contributor', min: 251 },
  { name: 'member', min: 101 },
  { name: 'newcomer', min: 0 },
];

function levelFor(score) {
  for (const l of LEVELS) if (score >= l.min) return l.name;
  return 'newcomer';
}

/**
 * Award (or deduct, with negative `points`) reputation to a user by email.
 * Looks up the User record and writes via the service role.
 *
 * @param base44   - service-role-enabled client
 * @param email    - the user being awarded
 * @param points   - points to add (negative to deduct)
 * @param breakdownKey - one of: approved_comments, verified_votes,
 *   successful_delegations, received_delegations, flagged_content
 * @returns the new score, or null if the user was not found
 */
export async function applyReputation(base44, email, points, breakdownKey) {
  if (!email) return null;
  const users = await base44.asServiceRole.entities.User.filter({ email });
  const user = users[0];
  if (!user) return null;

  const currentScore = typeof user.reputation_score === 'number' ? user.reputation_score : 100;
  const newScore = Math.max(0, Math.min(1000, currentScore + points));
  const breakdown = user.reputation_breakdown || {};
  const newBreakdown = { ...breakdown, [breakdownKey]: (breakdown[breakdownKey] || 0) + 1 };

  await base44.asServiceRole.entities.User.update(user.id, {
    reputation_score: newScore,
    reputation_breakdown: newBreakdown,
    reputation_level: levelFor(newScore),
  });
  return newScore;
}