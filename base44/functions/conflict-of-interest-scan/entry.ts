import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Compares an Infomarian's Declaration of Interest against the content of a
// poll they are being assigned to (title, description, options, discussion
// comments, and attached evidence). Returns an AI-assessed conflict report so
// the assigner can make an informed decision. Non-blocking — it only advises.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { infomarian_id, poll_id } = body || {};
    if (!infomarian_id || !poll_id) {
      return Response.json({ error: 'infomarian_id and poll_id are required' }, { status: 400 });
    }

    // Fetch the Infomarian record (service role — declaration may live on a
    // record the caller does not own).
    const infomarians = await base44.asServiceRole.entities.Infomarian.list();
    const infomarian = infomarians.find(
      (i) => i.infomarian_id === infomarian_id || i.id === infomarian_id || i.user_email === infomarian_id
    );
    if (!infomarian) {
      return Response.json({ error: 'Infomarian not found' }, { status: 404 });
    }

    const declaration = (infomarian.declaration_of_interest || '').trim();
    if (!declaration) {
      return Response.json({
        has_conflict: false,
        severity: 'none',
        summary: 'No declaration of interest on file. Ask the Infomarian to complete their declaration before assigning.',
        flagged_interests: []
      });
    }

    // Fetch the poll content.
    const polls = await base44.asServiceRole.entities.Poll.filter({ id: poll_id });
    const poll = polls[0];
    if (!poll) return Response.json({ error: 'Poll not found' }, { status: 404 });

    const optionsText = (poll.options || []).map((o, i) => `  ${i + 1}. ${o.label || o.id}`).join('\n');

    // Fetch discussion comments and evidence for richer context.
    let commentsText = '';
    try {
      const comments = await base44.asServiceRole.entities.Comment.filter({ poll_id });
      const approved = comments.filter((c) => c.moderation_status === 'approved' || !c.moderation_status);
      const topComments = approved.slice(0, 20).map((c) => `- ${c.user_name || c.display_name || 'Anonymous'}: ${c.content}`).join('\n');
      commentsText = topComments ? `\nDiscussion comments (sample):\n${topComments}` : '';
    } catch (_e) { /* comments optional */ }

    let evidenceText = '';
    try {
      const evidence = await base44.asServiceRole.entities.DiscussionEvidence.filter({ poll_id });
      const evidenceList = evidence.map((e) => `- ${e.title}${e.description ? `: ${e.description}` : ''}`).join('\n');
      evidenceText = evidenceList ? `\nAttached evidence:\n${evidenceList}` : '';
    } catch (_e) { /* evidence optional */ }

    const prompt = `You are a conflict-of-interest reviewer for a democratic participation platform.

An Infomarian (a paid moderator) is being assigned to moderate a poll. Before assignment, compare the Infomarian's Declaration of Interest against the poll's content to flag any potential conflicts of interest.

INFOMARIAN DECLARATION OF INTEREST:
"""
${declaration}
"""

POLL CONTENT:
Title: ${poll.title || ''}
Description: ${poll.description || '(none)'}
Voting options:
${optionsText || '(none)'}${commentsText}${evidenceText}

Assess whether any interest declared by the Infomarian could bias their moderation of THIS specific poll — financial stakes, employer relationships, board memberships, political affiliations, family ties, property holdings, or any other interest that aligns with or opposes the subject of this poll.

Return a JSON object with:
- has_conflict: boolean (true if any declared interest plausibly conflicts with this poll's subject)
- severity: "none" | "low" | "medium" | "high" (how direct the conflict is)
- summary: one or two plain-English sentences explaining the assessment
- flagged_interests: array of short strings naming the specific declared interests that overlap with the poll subject (empty if none)`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          has_conflict: { type: 'boolean' },
          severity: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
          summary: { type: 'string' },
          flagged_interests: { type: 'array', items: { type: 'string' } }
        },
        required: ['has_conflict', 'severity', 'summary']
      }
    });

    return Response.json({
      has_conflict: !!result.has_conflict,
      severity: result.severity || 'none',
      summary: result.summary || '',
      flagged_interests: Array.isArray(result.flagged_interests) ? result.flagged_interests : [],
      infomarian_name: infomarian.full_name,
      poll_title: poll.title
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}