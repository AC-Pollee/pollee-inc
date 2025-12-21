import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Flag, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export default function CommentsModeration({ infomarian }) {
  const queryClient = useQueryClient();
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingComment, setRejectingComment] = useState(null);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['commentsToModerate'],
    queryFn: () => base44.entities.Comment.list('-created_date'),
    refetchInterval: 10000 // Refetch every 10 seconds for near real-time updates
  });

  const { data: polls = [] } = useQuery({
    queryKey: ['polls'],
    queryFn: () => base44.entities.Poll.list()
  });

  const updateComment = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Comment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['commentsToModerate']);
      setEditingComment(null);
      setRejectingComment(null);
      setRejectionReason('');
    }
  });

  const deleteComment = useMutation({
    mutationFn: (id) => base44.entities.Comment.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['commentsToModerate'])
  });

  const handleApprove = (comment) => {
    updateComment.mutate({
      id: comment.id,
      data: {
        moderation_status: 'approved',
        moderated_by: infomarian.infomarian_id
      }
    });
  };

  const handleReject = (comment) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    updateComment.mutate({
      id: comment.id,
      data: {
        moderation_status: 'rejected',
        moderated_by: infomarian.infomarian_id,
        moderation_reason: rejectionReason
      }
    });
  };

  const handleFlag = (comment) => {
    updateComment.mutate({
      id: comment.id,
      data: {
        moderation_status: 'flagged',
        moderated_by: infomarian.infomarian_id
      }
    });
  };

  const handleEdit = (comment) => {
    updateComment.mutate({
      id: comment.id,
      data: {
        content: editContent,
        moderation_status: 'approved',
        moderated_by: infomarian.infomarian_id
      }
    });
  };

  const getPollTitle = (pollId) => {
    const poll = polls.find(p => p.id === pollId);
    return poll?.title || 'Unknown Poll';
  };

  const pendingComments = comments.filter(c => 
    c.moderation_status === 'pending' || c.moderation_status === 'flagged'
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (pendingComments.length === 0) {
    return (
      <Card className="border-0 shadow-xl text-center">
        <CardContent className="pt-12 pb-12">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">All Caught Up!</h3>
          <p className="text-slate-500">No comments requiring moderation at this time.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pendingComments.map((comment, index) => (
        <motion.div
          key={comment.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">Comment on: {getPollTitle(comment.poll_id)}</CardTitle>
                    <Badge className={`${
                      comment.moderation_status === 'flagged'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    } border`}>
                      {comment.moderation_status === 'flagged' ? (
                        <>
                          <Flag className="w-3 h-3 mr-1" />
                          Flagged
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Pending
                        </>
                      )}
                    </Badge>
                    {comment.is_junior_member && (
                      <Badge variant="outline" className="text-xs">Junior Member</Badge>
                    )}
                  </div>
                  <div className="text-sm text-slate-500">
                    By {comment.user_name || comment.user_email} • {format(new Date(comment.created_date), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingComment === comment.id ? (
                <div className="space-y-3">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEdit(comment)}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Save Edit
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingComment(null);
                        setEditContent('');
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-slate-700 whitespace-pre-wrap">{comment.content}</p>
                </div>
              )}

              {rejectingComment === comment.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2"
                >
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Reason for rejection..."
                    className="min-h-[80px]"
                  />
                </motion.div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <Button
                  onClick={() => handleApprove(comment)}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={updateComment.isPending}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                
                {rejectingComment === comment.id ? (
                  <>
                    <Button
                      onClick={() => handleReject(comment)}
                      size="sm"
                      variant="destructive"
                      disabled={updateComment.isPending}
                    >
                      Confirm Reject
                    </Button>
                    <Button
                      onClick={() => {
                        setRejectingComment(null);
                        setRejectionReason('');
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setRejectingComment(comment.id)}
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                )}
                
                <Button
                  onClick={() => handleFlag(comment)}
                  size="sm"
                  variant="outline"
                  className="border-amber-200 text-amber-600 hover:bg-amber-50"
                  disabled={updateComment.isPending}
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Flag
                </Button>
                
                <Button
                  onClick={() => {
                    setEditingComment(comment.id);
                    setEditContent(comment.content);
                  }}
                  size="sm"
                  variant="ghost"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                
                <Button
                  onClick={() => {
                    if (confirm('Delete this comment permanently?')) {
                      deleteComment.mutate(comment.id);
                    }
                  }}
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}