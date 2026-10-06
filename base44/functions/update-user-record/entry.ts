import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { canModerate } from '../../shared/moderation.ts';

function isAdmin(user) {
  if (!user) return false;
  if (user.email === 'ac@acproductiondesign.com') return true;
  if (user.role === 'admin') return true;
  const ur = user.user_role;
  return ur === 'admin' || ur === 'master_franchiser' || ur === 'franchise_manager';
}

// Fields a moderator is permitted to edit on a user record after creation.
const EDITABLE_FIELDS = [
  'first_name',
  'last_name',
  'date_of_birth',
  'phone_number',
  'language',
  'franchise_id',
  'infomarian_id',
  'avatar_url'
];

// Fields that only admins may change — privilege/identity/bank details.
const ADMIN_ONLY_FIELDS = [
  'email',
  'user_role',
  'bsb',
  'account_number',
  'account_name',
  'account_validated',
  'voter_id'
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allowed = await canModerate(base44, caller);
    if (!allowed) {
      return Response.json({ error: 'Not authorized to edit user records' }, { status: 403 });
    }

    const body = await req.json();
    const { target_user_id, updates, reason } = body || {};
    if (!target_user_id) {
      return Response.json({ error: 'target_user_id is required' }, { status: 400 });
    }
    if (!updates || typeof updates !== 'object') {
      return Response.json({ error: 'updates object is required' }, { status: 400 });
    }

    // Non-admins may not touch admin-only fields (role, email, bank details, etc.)
    if (!isAdmin(caller)) {
      const blocked = ADMIN_ONLY_FIELDS.filter(f => f in updates);
      if (blocked.length > 0) {
        return Response.json(
          { error: `Not authorized to change admin-only fields: ${blocked.join(', ')}` },
          { status: 403 }
        );
      }
    }

    // Load the target user (service role — moderators are not necessarily admins).
    const users = await base44.asServiceRole.entities.User.list();
    const target = users.find(u => u.id === target_user_id || u.email === target_user_id);
    if (!target) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Build a clean update payload + change-history entries for fields that actually change.
    const cleanUpdates = {};
    const changeEntries = [];
    const now = new Date().toISOString();
    const moderatorRole = caller.user_role || (caller.email === 'ac@acproductiondesign.com' ? 'admin' : 'moderator');

    const allEditable = isAdmin(caller) ? [...EDITABLE_FIELDS, ...ADMIN_ONLY_FIELDS] : EDITABLE_FIELDS;
    for (const field of allEditable) {
      if (!(field in updates)) continue;
      const newVal = updates[field];
      const oldVal = target[field];
      // Normalize undefined -> null for comparison
      const a = oldVal === undefined ? null : oldVal;
      const b = newVal === undefined ? null : newVal;
      if (JSON.stringify(a) === JSON.stringify(b)) continue;
      cleanUpdates[field] = newVal;
      changeEntries.push({
        date: now,
        changed_by_id: caller.id,
        changed_by_name: caller.first_name || caller.full_name || caller.email,
        changed_by_role: moderatorRole,
        field,
        old_value: oldVal ?? null,
        new_value: newVal ?? null,
        reason: reason || ''
      });
    }

    if (Object.keys(cleanUpdates).length === 0) {
      return Response.json({ ok: true, user: target, changes: [], note: 'No fields changed' });
    }

    const existingHistory = Array.isArray(target.change_history) ? target.change_history : [];
    cleanUpdates.change_history = [...existingHistory, ...changeEntries];

    const updated = await base44.asServiceRole.entities.User.update(target.id, cleanUpdates);

    return Response.json({
      ok: true,
      user: updated,
      changes: changeEntries
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}