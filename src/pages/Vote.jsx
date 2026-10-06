import React, { useState, useEffect } from 'react';
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
import BudgetSummary from '@/components/polls/BudgetSummary';
import { useTranslation } from 'react-i18next';
import { usePollTranslation } from '@/hooks/usePollTranslation';
import { awardReputation } from '@/lib/reputation';

export default function Vote() {
  const { t } = useTranslation();
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

  const { title: translatedTitle, description: translatedDescription, options: translatedOptions } = usePollTranslation(poll);

  const { data: franchise } = useQuery({
    queryKey: ['franchise', poll?.franchise_id],
    queryFn: async () => {
      if (!poll?.franchise_id) return null;
      const franchises = await base44.entities.Franchise.filter({ id: poll.franchise_id });
      return franchises[0];
    },
    enabled: !!poll?.franchise_id
  });

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

  // Center the discussion module in the viewport when arriving via #discussion hash
  useEffect(() => {
    if (isLoading || loadingUser) return;
    if (window.location.hash !== '#discussion') return;

    const el = document.getElementById('discussion');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isLoading, loadingUser, poll, user]);

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
      const res = await base44.functions.invoke('cast-vote', voteData);
      return res.data?.vote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['votes']);
      queryClient.invalidateQueries(['currentUser']);
      setSubmitted(true);
      // Award +5 reputation to the voter (verification is switched off — every vote counts)
      if (user?.email) {
        awardReputation(user.email, 5, 'verified_votes').catch(() => {});
      }
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
            <h2 className="text-xl font-semibold text-slate-900 mb-2">{t('vote.noPollSelected')}</h2>
            <p className="text-slate-500 mb-6">{t('vote.noPollSelectedDesc')}</p>
            <Link to={createPageUrl('Home')}>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('vote.backToPolls')}
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
            <h2 className="text-xl font-semibold text-slate-900 mb-2">{t('vote.loginRequired')}</h2>
            <p className="text-slate-500 mb-6">{t('vote.loginRequiredDesc')}</p>
            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => base44.auth.redirectToLogin(window.location.href)}
                className="bg-indigo-600 hover:bg-indigo-700 w-full"
              >
                {t('vote.logIn')}
                </Button>
                <Button 
                 onClick={() => base44.auth.redirectToLogin(window.location.href)}
                 variant="outline"
                 className="w-full"
                >
                {t('vote.signUp')}
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
            {t('vote.backToPolls')}
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
              
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('vote.voteSubmitted')}</h2>
              <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                {t('vote.voteSubmittedDesc')}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to={createPageUrl('Home')}>
                  <Button variant="outline" className="w-full sm:w-auto">
                    {t('vote.backToPolls')}
                  </Button>
                </Link>
                <Link to={createPageUrl('Results')}>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto">
                    {t('vote.viewResults')}
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
                      <CardTitle className="text-2xl font-bold">{translatedTitle}</CardTitle>
                      {poll?.description && (
                        <p className="text-indigo-100 mt-2">{translatedDescription}</p>
                      )}
                    </div>
                    {isPollClosed && (
                      <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                        <p className="text-white font-semibold text-sm">{t('vote.pollClosed')}</p>
                      </div>
                    )}
                  </div>
                </CardHeader>
              </Card>

              {/* Discussion - available to everyone 12+ only when poll is open or superadmin */}
              {(isSuperAdmin || age >= 12) && !isPollClosed && (
                <motion.div
                  id="discussion"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mt-6"
                >
                  <PollDiscussion pollId={pollId} currentUser={user} userAge={age} poll={poll} />
                </motion.div>
              )}

              {/* Closed Discussion - viewable but not editable or superadmin */}
              {(isSuperAdmin || age >= 12) && isPollClosed && (
                <motion.div
                  id="discussion"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mt-6"
                >
                  <PollDiscussion pollId={pollId} currentUser={user} userAge={age} isClosed={true} poll={poll} />
                </motion.div>
              )}

              {/* Budget */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-6"
              >
                <BudgetSummary poll={poll} />
              </motion.div>

              {/* Active vote + confirmation to terms */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6"
              >
                <Card className="border-0 shadow-xl">
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
                              <p className="text-indigo-900 font-semibold">{t('vote.yourLastVote')}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-indigo-700">
                                  <span className="font-bold">{translatedOptions.find(o => o.id === lastVote.poll_item_id)?.label || lastVote.option_label}</span>
                                </span>
                                <span className="text-xs text-indigo-600 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(lastVote.created_date), 'MMM d, h:mm a')}
                                </span>
                              </div>
                              <p className="text-xs text-indigo-600 mt-1">
                                {t('vote.canChangeVote')}
                              </p>
                            </div>
                          </AlertDescription>
                        </Alert>
                      </motion.div>
                    )}

                    {isPollClosed ? (
                      <Alert className="bg-slate-50 border-slate-200">
                        <AlertCircle className="h-4 w-4 text-slate-600" />
                        <AlertDescription className="text-slate-800">
                          <span className="font-semibold">{t('vote.pollClosedAlert')}</span>
                        </AlertDescription>
                      </Alert>
                    ) : !isSuperAdmin && !user?.date_of_birth ? (
                      <Alert className="bg-amber-50 border-amber-200">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                          {t('vote.completeProfile')}{' '}
                          <Link to={createPageUrl('Profile')} className="underline font-semibold">
                            {t('vote.goToProfile')}
                          </Link>
                        </AlertDescription>
                      </Alert>
                    ) : !isSuperAdmin && age < 12 ? (
                      <Alert className="bg-red-50 border-red-200">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          {t('vote.tooYoung')}
                        </AlertDescription>
                      </Alert>
                    ) : !isSuperAdmin && age < 18 ? (
                      <Alert className="bg-blue-50 border-blue-200">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800">
                          {t('vote.juniorMember', { age })}
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <TransactionForm
                        pollId={pollId}
                        pollOptions={poll?.options || []}
                        onSubmit={handleSubmit}
                        currentUser={user}
                        poll={poll}
                        franchise={franchise}
                      />
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Live/Final Results - visible to everyone 12+ or closed polls or superadmin */}
              {(isSuperAdmin || age >= 12 || isPollClosed) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="mt-6"
                >
                  <LiveResults pollId={pollId} poll={poll} isPollClosed={isPollClosed} />
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Important Documents Section */}
        <div className="mt-12 mb-8">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-lg p-8 border border-indigo-100">
            <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">
              {t('vote.docsTitle')}
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
                <h3 className="font-semibold text-slate-900 text-center">{t('vote.codeOfConduct')}</h3>
                <p className="text-sm text-slate-600 text-center mt-2">{t('vote.codeOfConductDesc')}</p>
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
                <h3 className="font-semibold text-slate-900 text-center">{t('vote.modelRules')}</h3>
                <p className="text-sm text-slate-600 text-center mt-2">{t('vote.modelRulesDesc')}</p>
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
                <h3 className="font-semibold text-slate-900 text-center">{t('vote.codeOfPractice')}</h3>
                <p className="text-sm text-slate-600 text-center mt-2">{t('vote.codeOfPracticeDesc')}</p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}