import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Lets the originating commenter accept or reject a pending share request.
// On accept, the comment is delivered to the target member in a private
// conversation. On reject, the request is closed and the requester is notified.
// In both cases a status message is posted to the consent conversation so the
// requester can see the outcome and continue the thread.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const shareRequestId = body?.share_request_id;
    const decision = body?.decision;
    if (!shareRequestId) return Response.json({ error: 'share_request_id is required' }, { status: 400 });
    if (!['accept', 'reject'].includes(decision)) {
      return Response.json({ error: 'decision must be accept or reject' }, { status: 400 });
    }

    const shareRequest = await base44.asServiceRole.entities.ShareRequest.get(shareRequestId);
    if (!shareRequest) return Response.json({ error: 'Share request not found' }, { status: 404 });
    if (shareRequest.commenter_id !== caller.id) {
      return Response.json({ error: 'Only the commenter can respond to this request' }, { status: 403 });
    }
    if (shareRequest.status !== 'pending') {
      return Response.json({ error: 'This request has already been responded to' }, { status: 400 });
    }

    const commenterName = caller.full_name || caller.last_name || caller.email;

    if (decision === 'reject') {
      await base44.asServiceRole.entities.ShareRequest.update(shareRequestId, {
        status: 'rejected',
        responded_at: new Date().toISOString()
      });
      // Notify the requester in the consent conversation.
      await base44.asServiceRole.entities.Message.create({
        conversation_id: shareRequest.conversation_id,
        sender_id: caller.id,
        sender_name: commenterName,
        content: `${commenterName} has declined your request to share their comment.`,
        participants: [shareRequest.requester_id, caller.id]
      });
      return Response.json({ ok: true, status: 'rejected' });
    }

    // --- Accept: deliver the comment to the target ---
    const target = await base44.asServiceRole.entities.User.get(shareRequest.target_id);
    if (!target) return Response.json({ error: 'Target user not found' }, { status: 404 });

    const targetName = target.full_name || target.last_name || target.email;

    // Create or reuse a conversation between the requester and the target.
    const existing = await base44.asServiceRole.entities.Conversation.list();
    let conversation = existing.find(c =>
      Array.isArray(c.participants) &&
      c.participants.length === 2 &&
      c.participants.includes(shareRequest.requester_id) &&
      c.participants.includes(target.id) &&
      c.status !== 'closed'
    );
    if (!conversation) {
      conversation = await base44.asServiceRole.entities.Conversation.create({
        participants: [shareRequest.requester_id, target.id],
        participant_names: [
          { user_id: shareRequest.requester_id, name: shareRequest.requester_name, email: shareRequest.requester_email },
          { user_id: target.id, name: targetName, email: target.email }
        ],
        initiator_id: shareRequest.requester_id,
        subject: 'Shared comment from discussion',
        related_poll_id: shareRequest.poll_id,
        status: 'active',
        last_message_at: new Date().toISOString(),
        last_message_preview: '',
        last_sender_id: shareRequest.requester_id
      });
    }

    const commentUrl = `https://pollee-app.org/Vote?pollId=${shareRequest.poll_id || ''}#comment-${shareRequest.comment_id}`;
    const forwardedText =
      `Forwarded comment from ${shareRequest.commenter_email || 'a member'}:\n\n` +
      `"${shareRequest.comment_content}"\n\n` +
      `View comment: ${commentUrl}`;
    const fullContent = shareRequest.note ? `${forwardedText}\n\n${shareRequest.note}` : forwardedText;

    await base44.asServiceRole.entities.Message.create({
      conversation_id: conversation.id,
      sender_id: shareRequest.requester_id,
      sender_name: shareRequest.requester_name,
      content: fullContent,
      participants: conversation.participants
    });
    try {
      await base44.asServiceRole.entities.Conversation.update(conversation.id, {
        last_message_at: new Date().toISOString(),
        last_message_preview: fullContent.slice(0, 100),
        last_sender_id: shareRequest.requester_id
      });
    } catch (updateErr) {
      console.warn('Conversation preview update failed:', updateErr?.message || updateErr);
    }

    await base44.asServiceRole.entities.ShareRequest.update(shareRequestId, {
      status: 'accepted',
      responded_at: new Date().toISOString(),
      delivery_conversation_id: conversation.id
    });

    // Notify the requester in the consent conversation.
    await base44.asServiceRole.entities.Message.create({
      conversation_id: shareRequest.conversation_id,
      sender_id: caller.id,
      sender_name: commenterName,
      content: `${commenterName} has accepted your request to share their comment. The comment has been delivered to ${targetName}.`,
      participants: [shareRequest.requester_id, caller.id]
    });

    return Response.json({ ok: true, status: 'accepted', delivery_conversation_id: conversation.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}