import React from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';

export default function ConversationList({ conversations, currentUser, selectedId, onSelect, t }) {
  if (!conversations || conversations.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">{t('messages.noConversations')}</p>
      </div>
    );
  }
  return (
    <div className="divide-y divide-slate-100">
      {conversations.map(c => {
        const other = (c.participant_names || []).find(p => p.user_id !== currentUser?.id)
          || (c.participant_names || [])[0];
        const isSel = c.id === selectedId;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`w-full text-left p-4 flex gap-3 transition-colors ${isSel ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
          >
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-slate-900 truncate">{other?.name || 'Unknown'}</p>
                {c.last_message_at && (
                  <span className="text-xs text-slate-400 shrink-0">{format(new Date(c.last_message_at), 'MMM d')}</span>
                )}
              </div>
              <p className="text-sm text-slate-500 truncate">{c.last_message_preview || c.subject || ''}</p>
              {c.status === 'closed' && <Badge variant="outline" className="mt-1">{t('messages.closed')}</Badge>}
            </div>
          </button>
        );
      })}
    </div>
  );
}