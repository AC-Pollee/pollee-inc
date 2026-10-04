import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Loader2, Share2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';

/**
 * Forwards a discussion comment to a nominated member via a private message.
 * Starts (or reuses) a 1:1 conversation with the selected member, then sends a
 * message containing the forwarded comment text and a hyperlink to the comment.
 *
 * Props:
 *  - open, onOpenChange: dialog visibility
 *  - comment: the Comment record being forwarded
 *  - pollId:  the poll the comment belongs to (used to build the comment link)
 */
export default function ShareToMemberDialog({ open, onOpenChange, comment, pollId }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');

  const author = comment?.display_name || comment?.user_name || 'a member';
  const commentUrl = `${window.location.origin}/Vote?pollId=${pollId}#comment-${comment?.id}`;
  const forwardedText = t('pollDiscussion.forwardedMessage', {
    defaultValue: 'Forwarded comment from {{author}}:\n\n"{{content}}"\n\nView comment: {{url}}',
    author,
    content: comment?.content || '',
    url: commentUrl,
  });
  const messageContent = note.trim() ? `${forwardedText}\n\n${note.trim()}` : forwardedText;

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['search-users', query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const res = await base44.functions.invoke('search-users', { query: query.trim() });
      return res.data?.users || [];
    },
    enabled: query.trim().length > 1
  });

  const share = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('share-to-member', {
        target_user_id: selected.id,
        poll_id: pollId,
        comment_id: comment?.id,
        subject: t('pollDiscussion.sharedCommentSubject', { defaultValue: 'Shared comment from discussion' }),
        content: messageContent
      });
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      toast({
        title: t('pollDiscussion.sharedToMember', { defaultValue: 'Shared to member' }),
        description: t('pollDiscussion.shareSentDesc', { defaultValue: 'The comment has been forwarded in a new message.' }),
      });
      onOpenChange(false);
      setQuery('');
      setSelected(null);
      setNote('');
    },
    onError: (error) => {
      toast({
        title: t('pollDiscussion.shareFailed', { defaultValue: 'Failed to share' }),
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            {t('pollDiscussion.shareToMember', { defaultValue: 'Share to Member' })}
          </DialogTitle>
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
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>
                {t('messages.change')}
              </Button>
            </div>
          )}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-slate-600 mb-1">
              {t('pollDiscussion.messagePreview', { defaultValue: 'Message preview' })}
            </p>
            <p className="text-xs text-slate-700 whitespace-pre-wrap">{messageContent}</p>
          </div>
          <div className="space-y-2">
            <Label>{t('pollDiscussion.addNote', { defaultValue: 'Add a note (optional)' })}</Label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={t('pollDiscussion.notePlaceholder', { defaultValue: 'Type a personal message to include...' })}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={() => share.mutate()} disabled={!selected || share.isPending}>
            {share.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />}
            {t('pollDiscussion.send', { defaultValue: 'Send' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}