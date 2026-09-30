import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Loader2, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCommentTranslation } from '@/hooks/useCommentTranslation';

export default function CommentTranslation({ comment, compact = false }) {
  const { t } = useTranslation();
  const { translation, needsTranslation, targetLang, loading, error, retryTranslation, translationKey } = useCommentTranslation(comment);
  const [originalKey, setOriginalKey] = useState(null);
  const showOriginal = originalKey === translationKey;
  const textClass = compact ? 'text-sm text-slate-600 mt-1 line-clamp-3' : 'text-xs md:text-sm text-slate-700 whitespace-pre-wrap break-words';

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <p className={`${textClass} ${comment.moderation_status === 'rejected' ? 'line-through text-slate-400' : ''}`}>
        {needsTranslation && translation && !showOriginal ? translation : comment.content}
      </p>
      {loading && <span role="status" className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />{t('commentTranslation.translating')}</span>}
      {error && <button type="button" onClick={() => retryTranslation()} className="text-xs text-destructive text-left">{t('commentTranslation.error')}</button>}
      {!compact && needsTranslation && translation && !loading && (
        <Button variant="ghost" size="sm" onClick={() => setOriginalKey(showOriginal ? null : translationKey)} className="h-6 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 self-start">
          {showOriginal ? <Languages className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
          {showOriginal ? t('commentTranslation.showTranslation', { lang: targetLang }) : t('commentTranslation.showOriginal')}
        </Button>
      )}
    </div>
  );
}