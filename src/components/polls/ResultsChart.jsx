import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from "@/components/ui/badge";
import { Trophy, AlertCircle } from 'lucide-react';

export default function ResultsChart({ poll, votes }) {
  const verifiedVotes = votes.filter(v => v.status === 'verified');
  
  // Count votes including delegated votes
  const optionCounts = poll.options?.reduce((acc, option) => {
    const optionVotes = verifiedVotes.filter(v => v.poll_item_id === option.id);
    acc[option.id] = optionVotes.reduce((sum, vote) => sum + (vote.delegated_votes_count || 1), 0);
    return acc;
  }, {}) || {};
  
  const totalVotes = Object.values(optionCounts).reduce((a, b) => a + b, 0);
  
  // Determine winner: simple majority (50% + 1) and minimum 4 voters
  const hasQuorum = totalVotes > 3;
  const majorityThreshold = Math.floor(totalVotes / 2) + 1;
  const maxVotes = Math.max(...Object.values(optionCounts), 0);
  const hasWinner = hasQuorum && maxVotes >= majorityThreshold;
  const winningOptions = hasWinner 
    ? poll.options?.filter(option => optionCounts[option.id] === maxVotes) 
    : [];
  
  const colors = [
    'from-indigo-500 to-violet-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-500',
    'from-cyan-500 to-blue-500',
  ];
  
  return (
    <div className="space-y-4">
      {!hasQuorum && totalVotes > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <span className="font-semibold">Quorum not met.</span> Need more than 3 valid voters. Currently: {totalVotes}
          </div>
        </div>
      )}
      
      {hasWinner && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
          <Trophy className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-emerald-800">
            <span className="font-semibold">Winner: {winningOptions.map(o => o.label).join(', ')}</span> with {maxVotes} votes ({((maxVotes / totalVotes) * 100).toFixed(1)}% - Simple majority achieved)
          </div>
        </div>
      )}
      
      {hasQuorum && !hasWinner && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <span className="font-semibold">No majority yet.</span> Need {majorityThreshold} votes for simple majority (50% + 1).
          </div>
        </div>
      )}
      
      {poll.options?.map((option, index) => {
        const count = optionCounts[option.id] || 0;
        const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
        const isWinner = hasWinner && winningOptions.some(w => w.id === option.id);
        
        return (
          <div key={option.id} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-700">{option.label}</span>
                {isWinner && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 h-5">
                    <Trophy className="w-3 h-3 mr-1" />
                    Winner
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">{count} votes</span>
                <span className="font-semibold text-slate-900">{percentage.toFixed(1)}%</span>
              </div>
            </div>
            
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.1 }}
                className={`h-full bg-gradient-to-r ${colors[index % colors.length]} rounded-full`}
              />
            </div>
          </div>
        );
      })}
      
      <div className="pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-500">
            Total verified votes: <span className="font-semibold text-slate-700">{totalVotes}</span>
          </p>
          <p className="text-slate-500">
            Required for majority: <span className="font-semibold text-slate-700">{majorityThreshold}</span>
          </p>
        </div>
      </div>
    </div>
  );
}