import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, Users, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import ResultsChart from '@/components/polls/ResultsChart';

export default function Results() {
  const [expandedPoll, setExpandedPoll] = useState(null);
  
  const { data: polls = [], isLoading: loadingPolls } = useQuery({
    queryKey: ['polls'],
    queryFn: () => base44.entities.Poll.list('-created_date')
  });
  
  const { data: votes = [], isLoading: loadingVotes } = useQuery({
    queryKey: ['votes'],
    queryFn: () => base44.entities.Vote.list()
  });
  
  const getVoteStats = (pollId) => {
    const pollVotes = votes.filter(v => v.poll_id === pollId);
    return {
      total: pollVotes.length,
      verified: pollVotes.filter(v => v.status === 'verified').length,
      pending: pollVotes.filter(v => v.status === 'pending').length
    };
  };
  
  const getPollVotes = (pollId) => {
    return votes.filter(v => v.poll_id === pollId);
  };
  
  const isLoading = loadingPolls || loadingVotes;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Link to={createPageUrl('Home')}>
          <Button variant="ghost" className="mb-6 text-slate-600 hover:text-slate-900 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Polls
          </Button>
        </Link>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Poll Results</h1>
          <p className="text-slate-500">View live voting results and statistics</p>
        </div>
        
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
                <Skeleton className="h-6 w-3/4 mb-4" />
                <Skeleton className="h-4 w-1/2 mb-6" />
                <div className="space-y-4">
                  {[1, 2, 3].map(j => (
                    <Skeleton key={j} className="h-8 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : polls.length === 0 ? (
          <Card className="border-0 shadow-xl text-center">
            <CardContent className="pt-12 pb-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Polls Yet</h3>
              <p className="text-slate-500 mb-6">Create a poll to start collecting votes</p>
              <Link to={createPageUrl('Admin')}>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  Create Poll
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {polls.map((poll, index) => {
              const stats = getVoteStats(poll.id);
              const isExpanded = expandedPoll === poll.id;
              
              return (
                <motion.div
                  key={poll.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-0 shadow-lg overflow-hidden">
                    <CardHeader 
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setExpandedPoll(isExpanded ? null : poll.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-xl">{poll.title}</CardTitle>
                            <Badge 
                              className={`${
                                poll.status === 'active' 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              } border`}
                            >
                              {poll.status === 'active' ? 'Active' : 'Closed'}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {stats.verified} verified votes
                            </span>
                            {poll.end_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Ends {format(new Date(poll.end_date), 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <Button variant="ghost" size="icon" className="shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <CardContent className="border-t border-slate-100">
                            <div className="grid md:grid-cols-3 gap-4 mb-6 pt-4">
                              <div className="bg-indigo-50 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-indigo-600">{stats.total}</p>
                                <p className="text-sm text-slate-500">Total Votes</p>
                              </div>
                              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-emerald-600">{stats.verified}</p>
                                <p className="text-sm text-slate-500">Verified</p>
                              </div>
                              <div className="bg-amber-50 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                                <p className="text-sm text-slate-500">Pending</p>
                              </div>
                            </div>
                            
                            <ResultsChart poll={poll} votes={getPollVotes(poll.id)} />
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}