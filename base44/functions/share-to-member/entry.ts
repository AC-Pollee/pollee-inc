import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Set to true to reinstate the comment share feature. While false the share
// action returns "feature suspended". When true, a consent flow runs: the
// originating commenter is notified by message and email and must accept before
// the comment is delivered to the target.
const SHARE_FEATURE_ENABLED = false;

// Lets any authenticated member privately forward a discussion comment to
// another member. When the share feature is reinstated, the originating
// commenter's consent is requested first via a private message and email;
// the comment is only delivered to the target once the commenter accepts.
//
// Conversation and message writes use the service role for reliable RLS bypass.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!SHARE_FEATURE_ENABLED) {
      return Response.json({ error: 'The comment share feature is currently suspended.' }, { status: 403 });
    }

    const body = await req.json();
    const targetUserId = body?.target_user_id;
    const pollId = body?.poll_id || null;
    const commentId = body?.comment_id || null;
    const content = (body?.content || '').trim();
    const note = (body?.note || '').trim();
    if (!targetUserId) return Response.json({ error: 'target_user_id is required' }, { status: 400 });
    if (!content) return Response.json({ error: 'Message content is empty' }, { status: 400 });
    if (targetUserId === caller.id) return Response.json({ error: 'Cannot share to yourself' }, { status: 400 });
    if (!commentId) return Response.json({ error: 'comment_id is required for consent' }, { status: 400 });

    const target = await base44.asServiceRole.entities.User.get(targetUserId);
    if (!target) return Response.json({ error: 'User not found' }, { status: 404 });

    // Look up the originating comment to find its author.
    let comment = null;
    try { comment = await base44.asServiceRole.entities.Comment.get(commentId); } catch {}
    if (!comment) return Response.json({ error: 'Comment not found' }, { status: 404 });

    const callerName = caller.full_name || caller.last_name || caller.email;
    const targetName = target.full_name || target.last_name || target.email;

    // Find the commenter as a registered user by email.
    let commenter = null;
    if (comment.user_email) {
      const users = await base44.asServiceRole.entities.User.list();
      commenter = users.find(u => u.email === comment.user_email);
    }

    // If the commenter is not a registered user (e.g. a public comment), there
    // is no one to ask consent from — fall back to direct delivery.
    if (!commenter || commenter.id === caller.id) {
      return await deliverDirect(base44, caller, target, content, pollId, commentId, callerName, targetName);
    }

    const commenterName = commenter.full_name || commenter.last_name || commenter.email;

    // --- Consent flow ---

    // Create or reuse a conversation between the requester and the commenter.
    const existing = await base44.asServiceRole.entities.Conversation.list();
    let conversation = existing.find(c =>
      Array.isArray(c.participants) &&
      c.participants.length === 2 &&
      c.participants.includes(caller.id) &&
      c.participants.includes(commenter.id) &&
      c.status !== 'closed'
    );
    if (!conversation) {
      conversation = await base44.asServiceRole.entities.Conversation.create({
        participants: [caller.id, commenter.id],
        participant_names: [
          { user_id: caller.id, name: callerName, email: caller.email },
          { user_id: commenter.id, name: commenterName, email: commenter.email }
        ],
        initiator_id: caller.id,
        subject: 'Comment share — consent request',
        related_poll_id: pollId,
        status: 'active',
        last_message_at: new Date().toISOString(),
        last_message_preview: '',
        last_sender_id: caller.id
      });
    }

    // Record the pending share request.
    const shareRequest = await base44.asServiceRole.entities.ShareRequest.create({
      requester_id: caller.id,
      requester_name: callerName,
      requester_email: caller.email,
      commenter_id: commenter.id,
      commenter_email: commenter.email,
      target_id: target.id,
      target_name: targetName,
      target_email: target.email,
      comment_id: commentId,
      poll_id: pollId,
      comment_content: comment.content || '',
      note,
      conversation_id: conversation.id,
      status: 'pending'
    });

    // Send the consent request message to the commenter.
    const consentMessage =
      `${callerName} is requesting your consent to share your comment to ${targetName}.\n\n` +
      `Your comment:\n"${comment.content || ''}"\n\n` +
      `Note from ${callerName}: ${note || 'No note provided.'}\n\n` +
      `Please accept or reject this request. You can also reply to ${callerName} in this conversation.`;
    await base44.asServiceRole.entities.Message.create({
      conversation_id: conversation.id,
      sender_id: caller.id,
      sender_name: callerName,
      content: consentMessage,
      participants: conversation.participants
    });
    try {
      await base44.asServiceRole.entities.Conversation.update(conversation.id, {
        last_message_at: new Date().toISOString(),
        last_message_preview: consentMessage.slice(0, 100),
        last_sender_id: caller.id
      });
    } catch (updateErr) {
      console.warn('Conversation preview update failed:', updateErr?.message || updateErr);
    }

    // Email the commenter about the consent request.
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: commenter.email,
        template_name: 'CommentShareConsent',
        variables: {
          first_name: commenter.full_name || '',
          requester_name: callerName,
          target_name: targetName,
          comment_preview: (comment.content || '').slice(0, 200),
          requester_note: note || 'No note provided.',
          consent_url: 'https://pollee-app.org/Messages'
        }
      });
    } catch (e) {
      // email send failed; consent message still delivered in-app
    }

    return Response.json({ ok: true, consent_required: true, share_request_id: shareRequest.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Direct delivery fallback (used when the commenter is not a registered user).
async function deliverDirect(base44, caller, target, content, pollId, commentId, callerName, targetName) {
  const participants = [caller.id, target.id];
  const participantNames = [
    { user_id: caller.id, name: callerName, email: caller.email },
    { user_id: target.id, name: targetName, email: target.email }
  ];
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
      subject: 'Shared comment from discussion',
      related_poll_id: pollId,
      status: 'active',
      last_message_at: new Date().toISOString(),
      last_message_preview: '',
      last_sender_id: caller.id
    });
  }
  await base44.asServiceRole.entities.Message.create({
    conversation_id: conversation.id,
    sender_id: caller.id,
    sender_name: callerName,
    content,
    participants: conversation.participants
  });
  try {
    await base44.asServiceRole.entities.Conversation.update(conversation.id, {
      last_message_at: new Date().toISOString(),
      last_message_preview: content.slice(0, 100),
      last_sender_id: caller.id
    });
  } catch (updateErr) {
    console.warn('Conversation preview update failed:', updateErr?.message || updateErr);
  }
  return Response.json({ conversation, delivered: true });
}