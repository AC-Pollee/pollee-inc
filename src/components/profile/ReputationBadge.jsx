import React from 'react';
import { Award, Users, MessageSquare, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ReputationBadge({ user, size = 'md' }) {
  const score = user?.reputation_score || 100;
  const level = user?.reputation_level || 'newcomer';

  const levelConfig = {
    newcomer: { label: 'Newcomer', color: 'bg-slate-500', textColor: 'text-slate-600', ring: 'ring-slate-200', icon: Users },
    member: { label: 'Member', color: 'bg-blue-500', textColor: 'text-blue-600', ring: 'ring-blue-200', icon: MessageSquare },
    contributor: { label: 'Contributor', color: 'bg-indigo-500', textColor: 'text-indigo-600', ring: 'ring-indigo-200', icon: TrendingUp },
    trusted: { label: 'Trusted', color: 'bg-purple-500', textColor: 'text-purple-600', ring: 'ring-purple-200', icon: Award },
    champion: { label: 'Champion', color: 'bg-amber-500', textColor: 'text-amber-600', ring: 'ring-amber-200', icon: Award }
  };

  const currentLevel = levelConfig[level];
  const LevelIcon = currentLevel.icon;

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2'
  };

  const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center ${sizeClasses[size]} ${currentLevel.color} text-white rounded-full font-semibold shadow-sm ring-2 ${currentLevel.ring}`}
      title={`Reputation: ${score} points (${currentLevel.label})`}
    >
      <LevelIcon className={iconSize} />
      <span>{score}</span>
      <span className="opacity-90 hidden sm:inline">· {currentLevel.label}</span>
    </motion.div>
  );
}