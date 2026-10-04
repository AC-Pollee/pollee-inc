import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getParticipantConversation } from '../../shared/conversations.ts';

// Sends a message in a conversation. Participation is verified explicitly,
// then the write uses the service role so it never depends on RLS array matching.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const content = (body?.content || '').trim();
    const attachment = body?.attachment || null;
    if (!content && !attachment) return Response.json({ error: 'Message content is empty' }, { status: 400 });

    const { conversation, error, status } = await getParticipantConversation(base44, body?.conversation_id, caller.id);
    if (error) return Response.json({ error }, { status });
    if (conversation.status === 'closed') {
      return Response.json({ error: 'This conversation is closed' }, { status: 400 });
    }

    const senderName = caller.full_name || caller.last_name || caller.email;
    const message = await base44.asServiceRole.entities.Message.create({
      conversation_id: conversation.id,
      sender_id: caller.id,
      sender_name: senderName,
      content,
      attachment: attachment || null,
      participants: conversation.participants
    });

    const preview = content
      ? content.slice(0, 100)
      : (attachment?.name ? `📎 ${attachment.name}`.slice(0, 100) : 'Attachment');
    try {
      await base44.asServiceRole.entities.Conversation.update(conversation.id, {
        last_message_at: new Date().toISOString(),
        last_message_preview: preview,
        last_sender_id: caller.id
      });
    } catch (updateErr) {
      console.warn('Conversation preview update failed:', updateErr?.message || updateErr);
    }

    return Response.json({ message });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}