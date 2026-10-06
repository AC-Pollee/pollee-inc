// Returns true if the caller may act as a moderator (initiate direct chats,
// search the member directory, etc.). Derives authorization ONLY from
// platform-protected fields on the caller's own User record — never from
// Infomarian/Franchise entities, which members can create themselves.
export async function canModerate(base44, user) {
  if (!user) return false;
  if (user.email === 'ac@acproductiondesign.com') return true;
  if (user.role === 'admin') return true;
  const ur = user.user_role;
  if (ur === 'master_franchiser' || ur === 'franchise_manager' || ur === 'infomarian') return true;
  return false;
}