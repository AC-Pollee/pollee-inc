import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Plus, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ConversationList from '@/components/messages/ConversationList';
import MessageThread from '@/components/messages/MessageThread';
import NewConversationDialog from '@/components/messages/NewConversationDialog';
import ShareConsentRequests from '@/components/messages/ShareConsentRequests';

export default function Messages() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState(searchParams.get('c') || null);
  const [showNew, setShowNew] = useState(false);
  const [seenIds, setSeenIds] = useState(() => {
    const init = searchParams.get('c');
    return init ? new Set([init]) : new Set();
  });

  const handleSelect = (id) => {
    setSelectedId(id);
    if (id) setSeenIds(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => base44.entities.Conversation.list('-last_message_at'),
    refetchInterval: 20000
  });

  const { data: infomarians = [] } = useQuery({
    queryKey: ['infomarians-list'],
    queryFn: () => base44.entities.Infomarian.list(),
    enabled: !!currentUser
  });
  const { data: franchises = [] } = useQuery({
    queryKey: ['franchises'],
    queryFn: () => base44.entities.Franchise.list(),
    enabled: !!currentUser
  });

  const canModerate = !!currentUser && (
    currentUser.email === 'ac@acproductiondesign.com' ||
    currentUser.role === 'admin' ||
    ['admin', 'master_franchiser', 'franchise_manager', 'infomarian'].includes(currentUser.user_role) ||
    infomarians.some(i => i.user_email === currentUser.email) ||
    franchises.some(f => f.owner_email === currentUser.email)
  );

  useEffect(() => {
    const unsub = base44.entities.Conversation.subscribe(() => queryClient.invalidateQueries(['conversations']));
    return unsub;
  }, [queryClient]);

  const selected = conversations.find(c => c.id === selectedId);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t('messages.title')}</h1>
            </div>
          </div>
          {canModerate && (
            <Button onClick={() => setShowNew(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" /> {t('messages.newConversation')}
            </Button>
          )}
        </div>

        <ShareConsentRequests currentUser={currentUser} onSelectConversation={handleSelect} />
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="grid md:grid-cols-3 h-[70vh]">
            <div className={`md:border-r border-slate-200 flex flex-col ${selectedId ? 'hidden md:block' : 'block'}`}>
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 shrink-0">
                <h2 className="text-center text-xl font-semibold text-slate-700">{t('messages.existingConversations')}</h2>
              </div>
              <div className="overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 text-center text-slate-400 text-sm">{t('common.loading')}</div>
                ) : (
                  <ConversationList
                    conversations={conversations}
                    currentUser={currentUser}
                    selectedId={selectedId}
                    onSelect={handleSelect}
                    seenIds={seenIds}
                    t={t}
                  />
                )}
              </div>
            </div>
            <div className={`md:col-span-2 flex flex-col min-h-0 ${selectedId ? 'block' : 'hidden md:block'}`}>
              {selected ? (
                <>
                  <Button variant="ghost" size="sm" className="md:hidden m-2 w-fit" onClick={() => setSelectedId(null)}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> {t('messages.back')}
                  </Button>
                  <div className="flex-1 min-h-0">
                    <MessageThread conversation={selected} currentUser={currentUser} t={t} />
                  </div>
                </>
              ) : selectedId ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">{t('common.loading')}</div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>{t('messages.selectConversation')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
      <NewConversationDialog
        open={showNew}
        onOpenChange={setShowNew}
        t={t}
        onCreated={(conv) => {
          setShowNew(false);
          setSelectedId(conv.id);
          setSeenIds(prev => { const n = new Set(prev); n.add(conv.id); return n; });
          queryClient.invalidateQueries(['conversations']);
        }}
      />
    </div>
  );
}