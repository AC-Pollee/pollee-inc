import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Lets any authenticated member privately forward a discussion comment to
// another member. Creates (or reuses) a 1:1 conversation, delivers the
// forwarded text as a private message, and records a moderation task for the
// poll's assigned Infomarians (falling back to all active Infomarians) so the
// forward is reviewable by an Infomarian or Admin and above.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const targetUserId = body?.target_user_id;
    const pollId = body?.poll_id || null;
    const commentId = body?.comment_id || null;
    const content = (body?.content || '').trim();
    if (!targetUserId) return Response.json({ error: 'target_user_id is required' }, { status: 400 });
    if (!content) return Response.json({ error: 'Message content is empty' }, { status: 400 });
    if (targetUserId === caller.id) return Response.json({ error: 'Cannot share to yourself' }, { status: 400 });

    const target = await base44.asServiceRole.entities.User.get(targetUserId);
    if (!target) return Response.json({ error: 'User not found' }, { status: 404 });

    const callerName = `${caller.full_name || ''} ${caller.last_name || ''}`.trim() || caller.email;
    const targetName = `${target.full_name || ''} ${target.last_name || ''}`.trim() || target.email;
    const participants = [caller.id, target.id];
    const participantNames = [
      { user_id: caller.id, name: callerName, email: caller.email },
      { user_id: target.id, name: targetName, email: target.email }
    ];

    // Reuse an existing active conversation between these two, if any
    const existing = await base44.asServiceRole.entities.Conversation.list();
    let conversation = existing.find(c =>
      Array.isArray(c.participants) &&
      c.participants.length === 2 &&
      c.participants.includes(caller.id) &&
      c.participants.includes(target.id) &&
      c.status !== 'closed'
    );
    if (!conversation) {
      conversation = await base44.asServiceRole.entities.Conversation.create({
        participants,
        participant_names: participantNames,
        initiator_id: caller.id,
        subject: body?.subject || 'Shared comment from discussion',
        related_poll_id: pollId,
        status: 'active',
        last_message_at: new Date().toISOString(),
        last_message_preview: '',
        last_sender_id: caller.id
      });
    }

    // Deliver the forwarded message privately to the target member
    await base44.asServiceRole.entities.Message.create({
      conversation_id: conversation.id,
      sender_id: caller.id,
      sender_name: callerName,
      content,
      participants: conversation.participants
    });

    await base44.asServiceRole.entities.Conversation.update(conversation.id, {
      last_message_at: new Date().toISOString(),
      last_message_preview: content.slice(0, 100),
      last_sender_id: caller.id
    });

    // Record the forward for Infomarian / Admin review
    let poll = null;
    if (pollId) {
      try { poll = await base44.asServiceRole.entities.Poll.get(pollId); } catch {}
    }
    const infomarians = await base44.asServiceRole.entities.Infomarian.list();
    let reviewers = [];
    if (poll?.assigned_infomarians?.length) {
      reviewers = infomarians.filter(i => poll.assigned_infomarians.includes(i.infomarian_id) && i.status === 'active');
    }
    if (reviewers.length === 0) {
      reviewers = infomarians.filter(i => i.status === 'active');
    }
    if (reviewers.length > 0) {
      const reviewDescription =
        `Member ${callerName} (${caller.email}) privately shared a discussion comment to ${targetName} (${target.email}).\n\n` +
        `Forwarded content:\n${content}`;
      await base44.asServiceRole.entities.InfomarianTask.bulkCreate(
        reviewers.map(i => ({
          assigned_to_id: i.infomarian_id,
          assigned_to_name: i.full_name,
          assigned_by_id: 'system',
          assigned_by_name: 'Pollee System',
          task_type: 'moderation',
          title: 'Review member-shared comment',
          description: reviewDescription,
          priority: 'medium',
          status: 'pending',
          related_entity_type: 'comment',
          related_entity_id: commentId || ''
        }))
      );
    }

    return Response.json({ conversation, delivered: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}