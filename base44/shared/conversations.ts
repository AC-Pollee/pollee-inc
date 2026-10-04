// Loads a conversation with the service role and verifies the caller is a participant.
// Returns { conversation } on success or { error, status } on failure.
export async function getParticipantConversation(base44, conversationId, userId) {
  if (!conversationId) return { error: 'conversation_id is required', status: 400 };
  const conversation = await base44.asServiceRole.entities.Conversation.get(conversationId);
  if (!conversation) return { error: 'Conversation not found', status: 404 };
  if (!Array.isArray(conversation.participants) || !conversation.participants.includes(userId)) {
    return { error: 'You are not a participant in this conversation', status: 403 };
  }
  return { conversation };
}