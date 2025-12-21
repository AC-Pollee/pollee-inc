import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function EarningsTracker({ infomarian }) {
  const { data: votes = [], isLoading } = useQuery({
    queryKey: ['infomarianVotes', infomarian.infomarian_id],
    queryFn: async () => {
      const allVotes = await base44.entities.Vote.list('-created_date');
      return allVotes.filter(v => 
        v.infomarian_id === infomarian.infomarian_id && v.status === 'verified'
      );
    }
  });

  const { data: polls = [] } = useQuery({
    queryKey: ['polls'],
    queryFn: () => base44.entities.Poll.list()
  });

  const calculateEarnings = (vote) => {
    const perVoteEarning = 0.30; // $0.30 per vote
    return perVoteEarning * (vote.delegated_votes_count || 1);
  };

  const totalEarnings = votes.reduce((sum, vote) => sum + calculateEarnings(vote), 0);
  const thisMonthVotes = votes.filter(v => {
    const voteDate = new Date(v.created_date);
    const now = new Date();
    return voteDate.getMonth() === now.getMonth() && voteDate.getFullYear() === now.getFullYear();
  });
  const thisMonthEarnings = thisMonthVotes.reduce((sum, vote) => sum + calculateEarnings(vote), 0);

  const getPollTitle = (pollId) => {
    const poll = polls.find(p => p.id === pollId);
    return poll?.title || 'Unknown Poll';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Earnings Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-green-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">Total Earnings</p>
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-3xl font-bold text-emerald-700">
                ${totalEarnings.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                From {votes.length} verified votes
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">This Month</p>
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-700">
                ${thisMonthEarnings.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {thisMonthVotes.length} votes
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">Per Vote</p>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-700">$0.30</p>
              <p className="text-xs text-slate-500 mt-1">
                Standard rate
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Transaction History */}
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {votes.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {votes.slice(0, 50).map((vote, index) => (
                <motion.div
                  key={vote.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 mb-1">
                      {getPollTitle(vote.poll_id)}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <span>{format(new Date(vote.created_date), 'MMM d, yyyy h:mm a')}</span>
                      <span>•</span>
                      <span>Voter: {vote.voter_name}</span>
                      {vote.delegated_votes_count > 1 && (
                        <>
                          <span>•</span>
                          <Badge variant="outline" className="text-xs">
                            {vote.delegated_votes_count} delegated votes
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-600">
                      +${calculateEarnings(vote).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">
                      ${vote.transaction_amount?.toFixed(2)} total
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}