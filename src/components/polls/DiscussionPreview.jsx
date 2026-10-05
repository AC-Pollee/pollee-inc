import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, MessageCircle, MessageSquare, ArrowRight, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { usePollTranslation } from '@/hooks/usePollTranslation';
import PollTitle from '@/components/polls/PollTitle';
import CommentTranslation from '@/components/polls/CommentTranslation';

export default function DiscussionPreview({ constituencyFilter = [] }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedPollId, setSelectedPollId] = useState(null);

  const { data: polls = [], isLoading: loadingPolls } = useQuery({
    queryKey: ['polls'],
    queryFn: () => base44.entities.Poll.list('-created_date')
  });

  const { data: comments = [], isLoading: loadingComments } = useQuery({
    queryKey: ['comments'],
    queryFn: () => base44.entities.Comment.list('-created_date')
  });

  // Map poll id -> comment count (only approved/non-rejected comments)
  const commentCounts = useMemo(() => {
    const counts = {};
    comments.forEach((c) => {
      if (c.moderation_status === 'rejected') return;
      counts[c.poll_id] = (counts[c.poll_id] || 0) + 1;
    });
    return counts;
  }, [comments]);

  // Build discussion list with activity, sorted by most active.
  // Applies the active-poll constituency filter so the discussions shown match the polls above.
  const discussions = useMemo(() => {
    const scoped = constituencyFilter.length > 0
      ? polls.filter((p) => constituencyFilter.includes(p.franchise_id))
      : polls;
    return scoped
      .map((p) => ({ ...p, commentCount: commentCounts[p.id] || 0 }))
      .sort((a, b) => b.commentCount - a.commentCount);
  }, [polls, commentCounts, constituencyFilter]);

  // Filter by search (title or id)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return discussions;
    return discussions.filter(
      (p) =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.id || '').toLowerCase().includes(q)
    );
  }, [discussions, search]);

  // Reset an explicit selection when it falls outside the active constituency scope
  useEffect(() => {
    if (selectedPollId && !discussions.some((p) => p.id === selectedPollId)) {
      setSelectedPollId(null);
    }
  }, [selectedPollId, discussions]);

  // The preview target: explicitly selected, else most active, else first filtered
  const previewPoll = useMemo(() => {
    if (selectedPollId) return discussions.find((p) => p.id === selectedPollId);
    if (filtered.length > 0) return filtered[0];
    return null;
  }, [selectedPollId, filtered, discussions]);

  const { title: previewTitle, description: previewDescription, isTranslating, error: translationError, retryTranslation } = usePollTranslation(previewPoll);

  const previewComments = useMemo(() => {
    if (!previewPoll) return [];
    return comments
      .filter((c) => c.poll_id === previewPoll.id && c.moderation_status !== 'rejected')
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 4);
  }, [comments, previewPoll]);

  const isLoading = loadingPolls || loadingComments;

  return (
    <div className="max-w-6xl mx-auto px-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-indigo-600" />
            {t('discussionPreview.discussions')}
          </h2>
          <p className="text-slate-500 mt-1">{t('discussionPreview.subtitle')}</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedPollId(null);
          }}
          placeholder={t('discussionPreview.searchPlaceholder')}
          className="pl-10 bg-white"
        />
      </div>

      {isLoading ? (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 lg:col-span-2 rounded-2xl" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">{t('discussionPreview.noDiscussions')}</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Discussion list */}
          <div className="lg:col-span-1 space-y-2 max-h-[28rem] overflow-y-auto pr-1">
            {filtered.map((poll) => {
              const isActive = previewPoll?.id === poll.id;
              const isTop = poll.commentCount > 0 && discussions[0]?.id === poll.id;
              return (
                <button
                  key={poll.id}
                  onClick={() => setSelectedPollId(poll.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 flex-1">
                      <PollTitle poll={poll} />
                    </h3>
                    {isTop && (
                      <Flame className="w-4 h-4 text-orange-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      <MessageCircle className="w-3 h-3 mr-1" />
                      {poll.commentCount} {poll.commentCount === 1 ? t('discussionPreview.comment') : t('discussionPreview.comments')}
                    </Badge>
                    <span className="text-xs text-slate-400 truncate">{poll.id}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Preview pane */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            {previewPoll ? (
              <>
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {t(`admin.${previewPoll.poll_level === 'federal' ? 'federalLevel' : previewPoll.poll_level === 'state' ? 'stateLevel' : 'localLevel'}`)}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      <MessageCircle className="w-3 h-3 mr-1" />
                      {previewPoll.commentCount} {previewPoll.commentCount === 1 ? t('discussionPreview.comment') : t('discussionPreview.comments')}
                    </Badge>
                    {discussions[0]?.id === previewPoll.id && previewPoll.commentCount > 0 && (
                      <Badge className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-100">
                        <Flame className="w-3 h-3 mr-1" />
                        {t('discussionPreview.mostActive')}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{previewTitle}</h3>
                  {previewPoll.description && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{previewDescription}</p>
                  )}
                  {isTranslating && <p role="status" className="text-xs text-muted-foreground mt-1">{t('commentTranslation.translating')}</p>}
                  {translationError && <button type="button" onClick={() => retryTranslation()} className="text-xs text-destructive mt-1">{t('commentTranslation.error')}</button>}
                </div>

                <div className="p-5 space-y-4 flex-1">
                  {previewComments.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">{t('discussionPreview.noCommentsYet')}</p>
                    </div>
                  ) : (
                    previewComments.map((c) => (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-indigo-700">
                            {(c.user_name || c.display_name || 'A').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-900">
                              {c.user_name || c.display_name || 'Anonymous'}
                            </span>
                            {c.author_type === 'infomarian' && (
                              <Badge className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-100">Infomarian</Badge>
                            )}
                            <span className="text-xs text-slate-400">
                              {c.created_date ? format(new Date(c.created_date), 'dd MMM, HH:mm') : ''}
                            </span>
                          </div>
                          <CommentTranslation comment={c} compact />
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                <div className="p-5 border-t border-slate-100">
                  <Link to={createPageUrl('Vote') + `?pollId=${previewPoll.id}#discussion`}>
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                      {t('discussionPreview.joinDiscussion')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-slate-500">{t('discussionPreview.selectDiscussion')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}