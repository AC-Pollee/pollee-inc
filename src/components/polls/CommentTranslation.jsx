import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const LANGUAGE_NAMES = {
  en: 'English',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  nl: 'Dutch',
};

// Cache translations per comment + language so we don't re-call the LLM on every render
const cache = new Map();

export default function CommentTranslation({ comment }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'en';
  const targetLang = LANGUAGE_NAMES[lang] || 'English';
  const needsTranslation = lang !== 'en' && !!comment?.content;

  const [translation, setTranslation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    if (!needsTranslation) return;
    const cacheKey = `${comment.id}:${lang}`;
    if (cache.has(cacheKey)) {
      setTranslation(cache.get(cacheKey));
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Translate the following comment into ${targetLang}. Return ONLY the translated text, preserving any formatting, line breaks, and tone. Do not add explanations or notes.\n\nComment:\n"${comment.content}"`,
        });
        if (cancelled) return;
        const text = typeof result === 'string' ? result : JSON.stringify(result);
        cache.set(cacheKey, text);
        setTranslation(text);
      } catch (e) {
        if (!cancelled) setTranslation(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [needsTranslation, comment?.id, comment?.content, lang, targetLang]);

  const displayText = (needsTranslation && translation && !showOriginal) ? translation : comment.content;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <p className={`text-xs md:text-sm text-slate-700 whitespace-pre-wrap break-words ${comment.moderation_status === 'rejected' ? 'line-through text-slate-400' : ''}`}>
        {displayText}
      </p>
      {needsTranslation && (translation || loading) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowOriginal(!showOriginal)}
          disabled={loading}
          className="h-6 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 self-start"
        >
          {loading ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              {t('commentTranslation.translating')}
            </>
          ) : showOriginal ? (
            <>
              <Languages className="w-3 h-3 mr-1" />
              {t('commentTranslation.showTranslation', { lang: targetLang })}
            </>
          ) : (
            <>
              <EyeOff className="w-3 h-3 mr-1" />
              {t('commentTranslation.showOriginal')}
            </>
          )}
        </Button>
      )}
    </div>
  );
}