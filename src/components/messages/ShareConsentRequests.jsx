import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, MessageSquare, Share2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';

/**
 * Shows pending comment-share consent requests addressed to the current user
 * (i.e. requests where they are the originating commenter). The commenter can
 * accept, reject, or open the conversation to reply to the requester.
 */
export default function ShareConsentRequests({ currentUser, onSelectConversation }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: ['share-consent-requests'],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const all = await base44.entities.ShareRequest.list('-created_date');
      return all.filter(r => r.commenter_id === currentUser.id && r.status === 'pending');
    },
    enabled: !!currentUser?.id,
    refetchInterval: 30000
  });

  const respond = useMutation({
    mutationFn: async ({ id, decision }) => {
      const res = await base44.functions.invoke('respond-share-request', { share_request_id: id, decision });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['share-consent-requests']);
      queryClient.invalidateQueries(['conversations']);
      toast({
        title: variables.decision === 'accept'
          ? t('shareConsent.accepted')
          : t('shareConsent.rejected'),
      });
    },
    onError: (error) => {
      toast({ title: error.message || t('shareConsent.failed'), variant: 'destructive' });
    }
  });

  if (requests.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
        <Share2 className="w-5 h-5 text-indigo-600" />
        {t('shareConsent.title')} ({requests.length})
      </h2>
      {requests.map(req => (
        <Card key={req.id} className="border border-indigo-200 shadow-sm p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-slate-900">
              {t('shareConsent.requestFrom', { name: req.requester_name })}
            </p>
            <p className="text-xs text-slate-500">
              {t('shareConsent.shareTo', { name: req.target_name })}
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-700 italic line-clamp-3">"{req.comment_content}"</p>
          </div>
          {req.note && (
            <div>
              <p className="text-xs font-semibold text-slate-600">{t('shareConsent.note')}</p>
              <p className="text-xs text-slate-700">{req.note}</p>
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => respond.mutate({ id: req.id, decision: 'accept' })}
              disabled={respond.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {respond.isPending && respond.variables?.id === req.id
                ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                : <Check className="w-4 h-4 mr-1" />}
              {t('shareConsent.accept')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => respond.mutate({ id: req.id, decision: 'reject' })}
              disabled={respond.isPending}
            >
              <X className="w-4 h-4 mr-1" /> {t('shareConsent.reject')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSelectConversation?.(req.conversation_id)}
            >
              <MessageSquare className="w-4 h-4 mr-1" /> {t('shareConsent.reply')}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}