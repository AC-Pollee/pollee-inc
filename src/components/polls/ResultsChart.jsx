import React from 'react';
import { motion } from 'framer-motion';

export default function ResultsChart({ poll, votes }) {
  const verifiedVotes = votes.filter(v => v.status === 'verified');
  
  const optionCounts = poll.options?.reduce((acc, option) => {
    acc[option.id] = verifiedVotes.filter(v => v.option_id === option.id).length;
    return acc;
  }, {}) || {};
  
  const totalVotes = Object.values(optionCounts).reduce((a, b) => a + b, 0);
  
  const colors = [
    'from-indigo-500 to-violet-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-500',
    'from-cyan-500 to-blue-500',
  ];
  
  return (
    <div className="space-y-4">
      {poll.options?.map((option, index) => {
        const count = optionCounts[option.id] || 0;
        const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
        
        return (
          <div key={option.id} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">{option.label}</span>
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
        <p className="text-sm text-slate-500">
          Total verified votes: <span className="font-semibold text-slate-700">{totalVotes}</span>
        </p>
      </div>
    </div>
  );
}