import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { applyReputation } from '../../shared/reputation.ts';

// Awards +1 reputation to the author of a clapped comment.
// Idempotent: each Clap record carries an `awarded` flag. Only the first
// un-awarded clap for a given clapper/comment pair pays out; the flag is
// set immediately after the point is granted so re-invocations are no-ops.
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

    // Reject self-claps
    if (comment.user_email && comment.user_email === caller.email) {
      return Response.json({ ok: true, awarded: false, note: 'cannot clap own comment' });
    }

    const authorEmail = comment.user_email;
    if (!authorEmail) {
      return Response.json({ ok: true, awarded: false, note: 'no author email' });
    }

    // Find this caller's clap(s) for this comment. Deduplicate: only one
    // award per clapper/comment pair, tracked via the `awarded` flag.
    const claps = await base44.asServiceRole.entities.Clap.filter({
      comment_id,
      clapper_user_id: caller.id
    });
    if (!claps || claps.length === 0) {
      return Response.json({ error: 'No clap record found for this caller and comment' }, { status: 403 });
    }

    // Find the first clap that hasn't been awarded yet
    const pendingClap = claps.find(c => !c.awarded);
    if (!pendingClap) {
      // All claps by this caller for this comment have already paid out
      return Response.json({ ok: true, awarded: false, note: 'already awarded' });
    }

    // Mark the clap as awarded BEFORE granting the point to prevent
    // concurrent re-invocations from double-counting.
    await base44.asServiceRole.entities.Clap.update(pendingClap.id, { awarded: true });

    const newScore = await applyReputation(base44, authorEmail, 1, 'received_delegations');

    return Response.json({ ok: true, awarded: true, reputation_score: newScore });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}