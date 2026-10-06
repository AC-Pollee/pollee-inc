/**
 * Post a comment with server-side validation and reputation awarding.
 *
 * Authenticates the caller, creates the comment record, and awards +3
 * reputation to the author for contributing to the discussion. The reputation
 * award is computed and applied server-side so clients cannot grant
 * themselves arbitrary points.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { applyReputation } from '../../shared/reputation.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      poll_id,
      content,
      parent_comment_id,
      display_name,
      author_type,
      is_junior_member,
      is_infomarian_content
    } = body || {};

    if (!poll_id || !content || !content.trim()) {
      return Response.json({ error: 'poll_id and content are required' }, { status: 400 });
    }

    // Verify poll exists and discussion is open
    const polls = await base44.asServiceRole.entities.Poll.filter({ id: poll_id });
    const poll = polls[0];
    if (!poll) return Response.json({ error: 'Poll not found' }, { status: 404 });
    if (poll.discussion_status === 'archived') {
      return Response.json({ error: 'Discussion is archived' }, { status: 400 });
    }

    const resolvedName = author_type === 'public'
      ? (display_name || '').trim()
      : (caller.full_name || caller.email);
    if (author_type === 'public' && !resolvedName) {
      return Response.json({ error: 'Display name is required for public comments' }, { status: 400 });
    }

    const comment = await base44.asServiceRole.entities.Comment.create({
      poll_id,
      user_name: resolvedName,
      user_email: caller.email,
      display_name: author_type === 'public' ? resolvedName : undefined,
      content: content.trim(),
      parent_comment_id: parent_comment_id || undefined,
      author_type: author_type || 'member',
      responsibility_accepted: true,
      is_junior_member: !!is_junior_member,
      moderation_status: 'approved',
      is_infomarian_content: !!is_infomarian_content
    });

    // Award +3 reputation to the author for contributing (server-side)
    await applyReputation(base44, caller.email, 3, 'approved_comments').catch(() => {});

    return Response.json({ ok: true, comment });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}