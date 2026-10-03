import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Presence heartbeat: records the caller's activity timestamp and returns the
// count of users who have pinged within the active window. Drives the
// "active sessions" counter shown in the UI.
const ACTIVE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();
    const nowIso = now.toISOString();

    // Record this user's heartbeat (service role — users cannot write User records directly).
    await base44.asServiceRole.entities.User.update(user.id, { last_active_at: nowIso });

    // Count everyone who has pinged within the active window.
    const cutoff = new Date(now.getTime() - ACTIVE_WINDOW_MS).toISOString();
    const active = await base44.asServiceRole.entities.User.filter({
      last_active_at: { $gte: cutoff }
    });

    return Response.json({ active_users: active.length, updated_at: nowIso });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}