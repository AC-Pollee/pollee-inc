import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertCircle, Flag, Clock, CheckCircle2, XCircle, 
  MessageCircle, User, Shield 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function ModerationQueue({ infomarian }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['moderationQueue'],
    queryFn: () => base44.entities.Comment.list('-created_date'),
    refetchInterval: 5000
  });

  const { data: polls = [] } = useQuery({
    queryKey: ['polls'],
    queryFn: () => base44.entities.Poll.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const pendingComments = comments.filter(c => c.moderation_status === 'pending');
  const flaggedComments = comments.filter(c => c.moderation_status === 'flagged');
  const recentActions = comments.filter(c => 
    (c.moderation_status === 'approved' || c.moderation_status === 'rejected') &&
    c.moderated_by === infomarian.infomarian_id
  ).slice(0, 20);

  const getPollTitle = (pollId) => {
    const poll = polls.find(p => p.id === pollId);
    return poll?.title || 'Unknown Poll';
  };

  const getUserInfo = (email) => {
    const user = users.find(u => u.email === email);
    return user;
  };

  const renderCommentCard = (comment, showFullControls = true) => {
    const user = getUserInfo(comment.user_email);
    const hasStrikes = user?.strikes && user.strikes.length > 0;

    return (
      <motion.div
        key={comment.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-0 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`${
                    comment.moderation_status === 'flagged'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : comment.moderation_status === 'pending'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : comment.moderation_status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  } border`}>
                    {comment.moderation_status === 'flagged' && <Flag className="w-3 h-3 mr-1" />}
                    {comment.moderation_status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                    {comment.moderation_status === 'approved' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                    {comment.moderation_status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                    {comment.moderation_status}
                  </Badge>
                  {comment.is_infomarian_content && (
                    <Badge className="bg-indigo-100 text-indigo-700">Infomarian Content</Badge>
                  )}
                  {comment.is_junior_member && (
                    <Badge variant="outline">Junior Member</Badge>
                  )}
                  {hasStrikes && (
                    <Badge variant="destructive">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {user.strikes.length} Strike{user.strikes.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-sm font-medium text-slate-600">
                  On: {getPollTitle(comment.poll_id)}
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <User className="w-3 h-3" />
                  <span>{comment.user_name || comment.user_email}</span>
                  <span>•</span>
                  <span>{format(new Date(comment.created_date), 'MMM d, h:mm a')}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.content}</p>
            </div>

            {comment.moderation_reason && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-900 mb-1">Moderation Note:</p>
                <p className="text-xs text-amber-800">{comment.moderation_reason}</p>
              </div>
            )}

            {comment.moderated_by && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Shield className="w-3 h-3" />
                <span>Moderated by: {comment.moderated_by}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">Pending</p>
                <p className="text-3xl font-bold text-amber-900">{pendingComments.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-rose-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Flagged</p>
                <p className="text-3xl font-bold text-red-900">{flaggedComments.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Flag className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Recent Actions</p>
                <p className="text-3xl font-bold text-emerald-900">{recentActions.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-indigo-600" />
            Moderation Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="pending" className="relative">
                Pending
                {pendingComments.length > 0 && (
                  <Badge className="ml-2 bg-amber-500 text-white">{pendingComments.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="flagged" className="relative">
                Flagged
                {flaggedComments.length > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white">{flaggedComments.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="recent">Recent Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingComments.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">All Caught Up!</h3>
                  <p className="text-slate-500">No pending comments at this time.</p>
                </div>
              ) : (
                pendingComments.map(comment => renderCommentCard(comment))
              )}
            </TabsContent>

            <TabsContent value="flagged" className="space-y-4">
              {flaggedComments.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Flagged Content</h3>
                  <p className="text-slate-500">All content has been reviewed.</p>
                </div>
              ) : (
                flaggedComments.map(comment => renderCommentCard(comment))
              )}
            </TabsContent>

            <TabsContent value="recent" className="space-y-4">
              {recentActions.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Recent Actions</h3>
                  <p className="text-slate-500">Your moderation history will appear here.</p>
                </div>
              ) : (
                recentActions.map(comment => renderCommentCard(comment, false))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}