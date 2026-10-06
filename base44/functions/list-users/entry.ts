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
    const infomarians = await base44.asServiceRole.entities.Infomarian.list();
    const franchises = await base44.asServiceRole.entities.Franchise.list();

    const infomarianEmails = new Set(infomarians.map(i => i.user_email).filter(Boolean));
    const franchiseOwnerEmails = new Set(franchises.map(f => f.owner_email).filter(Boolean));

    // Derive the effective role: an explicitly set user_role always wins
    // (including 'voter'), so an admin edit is respected. Only infer from
    // the Infomarian / Franchise records when user_role was never set.
    const deriveRole = (u) => {
      if (u.user_role) return u.user_role;
      const email = (u.email || '').toLowerCase();
      if (infomarianEmails.has(email)) return 'infomarian';
      if (franchiseOwnerEmails.has(email)) return 'franchise_manager';
      return 'voter';
    };

    const safe = users.map(u => ({
      id: u.id,
      full_name: u.full_name || '',
      first_name: u.first_name || u.full_name || '',
      last_name: u.last_name || '',
      email: u.email || '',
      date_of_birth: u.date_of_birth || '',
      phone_number: u.phone_number || '',
      language: u.language || 'en',
      user_role: deriveRole(u),
      role: u.role || '',
      franchise_id: u.franchise_id || '',
      infomarian_id: u.infomarian_id || '',
      voter_id: u.voter_id || '',
      account_validated: !!u.account_validated,
      confirmation_verified: !!u.confirmation_verified,
      validation_initiated: !!u.validation_initiated,
      strikes_count: Array.isArray(u.strikes) ? u.strikes.length : 0,
      commenting_restricted: !!u.commenting_restricted,
      reputation_score: u.reputation_score ?? 0,
      reputation_level: u.reputation_level || 'newcomer',
      avatar_url: u.avatar_url || '',
      created_date: u.created_date || '',
      last_active_at: u.last_active_at || ''
    }));

    return Response.json({ users: safe });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}