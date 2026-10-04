import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { canModerate } from '../../shared/moderation.ts';

// Starts (or reuses) a private 1:1 conversation between the moderator caller
// and a target member. Moderator-only.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const allowed = await canModerate(base44, caller);
    if (!allowed) return Response.json({ error: 'Moderators only' }, { status: 403 });

    const body = await req.json();
    const targetId = body?.target_user_id;
    if (!targetId) return Response.json({ error: 'target_user_id is required' }, { status: 400 });
    if (targetId === caller.id) return Response.json({ error: 'Cannot start a conversation with yourself' }, { status: 400 });

    const target = await base44.asServiceRole.entities.User.get(targetId);
    if (!target) return Response.json({ error: 'User not found' }, { status: 404 });

    const callerName = caller.full_name || caller.last_name || caller.email;
    const targetName = target.full_name || target.last_name || target.email;
    const participants = [caller.id, target.id];
    const participantNames = [
      { user_id: caller.id, name: callerName, email: caller.email },
      { user_id: target.id, name: targetName, email: target.email }
    ];

    // Reuse an existing active conversation between these two, if any
    const existing = await base44.asServiceRole.entities.Conversation.list();
    const reuse = existing.find(c =>
      Array.isArray(c.participants) &&
      c.participants.length === 2 &&
      c.participants.includes(caller.id) &&
      c.participants.includes(target.id) &&
      c.status !== 'closed'
    );
    if (reuse) return Response.json({ conversation: reuse, reused: true });

    const conversation = await base44.asServiceRole.entities.Conversation.create({
      participants,
      participant_names: participantNames,
      initiator_id: caller.id,
      subject: body?.subject || '',
      related_poll_id: body?.related_poll_id || null,
      status: 'active',
      last_message_at: new Date().toISOString(),
      last_message_preview: '',
      last_sender_id: caller.id
    });
    return Response.json({ conversation, reused: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}