import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, CheckCircle2, AlertCircle, History, Clock, Vote as VoteIcon, User } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import TransactionForm from '@/components/vote/TransactionForm';
import PollDiscussion from '@/components/polls/PollDiscussion';
import LiveResults from '@/components/polls/LiveResults';

export default function Vote() {
  const urlParams = new URLSearchParams(window.location.search);
  const pollId = urlParams.get('pollId');
  const queryClient = useQueryClient();
  
  const [submitted, setSubmitted] = useState(false);
  
  const { data: user, isLoading: loadingUser, error: userError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: poll, isLoading } = useQuery({
    queryKey: ['poll', pollId],
    queryFn: async () => {
      const polls = await base44.entities.Poll.filter({ id: pollId });
      return polls[0];
    },
    enabled: !!pollId
  });

  const { data: franchise } = useQuery({
    queryKey: ['franchise', poll?.franchise_id],
    queryFn: async () => {
      if (!poll?.franchise_id) return null;
      const franchises = await base44.entities.Franchise.filter({ id: poll.franchise_id });
      return franchises[0];
    },
    enabled: !!poll?.franchise_id
  });

  const [selectedChoice, setSelectedChoice] = useState(null);

  // Fetch user's previous votes on this poll
  const { data: userVotes = [] } = useQuery({
    queryKey: ['user-poll-votes', pollId, user?.id],
    queryFn: async () => {
      if (!pollId || !user?.id) return [];
      const votes = await base44.entities.Vote.filter({ poll_id: pollId });
      return votes.filter(v => v.voter_id === user.voter_id || v.created_by === user.email)
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!pollId && !!user?.id
  });

  const lastVote = userVotes.length > 0 ? userVotes[0] : null;

  const calculateAge = (dob) => {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(user?.date_of_birth);
  const isSuperAdmin = user?.email === 'ac@acproductiondesign.com';
  const canVote = isSuperAdmin || (age !== null && age >= 18);
  
  // Check if poll is closed (past end_date)
  const isPollClosed = poll?.end_date && new Date(poll.end_date) < new Date();
  
  const submitVote = useMutation({
    mutationFn: async (voteData) => {
      return await base44.entities.Vote.create(voteData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['votes']);
      setSubmitted(true);
    }
  });
  
  const handleSubmit = (voteData) => {
    submitVote.mutate(voteData);
  };
  
  if (!pollId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center border-0 shadow-xl">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <VoteIcon className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No Poll Selected</h2>
            <p className="text-slate-500 mb-6">Please select a poll from the homepage to vote</p>
            <Link to={createPageUrl('Home')}>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Polls
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (userError || (!loadingUser && !user)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center border-0 shadow-xl">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Login Required</h2>
            <p className="text-slate-500 mb-6">Please log in or sign up to vote on this poll</p>
            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => base44.auth.redirectToLogin(window.location.href)}
                className="bg-indigo-600 hover:bg-indigo-700 w-full"
              >
                Log In
              </Button>
              <Button 
                onClick={() => base44.auth.redirectToLogin(window.location.href)}
                variant="outline"
                className="w-full"
              >
                Sign Up
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (isLoading || loadingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <Skeleton className="h-8 w-3/4 mb-4" />
            <Skeleton className="h-4 w-full mb-8" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Link to={createPageUrl('Home')}>
          <Button variant="ghost" className="mb-6 text-slate-600 hover:text-slate-900 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Polls
          </Button>
        </Link>
        
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-8 shadow-xl text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </motion.div>
              
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Vote Submitted!</h2>
              <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                Your vote has been received and is pending verification. 
                Once verified, it will be counted in the results.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to={createPageUrl('Home')}>
                  <Button variant="outline" className="w-full sm:w-auto">
                    Back to Polls
                  </Button>
                </Link>
                <Link to={createPageUrl('Results')}>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto">
                    View Results
                  </Button>
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-8">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl font-bold">{poll?.title}</CardTitle>
                      {poll?.description && (
                        <p className="text-indigo-100 mt-2">{poll.description}</p>
                      )}
                    </div>
                    {isPollClosed && (
                      <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                        <p className="text-white font-semibold text-sm">Poll Closed</p>
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="p-8">
                  {/* Show last vote if user has voted before */}
                  {lastVote && !isPollClosed && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6"
                    >
                      <Alert className="bg-gradient-to-br from-blue-50 to-indigo-50 border-indigo-200">
                        <History className="h-4 w-4 text-indigo-600" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <p className="text-indigo-900 font-semibold">Your Last Vote</p>
                            <div className="flex items-center gap-2">
                              <span className="text-indigo-700">
                                <span className="font-bold">{lastVote.option_label}</span>
                              </span>
                              <span className="text-xs text-indigo-600 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(lastVote.created_date), 'MMM d, h:mm a')}
                              </span>
                            </div>
                            <p className="text-xs text-indigo-600 mt-1">
                              You can change your vote anytime before the poll closes.
                            </p>
                          </div>
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  )}

                  <div className="space-y-4 mb-8">
                    <h3 className="font-semibold text-lg">Available Options</h3>
                    <div className="grid gap-3">
                      {poll?.options?.map((option) => (
                        <div
                          key={option.id}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                            lastVote?.poll_item_id === option.id
                              ? 'bg-indigo-50 border-indigo-300'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{option.label}</span>
                            {lastVote?.poll_item_id === option.id && (
                              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                            )}
                          </div>
                          <span className="text-sm text-slate-500 font-mono">ID: {option.id}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {isPollClosed ? (
                    <Alert className="bg-slate-50 border-slate-200">
                      <AlertCircle className="h-4 w-4 text-slate-600" />
                      <AlertDescription className="text-slate-800">
                        <span className="font-semibold">This poll has closed.</span> Voting and discussions are no longer available. View the final results below.
                      </AlertDescription>
                    </Alert>
                  ) : !isSuperAdmin && !user?.date_of_birth ? (
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        Please complete your profile with your date of birth before voting.{' '}
                        <Link to={createPageUrl('Profile')} className="underline font-semibold">
                          Go to Profile
                        </Link>
                      </AlertDescription>
                    </Alert>
                  ) : !isSuperAdmin && age < 12 ? (
                    <Alert className="bg-red-50 border-red-200">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        You must be at least 12 years old to participate in this platform.
                      </AlertDescription>
                    </Alert>
                  ) : !isSuperAdmin && age < 18 ? (
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        Junior Member (Age {age}) - You can view live results and participate in discussions, but cannot cast official votes until you turn 18.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        <Button
                          onClick={() => setSelectedChoice('yes')}
                          className={`h-20 text-lg font-semibold ${
                            selectedChoice === 'yes'
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          Yes
                        </Button>
                        <Button
                          onClick={() => setSelectedChoice('no')}
                          className={`h-20 text-lg font-semibold ${
                            selectedChoice === 'no'
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          No
                        </Button>
                        <Button
                          onClick={() => setSelectedChoice('undecided')}
                          className={`h-20 text-lg font-semibold ${
                            selectedChoice === 'undecided'
                              ? 'bg-amber-600 hover:bg-amber-700'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          I Don't Know
                        </Button>
                      </div>

                      {selectedChoice && franchise && (
                        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-indigo-200">
                          <CardContent className="p-6">
                            <h3 className="font-semibold text-indigo-900 mb-4">Transaction Summary</h3>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-indigo-700">My Choice:</span>
                                <span className="font-semibold text-indigo-900 capitalize">{selectedChoice === 'undecided' ? "I Don't Know" : selectedChoice}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-indigo-700">Amount:</span>
                                <span className="font-semibold text-indigo-900">$0.55 AUD</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-indigo-700">Franchise ID:</span>
                                <span className="font-semibold text-indigo-900">{franchise.id}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-indigo-700">Destination Account:</span>
                                <span className="font-semibold text-indigo-900 font-mono">
                                  {selectedChoice === 'yes' && `${franchise.yes_account_bsb || 'N/A'} - ${franchise.yes_account_number || 'N/A'}`}
                                  {selectedChoice === 'no' && `${franchise.no_account_bsb || 'N/A'} - ${franchise.no_account_number || 'N/A'}`}
                                  {selectedChoice === 'undecided' && `${franchise.undecided_account_bsb || 'N/A'} - ${franchise.undecided_account_number || 'N/A'}`}
                                </span>
                              </div>
                            </div>
                            <Button
                              onClick={() => {
                                const voteData = {
                                  poll_id: pollId,
                                  poll_item_id: selectedChoice,
                                  option_label: selectedChoice === 'undecided' ? "I Don't Know" : selectedChoice.charAt(0).toUpperCase() + selectedChoice.slice(1),
                                  voter_name: user.full_name,
                                  infomarian_id: user.infomarian_id,
                                  delegation_status: 'direct',
                                  delegated_votes_count: 1,
                                  transaction_reference: `AUTO-${Date.now()}`,
                                  transaction_amount: 0.55,
                                  transaction_date: new Date().toISOString(),
                                  transaction_description: `Vote: ${selectedChoice} - Poll: ${pollId}`,
                                  bank_name: 'Franchise Banking',
                                  voter_id: user.voter_id || `V${Date.now()}`,
                                  franchise_id: franchise.id,
                                  destination_bsb: selectedChoice === 'yes' ? franchise.yes_account_bsb : selectedChoice === 'no' ? franchise.no_account_bsb : franchise.undecided_account_bsb,
                                  destination_account: selectedChoice === 'yes' ? franchise.yes_account_number : selectedChoice === 'no' ? franchise.no_account_number : franchise.undecided_account_number,
                                  payment_breakdown: {
                                    infomarian: 0.30,
                                    pollee_incorporated: 0.10,
                                    local_franchise: 0.10,
                                    gst: 0.05
                                  },
                                  status: 'pending',
                                  is_vote_change: hasVotedBefore
                                };
                                handleSubmit(voteData);
                              }}
                              className="w-full mt-4 h-12 bg-indigo-600 hover:bg-indigo-700"
                            >
                              <CheckCircle2 className="w-5 h-5 mr-2" />
                              Submit Vote
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Live/Final Results - visible to everyone 12+ or closed polls or superadmin */}
              {(isSuperAdmin || age >= 12 || isPollClosed) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-6"
                >
                  <LiveResults pollId={pollId} poll={poll} isPollClosed={isPollClosed} />
                </motion.div>
              )}

              {/* Discussion - available to everyone 12+ only when poll is open or superadmin */}
              {(isSuperAdmin || age >= 12) && !isPollClosed && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6"
                >
                  <PollDiscussion pollId={pollId} currentUser={user} userAge={age} />
                </motion.div>
              )}

              {/* Closed Discussion - viewable but not editable or superadmin */}
              {(isSuperAdmin || age >= 12) && isPollClosed && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6"
                >
                  <PollDiscussion pollId={pollId} currentUser={user} userAge={age} isClosed={true} />
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Important Documents Section */}
        <div className="mt-12 mb-8">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-lg p-8 border border-indigo-100">
            <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">
              Important Documents & Guidelines
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <a
                href="https://pollee.net/code-of-conduct"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-200 hover:border-indigo-300"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-slate-900 text-center">Code of Conduct</h3>
                <p className="text-sm text-slate-600 text-center mt-2">Community standards and behavior guidelines</p>
              </a>
              
              <a
                href="https://pollee.net/model-rules"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-200 hover:border-indigo-300"
              >
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                  <AlertCircle className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-slate-900 text-center">Model Rules</h3>
                <p className="text-sm text-slate-600 text-center mt-2">Platform governance and operational rules</p>
              </a>
              
              <a
                href="https://pollee.net/code-of-practice"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-200 hover:border-indigo-300"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                  <ArrowLeft className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900 text-center">Code of Practice</h3>
                <p className="text-sm text-slate-600 text-center mt-2">Best practices for voting and participation</p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}