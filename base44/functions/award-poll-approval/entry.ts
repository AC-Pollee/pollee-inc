import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

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

const AWARD_POINTS = 10;

// Awards +10 reputation to the creator of a poll when it is approved.
// Idempotent: the poll's `reputation_awarded` flag guarantees the bonus is
// only ever paid once per poll. Runs as the service role so the moderator who
// approves the poll can update the creator's record (bypasses User RLS).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { poll_id } = body || {};
    if (!poll_id) return Response.json({ error: 'poll_id is required' }, { status: 400 });

    const poll = await base44.asServiceRole.entities.Poll.get(poll_id);
    if (!poll) return Response.json({ error: 'Poll not found' }, { status: 404 });

    if (poll.moderation_status !== 'approved') {
      return Response.json({ ok: true, awarded: false, note: 'poll not approved' });
    }
    if (poll.reputation_awarded) {
      return Response.json({ ok: true, awarded: false, note: 'already awarded' });
    }

    const creatorId = poll.created_by_id;
    if (!creatorId) {
      await base44.asServiceRole.entities.Poll.update(poll_id, { reputation_awarded: true });
      return Response.json({ ok: true, awarded: false, note: 'no creator recorded' });
    }

    const creator = await base44.asServiceRole.entities.User.get(creatorId);
    if (!creator) {
      await base44.asServiceRole.entities.Poll.update(poll_id, { reputation_awarded: true });
      return Response.json({ ok: true, awarded: false, note: 'creator not found' });
    }

    const currentScore = typeof creator.reputation_score === 'number' ? creator.reputation_score : 100;
    const newScore = Math.max(0, Math.min(1000, currentScore + AWARD_POINTS));
    const breakdown = creator.reputation_breakdown || {};
    const newBreakdown = { ...breakdown, approved_polls: (breakdown.approved_polls || 0) + 1 };

    await base44.asServiceRole.entities.User.update(creator.id, {
      reputation_score: newScore,
      reputation_breakdown: newBreakdown,
      reputation_level: levelFor(newScore)
    });
    await base44.asServiceRole.entities.Poll.update(poll_id, { reputation_awarded: true });

    return Response.json({ ok: true, awarded: true, reputation_score: newScore });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}