import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle2, Loader2, Vote as VoteIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TransactionUploader from '@/components/upload/TransactionUploader';

export default function Vote() {
  const urlParams = new URLSearchParams(window.location.search);
  const pollId = urlParams.get('pollId');
  const queryClient = useQueryClient();
  
  const [selectedOption, setSelectedOption] = useState('');
  const [voterName, setVoterName] = useState('');
  const [transactionFile, setTransactionFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const { data: poll, isLoading } = useQuery({
    queryKey: ['poll', pollId],
    queryFn: async () => {
      const polls = await base44.entities.Poll.filter({ id: pollId });
      return polls[0];
    },
    enabled: !!pollId
  });
  
  const submitVote = useMutation({
    mutationFn: async (voteData) => {
      return await base44.entities.Vote.create(voteData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['votes']);
      setSubmitted(true);
    }
  });
  
  const handleSubmit = () => {
    if (!selectedOption || !transactionFile) return;
    
    const selectedOptionData = poll.options.find(o => o.id === selectedOption);
    
    submitVote.mutate({
      poll_id: pollId,
      option_id: selectedOption,
      option_label: selectedOptionData?.label || '',
      transaction_file_url: transactionFile,
      voter_name: voterName,
      status: 'pending'
    });
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
                
                <CardContent className="p-8 space-y-8">
                  {/* Voting Options */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-slate-900">Select Your Choice</Label>
                    <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
                      {poll?.options?.map((option, index) => (
                        <motion.div
                          key={option.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <label
                            className={`
                              flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                              ${selectedOption === option.id 
                                ? 'border-indigo-500 bg-indigo-50' 
                                : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                              }
                            `}
                          >
                            <RadioGroupItem value={option.id} className="border-2" />
                            <span className="font-medium text-slate-900">{option.label}</span>
                          </label>
                        </motion.div>
                      ))}
                    </RadioGroup>
                  </div>
                  
                  {/* Voter Name */}
                  <div className="space-y-2">
                    <Label htmlFor="voterName" className="text-base font-semibold text-slate-900">
                      Your Name <span className="text-slate-400 font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="voterName"
                      placeholder="Enter your name"
                      value={voterName}
                      onChange={(e) => setVoterName(e.target.value)}
                      className="h-12 rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  
                  {/* Transaction Upload */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-slate-900">
                      Upload Transaction Proof
                    </Label>
                    <p className="text-sm text-slate-500 -mt-1">
                      Upload a screenshot or PDF of your bank transaction to verify your vote
                    </p>
                    <TransactionUploader
                      onUpload={setTransactionFile}
                      uploading={uploading}
                      setUploading={setUploading}
                    />
                  </div>
                  
                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmit}
                    disabled={!selectedOption || !transactionFile || uploading || submitVote.isPending}
                    className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitVote.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Submitting Vote...
                      </>
                    ) : (
                      <>
                        <VoteIcon className="w-5 h-5 mr-2" />
                        Submit Vote
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}