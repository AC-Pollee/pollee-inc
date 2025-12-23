import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Vote, Plus, BarChart3, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import PollCard from '@/components/polls/PollCard';

export default function Home() {
  const { data: polls = [], isLoading: loadingPolls } = useQuery({
    queryKey: ['polls'],
    queryFn: () => base44.entities.Poll.list('-created_date')
  });
  
  const { data: votes = [] } = useQuery({
    queryKey: ['votes'],
    queryFn: () => base44.entities.Vote.list()
  });
  
  const activePolls = polls.filter(p => p.status === 'active' && (p.moderation_status === 'approved' || !p.moderation_status));
  
  const getVoteCount = (pollId) => {
    const pollVotes = votes.filter(v => v.poll_id === pollId && v.status === 'verified');
    // Sum up all delegated votes
    return pollVotes.reduce((sum, vote) => sum + (vote.delegated_votes_count || 1), 0);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-transparent to-transparent" />
        
        <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-700">Verified with Bank Transactions</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
              Secure Voting with
              <span className="block mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Transaction Proof
              </span>
            </h1>
            
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Use your bank account transactions to convey your vote securely and accountably and the cents you spent to support the people who guide the conversations we need to have and who cultivate the information you need to decide - your local Infomarian
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to={createPageUrl('Admin')}>
                <Button 
                  size="lg" 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-12 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl transition-all"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Poll
                </Button>
              </Link>
              
              <Link to={createPageUrl('Results')}>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="px-8 h-12 rounded-xl border-slate-200 hover:border-indigo-200 hover:bg-indigo-50"
                >
                  <BarChart3 className="w-5 h-5 mr-2" />
                  View Results
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Active Polls Section */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Active Polls</h2>
            <p className="text-slate-500 mt-1">Cast your vote on current polls</p>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100">
            <Vote className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">{activePolls.length} Active</span>
          </div>
        </div>
        
        {loadingPolls ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
                <Skeleton className="h-6 w-20 mb-4" />
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <Skeleton className="h-10 w-full mt-4" />
              </div>
            ))}
          </div>
        ) : activePolls.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 bg-white rounded-2xl border border-slate-100"
          >
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Vote className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Active Polls</h3>
            <p className="text-slate-500 mb-6">Create a new poll to get started</p>
            <Link to={createPageUrl('Admin')}>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Poll
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activePolls.map((poll, index) => (
              <motion.div
                key={poll.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <PollCard poll={poll} voteCount={getVoteCount(poll.id)} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Explanatory Section */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 border border-slate-100">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">
            How Pollee Democracy Works
          </h2>
          
          <div className="prose prose-slate max-w-none space-y-4 text-slate-700">
            <p className="text-base leading-relaxed">
              Pollee Democracy is based on some very simple premises:
            </p>
            
            <ol className="list-decimal list-inside space-y-3 text-base leading-relaxed ml-2">
              <li>A Poll and discussion can be about any subject that requires a decision.</li>
              <li>A Poll remains open for 720 hours (30 days) from the date of validation.</li>
              <li>A registered user can vote on a poll at any time over the polling period, a user can change their vote at any time.</li>
              <li>At the close of the Poll a decision is made by a simple majority of 50% +1 votes drawn from the total number of votes cast in the Poll.</li>
            </ol>

            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 my-6 rounded-r-lg">
              <p className="text-base leading-relaxed">
                The legal age for a vote in Australia is 18 years and above. Until the age is changed legislatively, any member between the ages of 12 - 18 years (Junior) can participate in the discussions and "vote" in a live poll of sentiment, the vote cannot be counted in the total that decides. Your opinions and information are important and it will inform the outcome until you come of age and can vote for yourself.
              </p>
            </div>

            <p className="text-lg font-semibold text-indigo-700 italic text-center mt-6">
              Voting creates change, it's the one power we are promised
            </p>
          </div>
        </div>
      </div>

      {/* Important Documents Section */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
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
                <Shield className="w-6 h-6 text-indigo-600" />
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
                <BarChart3 className="w-6 h-6 text-purple-600" />
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
                <Vote className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 text-center">Code of Practice</h3>
              <p className="text-sm text-slate-600 text-center mt-2">Best practices for voting and participation</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}