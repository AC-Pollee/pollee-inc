import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Sends a message in a conversation. Verifies the caller is a participant,
// then writes the message (with denormalized participants for RLS) and updates
// the conversation's last-message preview.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const conversationId = body?.conversation_id;
    const content = (body?.content || '').trim();
    if (!conversationId) return Response.json({ error: 'conversation_id is required' }, { status: 400 });
    if (!content) return Response.json({ error: 'Message content is empty' }, { status: 400 });

    const conversation = await base44.asServiceRole.entities.Conversation.get(conversationId);
    if (!conversation) return Response.json({ error: 'Conversation not found' }, { status: 404 });
    if (!Array.isArray(conversation.participants) || !conversation.participants.includes(caller.id)) {
      return Response.json({ error: 'You are not a participant in this conversation' }, { status: 403 });
    }
    if (conversation.status === 'closed') {
      return Response.json({ error: 'This conversation is closed' }, { status: 400 });
    }

    const senderName = `${caller.full_name || ''} ${caller.last_name || ''}`.trim() || caller.email;
    const message = await base44.asServiceRole.entities.Message.create({
      conversation_id: conversationId,
      sender_id: caller.id,
      sender_name: senderName,
      content,
      participants: conversation.participants
    });

    await base44.asServiceRole.entities.Conversation.update(conversationId, {
      last_message_at: new Date().toISOString(),
      last_message_preview: content.slice(0, 100),
      last_sender_id: caller.id
    });

    return Response.json({ message });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}