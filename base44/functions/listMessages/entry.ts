import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getParticipantConversation } from '../../shared/conversations.ts';

// Returns all messages of a conversation, oldest first, for a verified participant.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { conversation, error, status } = await getParticipantConversation(base44, body?.conversation_id, caller.id);
    if (error) return Response.json({ error }, { status });

    const messages = await base44.asServiceRole.entities.Message.filter(
      { conversation_id: conversation.id }, 'created_date', 500
    );
    return Response.json({ messages });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}