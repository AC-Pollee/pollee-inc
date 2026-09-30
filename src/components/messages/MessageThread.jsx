import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Lock } from 'lucide-react';
import { format } from 'date-fns';

export default function MessageThread({ conversation, currentUser, t }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const scrollRef = useRef(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', conversation?.id],
    queryFn: () => base44.entities.Message.filter({ conversation_id: conversation.id }, 'created_date'),
    enabled: !!conversation?.id
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = base44.entities.Message.subscribe((event) => {
      if (event.data?.conversation_id === conversation.id) {
        queryClient.invalidateQueries(['messages', conversation.id]);
        queryClient.invalidateQueries(['conversations']);
      }
    });
    return unsub;
  }, [conversation?.id, queryClient]);

  const send = useMutation({
    mutationFn: (content) => base44.functions.invoke('send-message', { conversation_id: conversation.id, content }),
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries(['messages', conversation.id]);
      queryClient.invalidateQueries(['conversations']);
    }
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() || send.isPending) return;
    send.mutate(text.trim());
  };

  const other = (conversation.participant_names || []).find(p => p.user_id !== currentUser?.id);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 bg-white">
        <p className="font-semibold text-slate-900">{other?.name || 'Unknown'}</p>
        <p className="text-xs text-slate-500 flex items-center gap-1"><Lock className="w-3 h-3" /> {t('messages.private')}</p>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">{t('messages.noMessages')}</p>
        )}
        {messages.map(m => {
          const mine = m.sender_id === currentUser?.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${mine ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-900'}`}>
                <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                <p className={`text-[10px] mt-1 ${mine ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {format(new Date(m.created_date), 'MMM d, h:mm a')}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-white flex gap-2">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={t('messages.typeMessage')}
          disabled={conversation.status === 'closed'}
        />
        <Button type="submit" disabled={send.isPending || !text.trim() || conversation.status === 'closed'}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}