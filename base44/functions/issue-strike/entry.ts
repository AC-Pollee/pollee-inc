import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

const LEVELS = [
  { name: 'champion', min: 751 },
  { name: 'trusted', min: 501 },
  { name: 'contributor', min: 251 },
  { name: 'member', min: 101 },
  { name: 'newcomer', min: 0 },
];

function levelFor(score) {
  for (const l of LEVELS) if (score >= l.min) return l.name;
  return 'newcomer';
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { target_type, target_id, reason } = body || {};
    if (!target_id || !reason) {
      return Response.json({ error: 'target_id and reason are required' }, { status: 400 });
    }

    // Verify caller has moderation rights — derive ONLY from platform-protected
    // fields on the caller's own User record, never from member-writable entities.
    const isSuperAdmin = caller.email === 'ac@acproductiondesign.com';
    const elevatedRole = caller.role === 'admin'
      || ['master_franchiser', 'franchise_manager', 'infomarian'].includes(caller.user_role);
    if (!isSuperAdmin && !elevatedRole) {
      return Response.json({ error: 'Not authorized to moderate' }, { status: 403 });
    }

    // Look up the caller's Infomarian profile for the moderator ID stamp (read-only)
    const infomarians = await base44.asServiceRole.entities.Infomarian.list();
    const myInfomarian = infomarians.find(i => i.user_email === caller.email);
    const moderatorId = myInfomarian?.infomarian_id || caller.email;
    const moderatorName = caller.full_name || caller.email;
    const now = new Date().toISOString();

    // Posts (polls) are admin/infomarian-created: reject only, no user strike.
    if (target_type === 'post') {
      await base44.asServiceRole.entities.Poll.update(target_id, {
        moderation_status: 'rejected',
        moderated_by: moderatorId,
        moderation_reason: reason,
        moderation_date: now
      });
      return Response.json({ ok: true, target_type: 'post' });
    }

    // Comment: mark moderated, then issue a strike against the author.
    const comment = await base44.asServiceRole.entities.Comment.get(target_id);
    if (!comment) return Response.json({ error: 'Comment not found' }, { status: 404 });

    await base44.asServiceRole.entities.Comment.update(target_id, {
      moderation_status: 'rejected',
      moderated_by: moderatorId,
      moderation_reason: reason,
      moderation_date: now
    });

    const authorEmail = comment.user_email;
    if (!authorEmail) {
      return Response.json({ ok: true, target_type: 'comment', strike_issued: false, note: 'no author email' });
    }

    const users = await base44.asServiceRole.entities.User.list();
    const author = users.find(u => u.email === authorEmail);
    if (!author) {
      return Response.json({ ok: true, target_type: 'comment', strike_issued: false, note: 'author not found' });
    }

    const existingStrikes = Array.isArray(author.strikes) ? author.strikes : [];
    const newCount = existingStrikes.length + 1;
    const severity = newCount === 1 ? 'minor' : newCount === 2 ? 'moderate' : 'severe';

    const strikeEntry = {
      date: now,
      infomarian_id: moderatorId,
      infomarian_name: moderatorName,
      reason,
      severity,
      comment_id: target_id
    };

    const newStrikes = [...existingStrikes, strikeEntry];
    const currentScore = typeof author.reputation_score === 'number' ? author.reputation_score : 100;
    const newScore = Math.max(0, currentScore - 3);

    const breakdown = author.reputation_breakdown || {};
    const newBreakdown = { ...breakdown, flagged_content: (breakdown.flagged_content || 0) + 1 };

    let consequence = 'warning';
    let suspension_end_date = author.suspension_end_date;
    let permanently_banned = !!author.permanently_banned;
    let commenting_restricted = !!author.commenting_restricted;

    if (newCount === 1) {
      const end = new Date();
      end.setHours(end.getHours() + 24);
      suspension_end_date = end.toISOString();
      commenting_restricted = true;
      consequence = '24-hour commenting suspension';
    } else if (newCount === 2) {
      const end = new Date();
      end.setDate(end.getDate() + 7);
      suspension_end_date = end.toISOString();
      commenting_restricted = true;
      consequence = '1-week commenting suspension';
    } else {
      permanently_banned = true;
      commenting_restricted = true;
      consequence = 'commenting rights suspended (voting unaffected)';
    }

    await base44.asServiceRole.entities.User.update(author.id, {
      strikes: newStrikes,
      reputation_score: newScore,
      reputation_breakdown: newBreakdown,
      reputation_level: levelFor(newScore),
      suspension_end_date,
      permanently_banned,
      commenting_restricted
    });

    // Notify the user by email (failure should not revert the strike)
    const emailBody = [
      `Hi ${author.full_name || author.email},`,
      '',
      'A moderator has struck through one of your comments.',
      '',
      `Reason: ${reason}`,
      `Strike ${newCount} of 3.`,
      `Consequence: ${consequence}.`,
      `Reputation: -3 (now ${newScore}).`,
      '',
      'You can appeal by opening an Incident Report from the Report menu.'
    ].join('\n');
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: author.email,
        subject: `Pollee — Strike ${newCount} of 3 issued`,
        body: emailBody
      });
    } catch (e) {
      // email send failed; strike still recorded
    }

    return Response.json({
      ok: true,
      target_type: 'comment',
      strike_issued: true,
      strike_count: newCount,
      consequence,
      reputation_score: newScore
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}