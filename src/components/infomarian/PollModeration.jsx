import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Clock, AlertCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function PollModeration({ infomarian }) {
  const queryClient = useQueryClient();
  const [rejectionReasons, setRejectionReasons] = useState({});

  const { data: polls = [], isLoading } = useQuery({
    queryKey: ['polls-moderation'],
    queryFn: () => base44.entities.Poll.list('-created_date')
  });

  const { data: franchises = [] } = useQuery({
    queryKey: ['franchises'],
    queryFn: () => base44.entities.Franchise.list()
  });

  const updatePoll = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Poll.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['polls-moderation']);
      queryClient.invalidateQueries(['polls']);
    }
  });

  const pendingPolls = polls.filter(p => p.moderation_status === 'pending');
  const recentlyModerated = polls.filter(p => 
    p.moderation_status !== 'pending' && p.moderation_date
  ).slice(0, 10);

  const handleApprove = (pollId) => {
    updatePoll.mutate({
      id: pollId,
      data: {
        moderation_status: 'approved',
        moderated_by: infomarian.user_email,
        moderation_date: new Date().toISOString()
      }
    });
  };

  const handleReject = (pollId) => {
    const reason = rejectionReasons[pollId];
    if (!reason?.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    updatePoll.mutate({
      id: pollId,
      data: {
        moderation_status: 'rejected',
        moderated_by: infomarian.user_email,
        moderation_reason: reason,
        moderation_date: new Date().toISOString()
      }
    });

    setRejectionReasons({ ...rejectionReasons, [pollId]: '' });
  };

  const getFranchiseName = (franchiseId) => {
    const franchise = franchises.find(f => f.id === franchiseId);
    return franchise ? `${franchise.franchise_name} (${franchise.postcode})` : 'Unknown';
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
      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 mb-1">Pending Review</p>
                <p className="text-3xl font-bold text-amber-700">{pendingPolls.length}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 mb-1">Approved</p>
                <p className="text-3xl font-bold text-emerald-700">
                  {polls.filter(p => p.moderation_status === 'approved').length}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 mb-1">Rejected</p>
                <p className="text-3xl font-bold text-red-700">
                  {polls.filter(p => p.moderation_status === 'rejected').length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Polls */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <CardTitle>Polls Awaiting Moderation</CardTitle>
          </div>
          <p className="text-sm text-slate-500 mt-2">
            Review new poll submissions and approve or reject them
          </p>
        </CardHeader>
        <CardContent>
          {pendingPolls.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">All caught up!</p>
              <p className="text-sm text-slate-500">No polls awaiting moderation</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingPolls.map((poll, index) => (
                <motion.div
                  key={poll.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-2 border-amber-200 bg-amber-50/30">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-slate-600" />
                            <h3 className="text-lg font-semibold text-slate-900">{poll.title}</h3>
                          </div>
                          <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending Review
                          </Badge>
                        </div>
                        <div className="text-right text-sm text-slate-500">
                          <p>Created</p>
                          <p>{format(new Date(poll.created_date), 'MMM d, h:mm a')}</p>
                        </div>
                      </div>

                      {poll.description && (
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          <p className="text-sm text-slate-700">{poll.description}</p>
                        </div>
                      )}

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Franchise</p>
                          <p className="text-sm font-medium text-slate-900">{getFranchiseName(poll.franchise_id)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Poll Level</p>
                          <Badge variant="outline" className="capitalize">{poll.poll_level}</Badge>
                        </div>
                      </div>

                      {poll.postcodes && poll.postcodes.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Eligible Postcodes</p>
                          <p className="text-sm text-slate-700">{poll.postcodes.join(', ')}</p>
                        </div>
                      )}

                      {poll.state && (
                        <div>
                          <p className="text-xs text-slate-500 mb-1">State</p>
                          <p className="text-sm text-slate-700">{poll.state}</p>
                        </div>
                      )}

                      <div>
                        <p className="text-xs text-slate-500 mb-2">Voting Options</p>
                        <div className="flex flex-wrap gap-2">
                          {poll.options.map((option, idx) => (
                            <Badge key={idx} variant="outline" className="bg-white">
                              {option.label}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-slate-200">
                        <div className="space-y-2">
                          <Label htmlFor={`reason-${poll.id}`}>Rejection Reason (if rejecting)</Label>
                          <Textarea
                            id={`reason-${poll.id}`}
                            placeholder="Explain why this poll should be rejected..."
                            value={rejectionReasons[poll.id] || ''}
                            onChange={(e) => setRejectionReasons({
                              ...rejectionReasons,
                              [poll.id]: e.target.value
                            })}
                            className="min-h-[80px]"
                          />
                        </div>

                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleApprove(poll.id)}
                            disabled={updatePoll.isPending}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Approve Poll
                          </Button>
                          <Button
                            onClick={() => handleReject(poll.id)}
                            disabled={updatePoll.isPending}
                            variant="outline"
                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject Poll
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recently Moderated */}
      {recentlyModerated.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Recently Moderated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentlyModerated.map((poll) => (
                <div key={poll.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{poll.title}</p>
                    <p className="text-sm text-slate-500">
                      {format(new Date(poll.moderation_date), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <Badge className={`${
                    poll.moderation_status === 'approved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {poll.moderation_status === 'approved' ? (
                      <><CheckCircle2 className="w-3 h-3 mr-1" />Approved</>
                    ) : (
                      <><XCircle className="w-3 h-3 mr-1" />Rejected</>
                    )}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}