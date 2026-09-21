import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Reply, Flag, Trash2, CheckCircle2, XCircle, AlertTriangle, Edit2, Send, Archive, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import DiscussionHeader from './DiscussionHeader';
import ResponsibilityAgreement from './ResponsibilityAgreement';
import { useToast } from "@/components/ui/use-toast";

export default function PollDiscussion({ pollId, currentUser, userAge, isClosed = false, poll }) {
  const [newComment, setNewComment] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [responsibilityAccepted, setResponsibilityAccepted] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyResponsibility, setReplyResponsibility] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isSuperAdmin = currentUser?.email === 'ac@acproductiondesign.com';
  const isArchived = isClosed || poll?.discussion_status === 'archived';

  // Determine author type
  const { data: infomarian } = useQuery({
    queryKey: ['my-infomarian', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const infomarians = await base44.entities.Infomarian.list();
      return infomarians.find(i => i.user_email === currentUser.email);
    },
    enabled: !!currentUser?.email
  });

  const isInfomarianOrAdmin = isSuperAdmin || !!infomarian;

  const getAuthorType = () => {
    if (isInfomarianOrAdmin) return 'infomarian';
    if (currentUser?.account_validated) return 'member';
    return 'public';
  };

  const authorType = getAuthorType();

  // Check if user is suspended or banned
  const isUserSuspended = () => {
    if (!currentUser) return false;
    if (currentUser.permanently_banned) return true;
    if (currentUser.suspension_end_date) {
      return new Date(currentUser.suspension_end_date) > new Date();
    }
    return false;
  };

  const getSuspensionMessage = () => {
    if (currentUser?.permanently_banned) {
      return "Your commenting privileges have been permanently revoked due to repeated Code of Conduct violations.";
    }
    if (currentUser?.suspension_end_date) {
      const endDate = new Date(currentUser.suspension_end_date);
      if (endDate > new Date()) {
        return `Your commenting privileges are suspended until ${format(endDate, 'MMM d, yyyy h:mm a')} due to Code of Conduct violations.`;
      }
    }
    return null;
  };

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', pollId],
    queryFn: () => base44.entities.Comment.filter({ poll_id: pollId }, '-created_date'),
    enabled: !!pollId
  });

  const addComment = useMutation({
    mutationFn: (data) => base44.entities.Comment.create(data),
    onSuccess: (comment) => {
      queryClient.invalidateQueries(['comments', pollId]);
      queryClient.invalidateQueries(['poll-comments', pollId]);
      setNewComment('');
      setReplyingTo(null);
      setReplyResponsibility(false);
      toast({
        title: "Comment posted",
        description: "Your comment is now visible to everyone.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to post comment",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    }
  });

  const updateComment = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Comment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['comments', pollId]);
      queryClient.invalidateQueries(['poll-comments', pollId]);
      setEditingComment(null);
    }
  });

  const deleteComment = useMutation({
    mutationFn: (id) => base44.entities.Comment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['comments', pollId]);
      queryClient.invalidateQueries(['poll-comments', pollId]);
    }
  });

  const canPost = () => {
    if (!currentUser) return false;
    if (isArchived) return false;
    if (isUserSuspended()) return false;
    if (userAge !== null && userAge < 12) return false;
    if (!responsibilityAccepted) return false;
    if (!newComment.trim()) return false;
    // Public users need a display name
    if (authorType === 'public' && !displayName.trim()) return false;
    return true;
  };

  const canReply = () => {
    if (!currentUser) return false;
    if (isArchived) return false;
    if (isUserSuspended()) return false;
    if (userAge !== null && userAge < 12) return false;
    if (!replyResponsibility) return false;
    if (!newComment.trim()) return false;
    if (authorType === 'public' && !displayName.trim()) return false;
    return true;
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!canPost()) return;

    const resolvedName = authorType === 'public'
      ? displayName.trim()
      : (currentUser.full_name || currentUser.email);

    addComment.mutate({
      poll_id: pollId,
      user_name: resolvedName,
      user_email: currentUser.email,
      display_name: authorType === 'public' ? displayName.trim() : undefined,
      content: newComment.trim(),
      parent_comment_id: replyingTo,
      author_type: authorType,
      responsibility_accepted: true,
      is_junior_member: userAge >= 12 && userAge < 18,
      moderation_status: 'approved',
      is_infomarian_content: !!infomarian
    });
  };

  const handleModerate = (commentId, status, reason = null) => {
    updateComment.mutate({
      id: commentId,
      data: {
        moderation_status: status,
        moderated_by: infomarian?.infomarian_id || currentUser?.email,
        moderation_reason: reason
      }
    });
  };

  const handleFlag = (commentId) => {
    const reason = prompt('Please provide a reason for flagging this comment:');
    if (reason) {
      handleModerate(commentId, 'flagged', reason);
    }
  };

  // Organize comments into threads
  const approvedComments = comments;
  const topLevelComments = approvedComments.filter(c => !c.parent_comment_id);
  const getReplies = (commentId) => approvedComments.filter(c => c.parent_comment_id === commentId);

  const authorBadge = (comment) => {
    const type = comment.author_type || (comment.is_infomarian_content ? 'infomarian' : 'member');
    if (comment.is_infomarian_content || type === 'infomarian') {
      return <Badge className="bg-indigo-600 text-white text-xs">Infomarian</Badge>;
    }
    if (type === 'public') {
      return <Badge className="bg-slate-200 text-slate-700 text-xs">Public</Badge>;
    }
    if (comment.is_junior_member) {
      return <Badge className="bg-blue-100 text-blue-700 text-xs">Junior</Badge>;
    }
    return <Badge className="bg-emerald-100 text-emerald-700 text-xs">Member</Badge>;
  };

  const renderComment = (comment, depth = 0) => {
    const replies = getReplies(comment.id);
    const isOwnComment = comment.user_email === currentUser?.email;
    const canModerate = isInfomarianOrAdmin;

    return (
      <motion.div
        key={comment.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${depth > 0 ? 'ml-6 md:ml-8 mt-3 pl-3 md:pl-4 border-l-2 border-slate-200' : 'mb-4'}`}
      >
        <div className={`p-3 md:p-4 rounded-lg ${
          comment.moderation_status === 'rejected' ? 'bg-red-50 border border-red-200' :
          comment.moderation_status === 'flagged' ? 'bg-orange-50 border border-orange-200' :
          comment.is_infomarian_content ? 'bg-indigo-50 border border-indigo-200' :
          'bg-slate-50'
        }`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-semibold">
                {(comment.display_name || comment.user_name)?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-xs md:text-sm text-slate-900">
                    {comment.display_name || comment.user_name}
                  </p>
                  {authorBadge(comment)}
                  {comment.moderation_status === 'rejected' && (
                    <Badge className="bg-red-600 text-white text-xs inline-flex items-center gap-1">
                      <Flag className="w-3 h-3" />
                      Moderated
                    </Badge>
                  )}
                  {comment.moderation_status === 'flagged' && (
                    <Badge className="bg-orange-500 text-white text-xs">Flagged</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500">{format(new Date(comment.created_date), 'MMM d, h:mm a')}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {canModerate && comment.moderation_status === 'approved' && !isArchived && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const reason = prompt('Reason for moderating this comment:');
                    if (reason) handleModerate(comment.id, 'rejected', reason);
                  }}
                  className="h-6 w-6 md:h-7 md:w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Moderate (strike through)"
                >
                  <Flag className="w-3 h-3 md:w-4 md:h-4" />
                </Button>
              )}
              {canModerate && comment.moderation_status === 'rejected' && !isArchived && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleModerate(comment.id, 'approved')}
                  className="h-6 w-6 md:h-7 md:w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                  title="Restore comment"
                >
                  <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" />
                </Button>
              )}
              {!canModerate && !isArchived && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleFlag(comment.id)}
                  className="h-6 w-6 md:h-7 md:w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  title="Request moderation"
                >
                  <Flag className="w-3 h-3 md:w-4 md:h-4" />
                </Button>
              )}
              {(isOwnComment || canModerate) && !isArchived && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingComment(comment)}
                    className="h-6 w-6 md:h-7 md:w-7 text-slate-600 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm('Delete this comment?')) deleteComment.mutate(comment.id);
                    }}
                    className="h-6 w-6 md:h-7 md:w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {editingComment?.id === comment.id ? (
            <div className="space-y-2">
              <Textarea
                value={editingComment.content}
                onChange={(e) => setEditingComment({...editingComment, content: e.target.value})}
                className="min-h-[80px] text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => updateComment.mutate({ id: comment.id, data: { content: editingComment.content } })}
                  className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingComment(null)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className={`text-xs md:text-sm text-slate-700 whitespace-pre-wrap break-words ${comment.moderation_status === 'rejected' ? 'line-through text-slate-400' : ''}`}>{comment.content}</p>

              {comment.moderation_reason && (
                <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800">
                  <span className="font-semibold">Moderation note:</span> {comment.moderation_reason}
                </div>
              )}

              {currentUser && comment.moderation_status === 'approved' && !isArchived && userAge >= 12 && !isUserSuspended() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReplyingTo(comment.id);
                    setNewComment('');
                    setReplyResponsibility(false);
                  }}
                  className="mt-2 h-6 md:h-7 text-xs text-slate-600 hover:text-indigo-600 px-2"
                >
                  <Reply className="w-3 h-3 mr-1" />
                  Reply
                </Button>
              )}
            </>
          )}
        </div>

        {replyingTo === comment.id && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2 ml-6 md:ml-8 p-3 bg-white rounded-lg border border-slate-200 space-y-3"
          >
            {authorType === 'public' && (
              <Input
                placeholder="Your display name (required)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-9 text-sm"
              />
            )}
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write your reply..."
              className="min-h-[80px] text-sm"
            />
            <ResponsibilityAgreement accepted={replyResponsibility} onChange={setReplyResponsibility} compact />
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={!canReply() || addComment.isPending}
                onClick={handleSubmit}
                className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs"
              >
                Post Reply
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setReplyingTo(null);
                  setNewComment('');
                }}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}

        {replies.length > 0 && (
          <div className="mt-2">
            {replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <MessageCircle className="w-5 h-5 text-indigo-600" />
            Discussion Board
            {isArchived ? (
              <Badge className="bg-slate-200 text-slate-700 border-slate-300 text-xs gap-1">
                <Archive className="w-3 h-3" />
                Archived
              </Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-xs">
                {topLevelComments.length} {topLevelComments.length === 1 ? 'thread' : 'threads'}
              </Badge>
            )}
          </CardTitle>
          {isInfomarianOrAdmin && !isArchived && (
            <Badge className="bg-indigo-100 text-indigo-700 text-xs">
              Moderator
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 md:space-y-6">
        <DiscussionHeader poll={poll} isArchived={isArchived} />

        {isArchived && (
          <div className="flex items-start gap-3 p-4 bg-slate-100 border border-slate-200 rounded-lg">
            <Archive className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-700">Discussion Archived</p>
              <p className="text-xs text-slate-500 mt-1">
                This poll's vote has concluded. The discussion thread is preserved here for future reference and is read-only.
              </p>
            </div>
          </div>
        )}

        {isUserSuspended() && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-medium">{getSuspensionMessage()}</p>
            {currentUser?.strikes && currentUser.strikes.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-red-700">Strike {currentUser.strikes.length}: {currentUser.strikes[currentUser.strikes.length - 1].reason}</p>
              </div>
            )}
          </div>
        )}

        {currentUser && !isArchived && !replyingTo && userAge >= 12 && !isUserSuspended() && (
          <form onSubmit={handleSubmit} className="space-y-3">
            {authorType === 'public' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800 mb-2">
                  You are participating as a <span className="font-semibold">general public</span> participant.
                  Validate your account on your profile to participate as a verified member.
                </p>
                <Input
                  placeholder="Display name (shown on your comments)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
            )}
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={infomarian ? "Share insights as an Infomarian..." : "Share your thoughts on this issue..."}
              className="min-h-[100px] text-sm"
            />
            <ResponsibilityAgreement accepted={responsibilityAccepted} onChange={setResponsibilityAccepted} />
            <div className="flex items-center justify-between flex-wrap gap-2">
              {!isInfomarianOrAdmin && (
                <p className="text-xs text-slate-500 flex items-center">
                  Comments are published immediately
                </p>
              )}
              <Button
                type="submit"
                disabled={!canPost() || addComment.isPending}
                className="ml-auto bg-indigo-600 hover:bg-indigo-700 h-9 text-sm"
              >
                <Send className="w-4 h-4 mr-2" />
                {infomarian ? 'Post as Infomarian' : authorType === 'public' ? 'Post as Public' : 'Post Comment'}
              </Button>
            </div>
          </form>
        )}

        {!currentUser && !isArchived && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <Lock className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600">
              Log in to participate in the discussion. General public and members are welcome to share their views.
            </p>
          </div>
        )}

        <div className="space-y-3 md:space-y-4">
          {topLevelComments.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No comments yet. Start the discussion!</p>
            </div>
          ) : (
            <AnimatePresence>
              {topLevelComments.map((comment) => renderComment(comment))}
            </AnimatePresence>
          )}
        </div>
      </CardContent>
    </Card>
  );
}