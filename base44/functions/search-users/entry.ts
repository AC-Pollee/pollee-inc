import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { canModerate } from '../../shared/moderation.ts';

// Member directory search for moderators starting a direct chat.
// Returns up to 10 users matching the query by name or email (excluding the caller).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const allowed = await canModerate(base44, caller);
    if (!allowed) return Response.json({ error: 'Moderators only' }, { status: 403 });

    const body = await req.json();
    const query = (body?.query || '').trim().toLowerCase();
    if (query.length < 2) return Response.json({ users: [] });

    const users = await base44.asServiceRole.entities.User.list();
    const results = users
      .filter(u => u.id !== caller.id)
      .map(u => {
        const name = `${u.full_name || ''} ${u.last_name || ''}`.trim();
        return { id: u.id, name: name || u.email, email: u.email || '', role: u.user_role || 'voter' };
      })
      .filter(u => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query))
      .slice(0, 10);

    return Response.json({ users: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}