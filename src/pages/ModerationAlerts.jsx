import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { ShieldAlert, Trash2, Ban, CheckCircle2, MessageSquare, FileText, Inbox } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const POLL_STATUS = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Struck', color: 'bg-red-100 text-red-700' },
};

const COMMENT_STATUS = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  flagged: { label: 'Flagged', color: 'bg-orange-100 text-orange-700' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Struck', color: 'bg-red-100 text-red-700' },
};

export default function ModerationAlerts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('comments');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: infomarians = [] } = useQuery({ queryKey: ['infomarians'], queryFn: () => base44.entities.Infomarian.list() });
  const { data: franchises = [] } = useQuery({ queryKey: ['franchises'], queryFn: () => base44.entities.Franchise.list() });
  const { data: polls = [] } = useQuery({ queryKey: ['polls'], queryFn: () => base44.entities.Poll.list('-created_date') });
  const { data: comments = [] } = useQuery({ queryKey: ['comments-all'], queryFn: () => base44.entities.Comment.list('-created_date') });

  const isSuperAdmin = user?.email === 'ac@acproductiondesign.com';
  const myInfomarian = infomarians.find(i => i.user_email === user?.email);
  const myFranchise = franchises.find(f => f.owner_email === user?.email);
  const isMaster = user?.user_role === 'master_franchiser';
  const isManager = user?.user_role === 'franchise_manager';
  const hasAccess = isSuperAdmin || isMaster || isManager || !!myInfomarian || !!myFranchise;

  // Determine the set of poll IDs this user may moderate
  let scopedPollIds = null; // null = all polls
  if (isSuperAdmin || isMaster) {
    scopedPollIds = null;
  } else if (isManager || myFranchise) {
    scopedPollIds = new Set(polls.filter(p => p.franchise_id === myFranchise?.id).map(p => p.id));
  } else if (myInfomarian) {
    scopedPollIds = new Set(
      polls.filter(p => (p.assigned_infomarians || []).includes(myInfomarian.infomarian_id)).map(p => p.id)
    );
  }

  const pendingPolls = polls.filter(
    p => p.moderation_status === 'pending' && (scopedPollIds === null || scopedPollIds.has(p.id))
  );
  const flaggedComments = comments.filter(
    c => (c.moderation_status === 'pending' || c.moderation_status === 'flagged')
      && (scopedPollIds === null || scopedPollIds.has(c.poll_id))
  );

  const moderatorId = myInfomarian?.infomarian_id || user?.email;

  const updatePoll = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Poll.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['polls'])
  });
  const deletePoll = useMutation({
    mutationFn: (id) => base44.entities.Poll.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['polls'])
  });
  const updateComment = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Comment.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['comments-all'])
  });
  const deleteComment = useMutation({
    mutationFn: (id) => base44.entities.Comment.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['comments-all'])
  });

  const strikePoll = (poll) => {
    const reason = prompt('Reason for striking this post:');
    if (!reason) return;
    updatePoll.mutate({
      id: poll.id,
      data: { moderation_status: 'rejected', moderated_by: moderatorId, moderation_reason: reason, moderation_date: new Date().toISOString() }
    });
    toast({ title: 'Post struck through' });
  };
  const approvePoll = (poll) => {
    updatePoll.mutate({
      id: poll.id,
      data: { moderation_status: 'approved', moderated_by: moderatorId, moderation_date: new Date().toISOString() }
    });
    toast({ title: 'Post approved' });
  };
  const removePoll = (poll) => {
    if (!confirm('Permanently remove this post?')) return;
    deletePoll.mutate(poll.id);
    toast({ title: 'Post removed' });
  };

  const strikeComment = async (c) => {
    const reason = prompt('Reason for striking this comment:');
    if (!reason) return;
    try {
      const res = await base44.functions.invoke('issue-strike', {
        target_type: 'comment',
        target_id: c.id,
        reason
      });
      queryClient.invalidateQueries(['comments-all']);
      queryClient.invalidateQueries(['comments', c.poll_id]);
      toast({
        title: res.data?.strike_issued ? `Strike ${res.data.strike_count} of 3 issued` : 'Comment struck through',
        description: res.data?.consequence
      });
    } catch (err) {
      toast({ title: 'Failed to strike comment', description: err?.message, variant: 'destructive' });
    }
  };
  const approveComment = (c) => {
    updateComment.mutate({ id: c.id, data: { moderation_status: 'approved', moderated_by: moderatorId } });
    toast({ title: 'Comment approved' });
  };
  const removeComment = (c) => {
    if (!confirm('Permanently remove this comment?')) return;
    deleteComment.mutate(c.id);
    toast({ title: 'Comment removed' });
  };

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-8">
        <Card className="max-w-md text-center">
          <CardContent className="pt-12 pb-12">
            <ShieldAlert className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Access Denied</h2>
            <p className="text-slate-500">Moderation access is restricted to Infomarians and Constituency administrators.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Moderation Alerts</h1>
            <p className="text-sm text-slate-500">Review pending posts and comments. Strike through or remove as needed.</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="comments" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Comments
              {flaggedComments.length > 0 && <Badge className="bg-red-500 text-white">{flaggedComments.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-2">
              <FileText className="w-4 h-4" />
              Posts
              {pendingPolls.length > 0 && <Badge className="bg-amber-500 text-white">{pendingPolls.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="comments" className="mt-4 space-y-3">
            {flaggedComments.length === 0 ? (
              <EmptyState text="No comments pending moderation." />
            ) : (
              flaggedComments.map(c => {
                const poll = polls.find(p => p.id === c.poll_id);
                return (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3 bg-white dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={COMMENT_STATUS[c.moderation_status]?.color}>{COMMENT_STATUS[c.moderation_status]?.label}</Badge>
                        <span className="text-xs text-slate-500">{c.user_name || c.display_name || 'Anonymous'}</span>
                        <span className="text-xs text-slate-400">· {format(new Date(c.created_date), 'MMM d, h:mm a')}</span>
                      </div>
                      {poll && <span className="text-xs text-slate-400">on: {poll.title}</span>}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{c.content}</p>
                    {c.moderation_reason && (
                      <p className="text-xs text-red-700 bg-red-50 dark:bg-red-900/30 rounded p-2">Flag reason: {c.moderation_reason}</p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => approveComment(c)} className="text-green-700 border-green-300 hover:bg-green-50">
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => strikeComment(c)} className="text-amber-700 border-amber-300 hover:bg-amber-50">
                        <Ban className="w-4 h-4 mr-1" /> Strike Through
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => removeComment(c)} className="text-red-700 border-red-300 hover:bg-red-50">
                        <Trash2 className="w-4 h-4 mr-1" /> Remove
                      </Button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="posts" className="mt-4 space-y-3">
            {pendingPolls.length === 0 ? (
              <EmptyState text="No posts pending moderation." />
            ) : (
              pendingPolls.map(p => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3 bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={POLL_STATUS[p.moderation_status]?.color}>{POLL_STATUS[p.moderation_status]?.label}</Badge>
                      <Badge variant="outline" className="capitalize">{p.poll_level}</Badge>
                      <span className="text-xs text-slate-400">{p.created_date ? format(new Date(p.created_date), 'MMM d, h:mm a') : ''}</span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">{p.title}</h3>
                  {p.description && <p className="text-sm text-slate-600 dark:text-slate-400">{p.description}</p>}
                  <div className="flex flex-wrap gap-2">
                    {(p.options || []).map(o => (
                      <span key={o.id} className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{o.label}</span>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => approvePoll(p)} className="text-green-700 border-green-300 hover:bg-green-50">
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => strikePoll(p)} className="text-amber-700 border-amber-300 hover:bg-amber-50">
                      <Ban className="w-4 h-4 mr-1" /> Strike Through
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => removePoll(p)} className="text-red-700 border-red-300 hover:bg-red-50">
                      <Trash2 className="w-4 h-4 mr-1" /> Remove
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
      <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p className="text-sm">{text}</p>
    </div>
  );
}