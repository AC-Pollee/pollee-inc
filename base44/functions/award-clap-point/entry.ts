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

// Awards +1 reputation to the author of a clapped comment.
// Runs as the service role so any logged-in user's clap counts (bypasses User RLS).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { comment_id } = body || {};
    if (!comment_id) {
      return Response.json({ error: 'comment_id is required' }, { status: 400 });
    }

    const comment = await base44.asServiceRole.entities.Comment.get(comment_id);
    if (!comment) return Response.json({ error: 'Comment not found' }, { status: 404 });

    const authorEmail = comment.user_email;
    if (!authorEmail) {
      return Response.json({ ok: true, awarded: false, note: 'no author email' });
    }

    const users = await base44.asServiceRole.entities.User.filter({ email: authorEmail });
    const author = users[0];
    if (!author) {
      return Response.json({ ok: true, awarded: false, note: 'author not found' });
    }

    const currentScore = typeof author.reputation_score === 'number' ? author.reputation_score : 100;
    const newScore = Math.min(1000, currentScore + 1);

    await base44.asServiceRole.entities.User.update(author.id, {
      reputation_score: newScore,
      reputation_level: levelFor(newScore)
    });

    return Response.json({ ok: true, awarded: true, reputation_score: newScore });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}