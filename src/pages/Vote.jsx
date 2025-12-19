import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TransactionForm from '@/components/vote/TransactionForm';

export default function Vote() {
  const urlParams = new URLSearchParams(window.location.search);
  const pollId = urlParams.get('pollId');
  const queryClient = useQueryClient();
  
  const [submitted, setSubmitted] = useState(false);
  
  const { data: user } = useQuery({
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
  const canVote = age !== null && age >= 18;
  
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
  
  if (isLoading) {
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
                  <CardTitle className="text-2xl font-bold">{poll?.title}</CardTitle>
                  {poll?.description && (
                    <p className="text-indigo-100 mt-2">{poll.description}</p>
                  )}
                </CardHeader>
                
                <CardContent className="p-8">
                  <div className="space-y-4 mb-8">
                    <h3 className="font-semibold text-lg">Available Options</h3>
                    <div className="grid gap-3">
                      {poll?.options?.map((option) => (
                        <div
                          key={option.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200"
                        >
                          <span className="font-medium text-slate-900">{option.label}</span>
                          <span className="text-sm text-slate-500 font-mono">ID: {option.id}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!user?.date_of_birth ? (
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        Please complete your profile with your date of birth before voting.{' '}
                        <Link to={createPageUrl('Profile')} className="underline font-semibold">
                          Go to Profile
                        </Link>
                      </AlertDescription>
                    </Alert>
                  ) : age < 12 ? (
                    <Alert className="bg-red-50 border-red-200">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        You must be at least 12 years old to participate in this platform.
                      </AlertDescription>
                    </Alert>
                  ) : age < 18 ? (
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        Junior Member (Age {age}) - You can view polls and participate in discussions, but cannot cast official votes until you turn 18.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <TransactionForm
                      pollId={pollId}
                      pollOptions={poll?.options || []}
                      onSubmit={handleSubmit}
                    />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}