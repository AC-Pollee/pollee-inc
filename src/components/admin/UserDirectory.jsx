import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Pencil, ShieldCheck, ShieldAlert, Users } from 'lucide-react';
import UserEditDialog from '@/components/admin/UserEditDialog';
import { useTranslation } from 'react-i18next';

// A user is "in session" if their presence heartbeat landed within the active
// window used by the track-presence function (2 minutes).
const ACTIVE_WINDOW_MS = 2 * 60 * 1000;
const isUserActive = (u) => {
  if (!u.last_active_at) return false;
  const ts = new Date(u.last_active_at).getTime();
  if (isNaN(ts)) return false;
  return Date.now() - ts < ACTIVE_WINDOW_MS;
};

// Full member directory for moderators. Bank details are never exposed —
// only a verified/not-verified flag is shown. Basic details and constituency
// assignment can be edited by any moderator level (Infomarian and above).
export default function UserDirectory() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editing, setEditing] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['directory-users'],
    queryFn: async () => {
      const res = await base44.functions.invoke('list-users', {});
      return res.data?.users || [];
    }
  });

  const { data: franchises = [] } = useQuery({
    queryKey: ['franchises'],
    queryFn: () => base44.entities.Franchise.list()
  });

  const franchiseName = (id) => {
    const f = franchises.find((x) => x.id === id);
    return f ? `${f.franchise_name}` : '—';
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && (u.user_role || 'voter') !== roleFilter) return false;
      if (!q) return true;
      const name = (u.full_name || '').trim().toLowerCase();
      return name.includes(q) || (u.email || '').toLowerCase().includes(q) || (u.phone_number || '').includes(q);
    });
  }, [users, search, roleFilter]);

  const handleSaved = () => {
    setEditing(null);
    queryClient.invalidateQueries(['directory-users']);
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          {t('userDirectory.title')}
        </CardTitle>
        <p className="text-sm text-slate-500">{t('userDirectory.subtitle')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder={t('userDirectory.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-slate-200 bg-background text-foreground"
          >
            <option value="all">{t('userDirectory.allRoles')}</option>
            <option value="voter">{t('userDirectory.voter')}</option>
            <option value="infomarian">{t('userDirectory.infomarian')}</option>
            <option value="franchise_manager">{t('userDirectory.franchiseManager')}</option>
            <option value="master_franchiser">{t('userDirectory.masterFranchiser')}</option>
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-500">{t('userDirectory.noUsers')}</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                <tr>
                <th className="text-left px-4 py-3 font-medium">{t('userDirectory.name')}</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">{t('userDirectory.contact')}</th>
                <th className="text-left px-4 py-3 font-medium">Session</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">{t('userDirectory.constituency')}</th>
                  <th className="text-left px-4 py-3 font-medium">{t('userDirectory.role')}</th>
                  <th className="text-left px-4 py-3 font-medium">{t('userDirectory.bankVerified')}</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">{t('userDirectory.strikes')}</th>
                  <th className="text-right px-4 py-3 font-medium">{t('common.edit')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => {
                  const active = isUserActive(u);
                  return (
                  <tr key={u.id} className={`hover:bg-slate-50 ${active ? 'bg-emerald-50/60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                        <div>
                          <p className={`font-medium ${active ? 'text-emerald-900' : 'text-slate-900'}`}>{u.full_name?.trim() || u.email}</p>
                          <p className="text-xs text-slate-500 md:hidden">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-slate-700">{u.email}</p>
                      <p className="text-xs text-slate-500">{u.phone_number || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      {active ? (
                        <Badge className="bg-emerald-500 text-white">In session</Badge>
                      ) : (
                        <span className="text-xs text-slate-400">Offline</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-700">{franchiseName(u.franchise_id)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="capitalize">{u.user_role || 'voter'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {(u.account_validated || u.confirmation_verified) ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700"><ShieldCheck className="w-4 h-4" /> {t('userDirectory.verified')}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600"><ShieldAlert className="w-4 h-4" /> {t('userDirectory.notVerified')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {u.strikes_count > 0
                        ? <Badge className="bg-red-100 text-red-700">{u.strikes_count}</Badge>
                        : <span className="text-slate-400">0</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(u)} title={t('common.edit')}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <UserEditDialog
        user={editing}
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        franchises={franchises}
        onSaved={handleSaved}
      />
    </Card>
  );
}