import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { History, CheckCircle2, Clock, XCircle, RefreshCw, Search } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function VoteHistory({ userId, voterEmail }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: votes = [], isLoading } = useQuery({
    queryKey: ['vote-history', userId],
    queryFn: async () => {
      const allVotes = await base44.entities.Vote.list('-created_date');
      return allVotes.filter(v => 
        v.voter_id === userId || v.created_by === voterEmail
      );
    },
    enabled: !!(userId || voterEmail)
  });

  const { data: polls = [] } = useQuery({
    queryKey: ['polls'],
    queryFn: () => base44.entities.Poll.list()
  });

  const getPollTitle = (pollId) => {
    const poll = polls.find(p => p.id === pollId);
    return poll?.title || 'Unknown Poll';
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'verified': return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-amber-600" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'verified': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'rejected': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Group votes by poll to show change history
  const votesByPoll = votes.reduce((acc, vote) => {
    if (!acc[vote.poll_id]) {
      acc[vote.poll_id] = [];
    }
    acc[vote.poll_id].push(vote);
    return acc;
  }, {});

  // Filter polls based on search query
  const filteredVotesByPoll = Object.entries(votesByPoll).filter(([pollId, pollVotes]) => {
    if (!searchQuery.trim()) return true;
    const pollTitle = getPollTitle(pollId).toLowerCase();
    const query = searchQuery.toLowerCase();
    return pollTitle.includes(query) || pollId.toLowerCase().includes(query);
  });

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <CardTitle>{t('voteHistory.title')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
          <div>
            <CardTitle>{t('voteHistory.title')}</CardTitle>
            <p className="text-indigo-100 text-sm mt-1">
              {t('voteHistory.subtitle')}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder={t('voteHistory.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        {votes.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <History className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500">{t('voteHistory.noHistory')}</p>
          </div>
        ) : filteredVotesByPoll.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500">No polls found matching "{searchQuery}"</p>
          </div>
        ) : (
          <div className="space-y-6 max-h-[800px] overflow-y-auto pr-2">
            {filteredVotesByPoll.map(([pollId, pollVotes], idx) => {
              const latestVote = pollVotes[0]; // Already sorted by -created_date
              const hasChanges = pollVotes.length > 1;
              
              return (
                <motion.div
                  key={pollId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="border border-slate-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 mb-1">
                        {getPollTitle(pollId)}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getStatusColor(latestVote.status)} border`}>
                          <span className="mr-1">{getStatusIcon(latestVote.status)}</span>
                          {latestVote.status}
                        </Badge>
                        {hasChanges && (
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200 border">
                            <RefreshCw className="w-3 h-3 mr-1" />
                            {pollVotes.length} changes
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                      {format(new Date(latestVote.created_date), 'MMM d, yyyy')}
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{t('voteHistory.currentVote')}</span>
                      <span className="font-semibold text-slate-900">{latestVote.option_label}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{t('voteHistory.votesCast')}</span>
                      <span className="font-semibold text-slate-900">{latestVote.delegated_votes_count || 1}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{t('voteHistory.amount')}</span>
                      <span className="font-semibold text-slate-900">${latestVote.transaction_amount?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>

                  {hasChanges && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-indigo-600 hover:text-indigo-700 font-medium">
                        View Change History ({pollVotes.length - 1} previous)
                      </summary>
                      <div className="mt-3 space-y-2">
                        {pollVotes.slice(1).map((vote, voteIdx) => (
                          <div key={vote.id} className="border-l-2 border-slate-200 pl-3 py-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-slate-700">{vote.option_label}</p>
                                <p className="text-xs text-slate-500">
                                  {format(new Date(vote.created_date), 'MMM d, yyyy h:mm a')}
                                </p>
                              </div>
                              <Badge className={`${getStatusColor(vote.status)} border text-xs`}>
                                {vote.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}