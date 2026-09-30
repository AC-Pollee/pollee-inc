import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, Loader2, MessageSquare } from 'lucide-react';

export default function NewConversationDialog({ open, onOpenChange, onCreated, t }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [subject, setSubject] = useState('');

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['search-users', query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const res = await base44.functions.invoke('search-users', { query: query.trim() });
      return res.data?.users || [];
    },
    enabled: query.trim().length > 1
  });

  const start = useMutation({
    mutationFn: () => base44.functions.invoke('start-conversation', {
      target_user_id: selected.id,
      subject: subject.trim() || undefined
    }),
    onSuccess: (res) => {
      const conv = res.data?.conversation;
      if (conv) onCreated(conv);
      setQuery('');
      setSelected(null);
      setSubject('');
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" /> {t('messages.newConversation')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('messages.searchMember')}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(null); }}
                placeholder={t('messages.searchPlaceholder')}
                className="pl-9"
                autoFocus
              />
              {isFetching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />}
            </div>
            {query.trim().length > 1 && !selected && (
              <div className="border border-slate-200 rounded-lg max-h-48 overflow-auto">
                {results.length > 0 ? results.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelected(u)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b last:border-0 border-slate-100"
                  >
                    <p className="text-sm font-medium text-slate-900">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </button>
                )) : !isFetching && (
                  <p className="px-3 py-2 text-sm text-slate-500">{t('messages.noMatches')}</p>
                )}
              </div>
            )}
          </div>
          {selected && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-900">{selected.name}</p>
                <p className="text-xs text-indigo-700">{selected.email}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>{t('messages.change')}</Button>
            </div>
          )}
          <div className="space-y-2">
            <Label>{t('messages.subjectOptional')}</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder={t('messages.subjectPlaceholder')} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={() => start.mutate()} disabled={!selected || start.isPending}>
            {start.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />}
            {t('messages.startChat')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}