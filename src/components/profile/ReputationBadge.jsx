import React from 'react';
import { Sprout, UserCheck, HeartHandshake, ShieldCheck, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

// A series of distinct icon badges — one per reputation level — that can be
// placed against the display of a user's name. Use variant="icon" for a compact
// icon-only badge that sits neatly next to a name anywhere in the app.
const LEVELS = {
  newcomer: { label: 'Newcomer', color: 'bg-slate-500', ring: 'ring-slate-200', icon: Sprout },
  member: { label: 'Member', color: 'bg-blue-500', ring: 'ring-blue-200', icon: UserCheck },
  contributor: { label: 'Contributor', color: 'bg-indigo-500', ring: 'ring-indigo-200', icon: HeartHandshake },
  trusted: { label: 'Trusted', color: 'bg-purple-500', ring: 'ring-purple-200', icon: ShieldCheck },
  champion: { label: 'Champion', color: 'bg-amber-500', ring: 'ring-amber-200', icon: Crown },
};

export default function ReputationBadge({ user, size = 'md', variant = 'pill' }) {
  const score = user?.reputation_score || 100;
  const level = user?.reputation_level || 'newcomer';
  const cfg = LEVELS[level] || LEVELS.newcomer;
  const LevelIcon = cfg.icon;

  const title = `Reputation: ${score} points (${cfg.label})`;

  // Compact icon-only badge — sits neatly next to a user's name anywhere
  if (variant === 'icon') {
    const dim = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
    const ic = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5';
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        title={title}
        className={`inline-flex items-center justify-center ${dim} ${cfg.color} text-white rounded-full font-semibold shadow-sm ring-2 ${cfg.ring} shrink-0`}
      >
        <LevelIcon className={ic} />
      </motion.span>
    );
  }

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
      className={`inline-flex items-center ${sizeClasses[size]} ${cfg.color} text-white rounded-full font-semibold shadow-sm ring-2 ${cfg.ring}`}
      title={title}
    >
      <LevelIcon className={iconSize} />
      <span>{score}</span>
      <span className="opacity-90 hidden sm:inline">· {cfg.label}</span>
    </motion.div>
  );
}