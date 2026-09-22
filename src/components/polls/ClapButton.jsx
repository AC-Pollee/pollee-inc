import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

/**
 * Clap button for a comment.
 * - Shows a clap icon + total clap count.
 * - Illuminates when the current user has clapped.
 * - On clap: records the clap and awards the poster +3 reputation points.
 * - Disabled for guests, archived context, or the comment's own author.
 */
export default function ClapButton({ comment, currentUser, claps = [], disabled = false }) {
  const queryClient = useQueryClient();

  const count = claps.length;
  const hasClapped = !!currentUser && claps.some(c => c.clapper_email === currentUser.email);
  const isOwnComment = !!currentUser && comment.user_email === currentUser.email;
  const canClap = !!currentUser && !disabled && !isOwnComment && !hasClapped;

  const awardPoints = useMutation({
    mutationFn: async () => {
      // Award the poster +3 reputation points
      if (!comment.user_email) return;
      const users = await base44.entities.User.filter({ email: comment.user_email });
      const poster = users[0];
      if (poster) {
        const newScore = (poster.reputation_score || 100) + 3;
        await base44.entities.User.update(poster.id, { reputation_score: newScore });
      }
    }
  });

  const clap = useMutation({
    mutationFn: async () => {
      await base44.entities.Clap.create({
        comment_id: comment.id,
        poll_id: comment.poll_id,
        clapper_user_id: currentUser.id,
        clapper_email: currentUser.email,
        clapper_name: currentUser.full_name || currentUser.email,
        target_user_email: comment.user_email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['claps', comment.poll_id]);
      queryClient.invalidateQueries(['currentUser']);
      awardPoints.mutate();
    }
  });

  const handleClick = (e) => {
    e.stopPropagation();
    if (!canClap) return;
    clap.mutate();
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={!canClap}
      whileTap={canClap ? { scale: 0.85 } : undefined}
      className={`flex items-center gap-1.5 h-6 md:h-7 px-2 rounded-full text-xs font-medium transition-all ${
        hasClapped
          ? 'bg-amber-100 text-amber-700 border border-amber-300'
          : canClap
            ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50 border border-transparent'
            : 'text-slate-400 border border-transparent cursor-not-allowed'
      }`}
      title={
        isOwnComment
          ? "You can't clap your own comment"
          : hasClapped
            ? 'You applauded this'
            : canClap
              ? 'Applaud this comment (+3 points to author)'
              : 'Log in to applaud'
      }
    >
      <motion.span
        animate={hasClapped ? { scale: [1, 1.25, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex items-center"
      >
        <Sparkles
          className={`w-3.5 h-3.5 md:w-4 md:h-4 ${hasClapped ? 'fill-amber-400 text-amber-600' : ''}`}
        />
      </motion.span>
      <span className="tabular-nums">{count}</span>
    </motion.button>
  );
}