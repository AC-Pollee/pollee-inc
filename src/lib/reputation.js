import { base44 } from '@/api/base44Client';

// Reputation tiers — kept in sync with the backend issue-strike function
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
 * Award (or deduct, with negative `points`) reputation to the current user.
 * Only the logged-in user's own record is updated, so this works under RLS.
 *
 * @param {string} userEmail - the user being awarded (must be the current user)
 * @param {number} points    - points to add (negative to deduct)
 * @param {string} breakdownKey - one of: approved_comments, verified_votes,
 *   successful_delegations, received_delegations, flagged_content
 */
export async function awardReputation(userEmail, points, breakdownKey) {
  if (!userEmail) return null;
  const users = await base44.entities.User.filter({ email: userEmail });
  const user = users[0];
  if (!user) return null;

  const currentScore = typeof user.reputation_score === 'number' ? user.reputation_score : 100;
  const newScore = Math.max(0, Math.min(1000, currentScore + points));
  const breakdown = user.reputation_breakdown || {};
  const newBreakdown = { ...breakdown, [breakdownKey]: (breakdown[breakdownKey] || 0) + 1 };

  await base44.entities.User.update(user.id, {
    reputation_score: newScore,
    reputation_breakdown: newBreakdown,
    reputation_level: levelFor(newScore),
  });
  return newScore;
}