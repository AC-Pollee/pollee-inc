import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { canModerate } from '../../shared/moderation.ts';

// Returns the full member directory for moderators (Infomarian and above).
// Bank account details (BSB, account number, account name, validation deposit
// amount) are NEVER returned — only a boolean flag showing whether the user's
// bank account has been verified. This lets moderators manage basic details
// and see verification status without exposing sensitive financial data.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allowed = await canModerate(base44, caller);
    if (!allowed) return Response.json({ error: 'Moderators only' }, { status: 403 });

    const users = await base44.asServiceRole.entities.User.list();

    const safe = users.map(u => ({
      id: u.id,
      full_name: u.full_name || '',
      last_name: u.last_name || '',
      email: u.email || '',
      date_of_birth: u.date_of_birth || '',
      phone_number: u.phone_number || '',
      language: u.language || 'en',
      user_role: u.user_role || 'voter',
      role: u.role || '',
      franchise_id: u.franchise_id || '',
      infomarian_id: u.infomarian_id || '',
      voter_id: u.voter_id || '',
      account_validated: !!u.account_validated,
      validation_initiated: !!u.validation_initiated,
      strikes_count: Array.isArray(u.strikes) ? u.strikes.length : 0,
      commenting_restricted: !!u.commenting_restricted,
      reputation_score: u.reputation_score ?? 0,
      reputation_level: u.reputation_level || 'newcomer',
      avatar_url: u.avatar_url || '',
      created_date: u.created_date || ''
    }));

    return Response.json({ users: safe });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}