import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { Hash, Archive, Shield, UserCircle, MessageCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function DiscussionHeader({ poll, isArchived }) {
  const { data: infomarians = [] } = useQuery({
    queryKey: ['infomarians-list'],
    queryFn: () => base44.entities.Infomarian.list()
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', poll?.id],
    queryFn: () => poll?.id ? base44.entities.Comment.filter({ poll_id: poll.id }) : [],
    enabled: !!poll?.id
  });

  const assignedInfomarians = (poll?.assigned_infomarians || [])
    .map(id => infomarians.find(i => i.infomarian_id === id || i.id === id || i.user_email === id))
    .filter(Boolean);

  const creator = poll?.discussion_created_by
    ? infomarians.find(i => i.infomarian_id === poll.discussion_created_by)
    : null;

  const participantCount = new Set(comments.map(c => c.user_email || c.display_name).filter(Boolean)).size;

  return (
    <div className="space-y-4">
      {/* Poll ID Banner */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl text-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <Hash className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight truncate">{poll?.title || 'Untitled Poll'}</p>
            <p className="text-xs text-slate-300 uppercase tracking-wide font-medium mt-0.5">Pollee Inc. Poll ID</p>
            <p className="font-mono text-xs font-medium tracking-tight text-slate-300">{poll?.id || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isArchived ? (
            <Badge className="bg-slate-600 text-white border-0 gap-1">
              <Archive className="w-3 h-3" />
              Archived
            </Badge>
          ) : (
            <Badge className="bg-emerald-500 text-white border-0 gap-1">
              <MessageCircle className="w-3 h-3" />
              Active Discussion
            </Badge>
          )}
        </div>
      </div>

      {/* Moderator & Participants Info */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-indigo-600" />
            <p className="text-xs font-semibold text-indigo-900 uppercase tracking-wide">Moderated By</p>
          </div>
          {assignedInfomarians.length > 0 ? (
            <div className="space-y-1">
              {assignedInfomarians.map(inf => (
                <p key={inf.id} className="text-sm text-indigo-800 font-medium">{inf.full_name}</p>
              ))}
            </div>
          ) : creator ? (
            <p className="text-sm text-indigo-800 font-medium">{creator.full_name} (Creator)</p>
          ) : (
            <p className="text-sm text-slate-500 italic">No Infomarian assigned yet</p>
          )}
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <UserCircle className="w-4 h-4 text-slate-600" />
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Participants</p>
          </div>
          <p className="text-sm text-slate-700 font-medium">
            {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
          </p>
        </div>
      </div>

      {isArchived && poll?.archived_date && (
        <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-lg">
          <Clock className="w-4 h-4 text-slate-500" />
          <p className="text-sm text-slate-600">
            Archived on {format(new Date(poll.archived_date), 'MMM d, yyyy')} for future reference
          </p>
        </div>
      )}
    </div>
  );
}