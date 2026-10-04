import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Sends a message in a conversation. Verifies the caller is a participant,
// then writes the message (with denormalized participants for RLS) and updates
// the conversation's last-message preview.
//
// Uses the user-scoped client (base44.entities) for the message create and
// conversation read/update. The RLS rules are designed to allow participants to
// read/update their own conversations and to create messages where they are the
// sender — so this works identically for admins and regular members, and avoids
// the unreliable asServiceRole path for non-admin callers.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const conversationId = body?.conversation_id;
    const content = (body?.content || '').trim();
    const attachment = body?.attachment || null;
    if (!conversationId) return Response.json({ error: 'conversation_id is required' }, { status: 400 });
    if (!content && !attachment) return Response.json({ error: 'Message content is empty' }, { status: 400 });

    // User-scoped read: RLS allows participants to read their own conversations.
    const conversation = await base44.entities.Conversation.get(conversationId);
    if (!conversation) return Response.json({ error: 'Conversation not found' }, { status: 404 });
    if (!Array.isArray(conversation.participants) || !conversation.participants.includes(caller.id)) {
      return Response.json({ error: 'You are not a participant in this conversation' }, { status: 403 });
    }
    if (conversation.status === 'closed') {
      return Response.json({ error: 'This conversation is closed' }, { status: 400 });
    }

    const senderName = caller.full_name || caller.last_name || caller.email;

    // User-scoped create: RLS allows a user to create a message where they are
    // the sender and a participant. This is the reliable path for all members.
    const message = await base44.entities.Message.create({
      conversation_id: conversationId,
      sender_id: caller.id,
      sender_name: senderName,
      content,
      attachment: attachment || null,
      participants: conversation.participants
    });

    // The message is now persisted. Updating the conversation preview is a
    // secondary concern — never let it fail the whole request or lose the
    // message the user just sent.
    const preview = content
      ? content.slice(0, 100)
      : (attachment?.name ? `📎 ${attachment.name}`.slice(0, 100) : 'Attachment');
    try {
      await base44.entities.Conversation.update(conversationId, {
        last_message_at: new Date().toISOString(),
        last_message_preview: preview,
        last_sender_id: caller.id
      });
    } catch (updateErr) {
      // Preview update is best-effort; the message itself is already saved.
      console.warn('Conversation preview update failed:', updateErr?.message || updateErr);
    }

    return Response.json({ message });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}