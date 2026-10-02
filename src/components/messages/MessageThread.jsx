import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Lock, Paperclip, X, Loader2, FileIcon } from 'lucide-react';
import { format } from 'date-fns';
import AttachmentLink from '@/components/messages/AttachmentLink';

export default function MessageThread({ conversation, currentUser, t }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

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
    mutationFn: ({ content, attachment }) =>
      base44.functions.invoke('send-message', { conversation_id: conversation.id, content, attachment }),
    onSuccess: () => {
      setText('');
      setPendingFile(null);
      queryClient.invalidateQueries(['messages', conversation.id]);
      queryClient.invalidateQueries(['conversations']);
    }
  });

  const handleSend = async (e) => {
    e.preventDefault();
    if (send.isPending || uploading || conversation.status === 'closed') return;
    const content = text.trim();
    if (!content && !pendingFile) return;

    let attachment = null;
    if (pendingFile) {
      setUploading(true);
      try {
        const res = await base44.integrations.Core.UploadPrivateFile({ file: pendingFile });
        attachment = {
          name: pendingFile.name,
          file_uri: res.file_uri,
          content_type: pendingFile.type || '',
          size: pendingFile.size
        };
      } finally {
        setUploading(false);
      }
    }
    send.mutate({ content, attachment });
  };

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setPendingFile(f);
    e.target.value = '';
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
                {m.content && <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>}
                {m.attachment && (
                  <div className={m.content ? 'mt-2' : ''}>
                    <AttachmentLink attachment={m.attachment} mine={mine} />
                  </div>
                )}
                <p className={`text-[10px] mt-1 ${mine ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {format(new Date(m.created_date), 'MMM d, h:mm a')}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-white">
        {pendingFile && (
          <div className="mb-2 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <FileIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <span className="text-sm text-slate-700 truncate flex-1">{pendingFile.name}</span>
            <button type="button" onClick={() => setPendingFile(null)} className="text-slate-400 hover:text-red-500 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChange} />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={conversation.status === 'closed' || uploading}
            title={t('messages.attachFile') || 'Attach file'}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={t('messages.typeMessage')}
            disabled={conversation.status === 'closed'}
          />
          <Button
            type="submit"
            disabled={send.isPending || uploading || conversation.status === 'closed' || (!text.trim() && !pendingFile)}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}