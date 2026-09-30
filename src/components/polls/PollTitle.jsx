import React from 'react';
import { usePollTranslation } from '@/hooks/usePollTranslation';

// Renders a poll's translated title. Extracted as a component so it can be
// used inside loops/maps (the translation hook can't be called in a loop).
export default function PollTitle({ poll, fallback = 'Untitled Poll', className }) {
  const { title } = usePollTranslation(poll);
  return <span className={className}>{title || fallback}</span>;
}