import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const LEVELS = [
  { name: 'champion', min: 751 },
  { name: 'trusted', min: 501 },
  { name: 'contributor', min: 251 },
  { name: 'member', min: 101 },
  { name: 'newcomer', min: 0 }
];

function levelFor(score) {
  for (const l of LEVELS) if (score >= l.min) return l.name;
  return 'newcomer';
}

// Only Admins and Master Franchisers may revoke a strike.
async function canRevoke(base44, user) {
  if (!user) return false;
  if (user.email === 'ac@acproductiondesign.com') return true;
  if (user.role === 'admin') return true;
  if (user.user_role === 'master_franchiser') return true;
  return false;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allowed = await canRevoke(base44, caller);
    if (!allowed) {
      return Response.json({ error: 'Only Admins and Master Franchisers may revoke strikes' }, { status: 403 });
    }

    const body = await req.json();
    const { target_user_id, strike_date, reason } = body || {};
    if (!target_user_id || !strike_date) {
      return Response.json({ error: 'target_user_id and strike_date are required' }, { status: 400 });
    }

    const users = await base44.asServiceRole.entities.User.list();
    const target = users.find(u => u.id === target_user_id || u.email === target_user_id);
    if (!target) return Response.json({ error: 'User not found' }, { status: 404 });

    const existingStrikes = Array.isArray(target.strikes) ? target.strikes : [];
    const strikeIndex = existingStrikes.findIndex(s => s.date === strike_date);
    if (strikeIndex === -1) {
      return Response.json({ error: 'Strike not found for the given date' }, { status: 404 });
    }

    const revokedStrike = existingStrikes[strikeIndex];
    const remainingStrikes = existingStrikes.filter((_, i) => i !== strikeIndex);
    const newCount = remainingStrikes.length;

    // Incident-specific revocation: only this single strike is removed.
    // All other strikes and any existing consequences (commenting restriction,
    // suspension, ban) remain in place — this is not a blanket reset.
    const currentScore = typeof target.reputation_score === 'number' ? target.reputation_score : 100;
    const newScore = Math.min(1000, currentScore + 3);

    const breakdown = target.reputation_breakdown || {};
    const newBreakdown = { ...breakdown, flagged_content: Math.max(0, (breakdown.flagged_content || 0) - 1) };

    // Audit log entry on the user record.
    const now = new Date().toISOString();
    const existingHistory = Array.isArray(target.change_history) ? target.change_history : [];
    const historyEntry = {
      date: now,
      changed_by_id: caller.id,
      changed_by_name: caller.full_name || caller.email,
      changed_by_role: caller.user_role || (caller.email === 'ac@acproductiondesign.com' ? 'admin' : 'master_franchiser'),
      field: 'strikes',
      old_value: `${existingStrikes.length} strike(s)`,
      new_value: `${newCount} strike(s) — revoked ${revokedStrike.severity} strike from ${revokedStrike.date}`,
      reason: reason || `Strike revoked: ${revokedStrike.reason || 'no reason recorded'}`
    };

    await base44.asServiceRole.entities.User.update(target.id, {
      strikes: remainingStrikes,
      reputation_score: newScore,
      reputation_breakdown: newBreakdown,
      reputation_level: levelFor(newScore),
      change_history: [...existingHistory, historyEntry]
    });

    // Notify the user that a strike was revoked.
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: target.email,
        subject: 'Pollee — Strike revoked',
        body: [
          `Hi ${target.full_name || target.email},`,
          '',
          'A conduct strike on your account has been revoked by an administrator.',
          '',
          `Original strike reason: ${revokedStrike.reason || 'N/A'}`,
          `Revocation note: ${reason || 'No additional note'}`,
          `Remaining strikes: ${newCount} of 3.`,
          `Reputation restored: +3 (now ${newScore}).`,
          '',
          '— Pollee Inc'
        ].join('\n')
      });
    } catch (e) {
      // email failure should not revert the revocation
    }

    return Response.json({
      ok: true,
      strike_count: newCount,
      reputation_score: newScore,
      revoked_strike: revokedStrike
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}