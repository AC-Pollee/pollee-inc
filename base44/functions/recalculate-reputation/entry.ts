import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Reputation tiers — kept in sync with src/lib/reputation.js and issue-strike
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

const BASE = 100;
// Point values mirror the live award paths and the ReputationScore UI.
const POINTS = {
  verified_votes: 5,
  approved_comments: 3,
  successful_delegations: 10,
  received_delegations: 15,
  claps_received: 1,
  flagged_content: -3,
};

// Recalculates every user's reputation_score + breakdown from their actual
// actions across all polls (comments, votes, claps, delegations, strikes).
// Admin-only maintenance op. Runs as the service role to update all users.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const isAdmin = caller.role === 'admin' || caller.email === 'ac@acproductiondesign.com';
    if (!isAdmin) return Response.json({ error: 'Admin only' }, { status: 403 });

    const [users, comments, votes, claps, delegations] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.Comment.list(),
      base44.asServiceRole.entities.Vote.list(),
      base44.asServiceRole.entities.Clap.list(),
      base44.asServiceRole.entities.Delegation.list(),
    ]);

    const byEmail = new Map(users.map(u => [u.email, u.id]));
    const stats = new Map();
    for (const u of users) {
      stats.set(u.id, {
        approved_comments: 0,
        verified_votes: 0,
        claps_received: 0,
        successful_delegations: 0,
        received_delegations: 0,
        flagged_content: 0,
        strikes_minor: 0,
        strikes_moderate: 0,
        strikes_severe: 0,
      });
    }

    // Comments — approved (default status) count toward approved_comments.
    for (const c of comments) {
      const uid = byEmail.get(c.user_email);
      if (!uid) continue;
      const s = stats.get(uid);
      if (c.moderation_status === 'approved' || !c.moderation_status) s.approved_comments += 1;
    }
    // Votes — verified votes count toward verified_votes.
    for (const v of votes) {
      if (!stats.has(v.voter_id)) continue;
      if (v.status === 'verified') stats.get(v.voter_id).verified_votes += 1;
    }
    // Claps — each clap received adds +1 to the comment author.
    for (const cl of claps) {
      const uid = byEmail.get(cl.target_user_email);
      if (uid) stats.get(uid).claps_received += 1;
    }
    // Delegations — only verified delegations count.
    for (const d of delegations) {
      if (d.status !== 'verified') continue;
      if (stats.has(d.delegator_user_id)) stats.get(d.delegator_user_id).successful_delegations += 1;
      if (stats.has(d.delegate_user_id)) stats.get(d.delegate_user_id).received_delegations += 1;
    }
    // Strikes — flagged_content = number of strikes (matches issue-strike's live award).
    for (const u of users) {
      const s = stats.get(u.id);
      const strikes = Array.isArray(u.strikes) ? u.strikes : [];
      s.flagged_content = strikes.length;
      for (const st of strikes) {
        if (st.severity === 'minor') s.strikes_minor += 1;
        else if (st.severity === 'moderate') s.strikes_moderate += 1;
        else if (st.severity === 'severe') s.strikes_severe += 1;
      }
    }

    const results = [];
    for (const u of users) {
      const s = stats.get(u.id);
      let score = BASE;
      for (const key of Object.keys(POINTS)) {
        score += (s[key] || 0) * POINTS[key];
      }
      score = Math.max(0, Math.min(1000, Math.round(score)));
      const breakdown = {
        verified_votes: s.verified_votes,
        approved_comments: s.approved_comments,
        successful_delegations: s.successful_delegations,
        received_delegations: s.received_delegations,
        strikes_minor: s.strikes_minor,
        strikes_moderate: s.strikes_moderate,
        strikes_severe: s.strikes_severe,
        flagged_content: s.flagged_content,
        claps_received: s.claps_received,
      };
      await base44.asServiceRole.entities.User.update(u.id, {
        reputation_score: score,
        reputation_breakdown: breakdown,
        reputation_level: levelFor(score),
      });
      results.push({ email: u.email, reputation_score: score, reputation_level: levelFor(score), breakdown });
    }

    return Response.json({ ok: true, audited: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}