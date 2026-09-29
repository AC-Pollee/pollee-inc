import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Vote, Eye, MessageSquare, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

export default function AssignedPolls({ infomarian }) {
  const { t } = useTranslation();
  const { data: polls = [], isLoading } = useQuery({
    queryKey: ['assignedPolls', infomarian.id],
    queryFn: async () => {
      const allPolls = await base44.entities.Poll.list('-created_date');
      // Filter polls assigned to this infomarian or matching their moderation level
      return allPolls.filter(poll => 
        poll.assigned_infomarians?.includes(infomarian.id) ||
        poll.poll_level === infomarian.moderation_level ||
        infomarian.moderation_level === 'all'
      );
    }
  });

  const { data: votes = [] } = useQuery({
    queryKey: ['votes'],
    queryFn: () => base44.entities.Vote.list()
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments'],
    queryFn: () => base44.entities.Comment.list()
  });

  const getStats = (pollId) => {
    const pollVotes = votes.filter(v => v.poll_id === pollId && v.status === 'verified');
    const pollComments = comments.filter(c => c.poll_id === pollId);
    return {
      votes: pollVotes.reduce((sum, v) => sum + (v.delegated_votes_count || 1), 0),
      comments: pollComments.length
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (polls.length === 0) {
    return (
      <Card className="border-0 shadow-xl text-center">
        <CardContent className="pt-12 pb-12">
          <Vote className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('assignedPolls.noAssignedPolls')}</h3>
          <p className="text-slate-500">{t('assignedPolls.noAssignedPollsDesc')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {polls.map((poll, index) => {
        const stats = getStats(poll.id);
        return (
          <motion.div
            key={poll.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{poll.title}</h3>
                      <Badge className={`${
                        poll.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      } border`}>
                        {poll.status}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {poll.poll_level}
                      </Badge>
                    </div>
                    {poll.description && (
                      <p className="text-sm text-slate-600 mb-3">{poll.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {stats.votes} votes
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {stats.comments} comments
                      </span>
                      {poll.end_date && (
                        <span>Ends {format(new Date(poll.end_date), 'MMM d, yyyy')}</span>
                      )}
                    </div>
                  </div>
                  <Link to={createPageUrl(`Results`)}>
                    <Button variant="outline" size="sm" className="shrink-0">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}