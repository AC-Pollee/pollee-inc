// Returns true if the caller may act as a moderator (initiate direct chats,
// search the member directory, etc.). Mirrors the canModerate check used in
// the app Layout so server-side gates stay consistent with the UI.
export async function canModerate(base44, user) {
  if (!user) return false;
  if (user.email === 'ac@acproductiondesign.com') return true;
  if (user.role === 'admin') return true;
  const ur = user.user_role;
  if (ur === 'master_franchiser' || ur === 'franchise_manager' || ur === 'infomarian') return true;
  try {
    const [infomarians, franchises] = await Promise.all([
      base44.asServiceRole.entities.Infomarian.list(),
      base44.asServiceRole.entities.Franchise.list()
    ]);
    if (infomarians.some(i => i.user_email === user.email)) return true;
    if (franchises.some(f => f.owner_email === user.email)) return true;
  } catch {}
  return false;
}