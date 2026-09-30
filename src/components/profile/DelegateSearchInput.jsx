import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle2, Loader2 } from 'lucide-react';

// Searches the User profile database by name/email, shows the nearest matches,
// and on selection autofills the delegate's full name + user ID via onSelect.
export default function DelegateSearchInput({ excludeUserId, selectedName, selectedId, onSelect, t }) {
  const [query, setQuery] = useState(selectedName || '');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const boxRef = useRef(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-for-delegation'],
    queryFn: () => base44.entities.User.list()
  });

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return users
      .filter(u => u.id && u.id !== excludeUserId)
      .map(u => {
        const full = `${u.full_name || ''} ${u.last_name || ''}`.trim();
        return { id: u.id, full, email: u.email || '' };
      })
      .filter(u => u.full.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .slice(0, 6);
  }, [users, query, excludeUserId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const choose = (m) => {
    setQuery(m.full);
    setOpen(false);
    setHighlight(-1);
    onSelect({ full_name: m.full, user_id: m.id });
  };

  const onKeyDown = (e) => {
    if (!open || matches.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter' && highlight >= 0) { e.preventDefault(); choose(matches[highlight]); }
    else if (e.key === 'Escape') { setOpen(false); setHighlight(-1); }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2" ref={boxRef}>
        <Label htmlFor="delegate_full_name">{t('delegationManager.delegateFullName')}</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            id="delegate_full_name"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setHighlight(-1);
              // Clear the previous selection if the user edits the name
              if (selectedId) onSelect({ full_name: e.target.value, user_id: '' });
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={t('delegationManager.searchPlaceholder') || 'Search member by name or email'}
            className="pl-9"
            autoComplete="off"
            required
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
          )}
        </div>

        {open && query.trim() && (
          <div className="relative z-20">
            {matches.length > 0 ? (
              <div className="absolute top-0 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                {matches.map((m, idx) => (
                  <button
                    type="button"
                    key={m.id}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => choose(m)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 ${
                      idx === highlight ? 'bg-indigo-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{m.full}</p>
                      <p className="text-xs text-slate-500 truncate">{m.email}</p>
                    </div>
                    {idx === highlight && <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />}
                  </button>
                ))}
              </div>
            ) : (
              !isLoading && (
                <div className="absolute top-0 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm text-slate-500">
                  {t('delegationManager.noMatches') || 'No matching members'}
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="delegate_user_id">{t('delegationManager.delegateUserId')}</Label>
        <Input
          id="delegate_user_id"
          value={selectedId || ''}
          readOnly
          placeholder={t('delegationManager.autofilledOnSelect') || 'Auto-filled when you select a member'}
          className={selectedId ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-mono' : 'text-slate-400'}
        />
        {selectedId && (
          <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {t('delegationManager.memberSelected') || 'Member selected'}
          </Badge>
        )}
      </div>
    </div>
  );
}