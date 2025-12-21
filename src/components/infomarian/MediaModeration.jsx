import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function MediaModeration({ infomarian }) {
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['mediaComments'],
    queryFn: () => base44.entities.Comment.list('-created_date'),
    refetchInterval: 10000
  });

  const { data: polls = [] } = useQuery({
    queryKey: ['polls'],
    queryFn: () => base44.entities.Poll.list()
  });

  const updateComment = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Comment.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['mediaComments'])
  });

  const handleApproveMedia = (comment) => {
    updateComment.mutate({
      id: comment.id,
      data: {
        moderation_status: 'approved',
        moderated_by: infomarian.infomarian_id
      }
    });
  };

  const handleRejectMedia = (comment) => {
    updateComment.mutate({
      id: comment.id,
      data: {
        moderation_status: 'rejected',
        moderated_by: infomarian.infomarian_id,
        moderation_reason: 'Media content rejected',
        media_urls: [] // Remove media
      }
    });
  };

  const getPollTitle = (pollId) => {
    const poll = polls.find(p => p.id === pollId);
    return poll?.title || 'Unknown Poll';
  };

  const pendingMediaComments = comments.filter(c => 
    c.media_urls && c.media_urls.length > 0 && c.moderation_status === 'pending'
  );

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (pendingMediaComments.length === 0) {
    return (
      <Card className="border-0 shadow-xl text-center">
        <CardContent className="pt-12 pb-12">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">All Caught Up!</h3>
          <p className="text-slate-500">No media content requiring moderation.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {pendingMediaComments.map((comment, index) => (
        <motion.div
          key={comment.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm">Media in: {getPollTitle(comment.poll_id)}</CardTitle>
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 border text-xs">
                    Pending
                  </Badge>
                </div>
                <div className="text-xs text-slate-500">
                  By {comment.user_name || comment.user_email} • {format(new Date(comment.created_date), 'MMM d, h:mm a')}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-700 line-clamp-3">{comment.content}</p>
              </div>

              <div className="space-y-2">
                {comment.media_urls?.map((url, idx) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden bg-slate-100">
                    {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img 
                        src={url} 
                        alt={`Media ${idx + 1}`} 
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-slate-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <Button
                  onClick={() => handleApproveMedia(comment)}
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={updateComment.isPending}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleRejectMedia(comment)}
                  size="sm"
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  disabled={updateComment.isPending}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}