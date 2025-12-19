import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function PollDiscussion({ pollId, currentUser, userAge }) {
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', pollId],
    queryFn: () => base44.entities.Comment.filter({ poll_id: pollId }, '-created_date'),
    enabled: !!pollId
  });

  const addComment = useMutation({
    mutationFn: (data) => base44.entities.Comment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['comments', pollId]);
      setNewComment('');
    }
  });

  const handleSubmit = () => {
    if (!newComment.trim() || !currentUser) return;

    addComment.mutate({
      poll_id: pollId,
      user_name: currentUser.full_name || currentUser.email,
      user_email: currentUser.email,
      content: newComment.trim(),
      is_junior_member: userAge >= 12 && userAge < 18
    });
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-indigo-600" />
          Discussion ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment Input */}
        {currentUser?.date_of_birth && userAge >= 12 && (
          <div className="space-y-3">
            <Textarea
              placeholder="Share your thoughts on this poll..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="rounded-xl min-h-[100px]"
            />
            <div className="flex items-center justify-between">
              {userAge < 18 && (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                  Junior Member
                </Badge>
              )}
              <Button
                onClick={handleSubmit}
                disabled={!newComment.trim() || addComment.isPending}
                className="ml-auto bg-indigo-600 hover:bg-indigo-700"
              >
                {addComment.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Post Comment
              </Button>
            </div>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-3">
          <AnimatePresence>
            {comments.map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-slate-50 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {comment.user_name}
                    </span>
                    {comment.is_junior_member && (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                        Junior
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {format(new Date(comment.created_date), 'MMM d, h:mm a')}
                  </span>
                </div>
                <p className="text-slate-700 text-sm leading-relaxed">
                  {comment.content}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>

          {comments.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No comments yet. Start the discussion!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}