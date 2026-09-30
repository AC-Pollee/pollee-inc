import React, { useState } from 'react';
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

export default function CommentTranslation({ comment }) {
  const { t, i18n } = useTranslation();
  const [translation, setTranslation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [error, setError] = useState(null);

  const targetLang = LANGUAGE_NAMES[i18n.language] || 'English';

  const handleTranslate = async () => {
    // If we already have a translation, just toggle back to it
    if (translation) {
      setShowOriginal(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Translate the following comment into ${targetLang}. Return ONLY the translated text, preserving any formatting, line breaks, and tone. Do not add explanations or notes.\n\nComment:\n"${comment.content}"`,
      });
      setTranslation(typeof result === 'string' ? result : JSON.stringify(result));
      setShowOriginal(false);
    } catch (e) {
      setError(t('commentTranslation.error'));
    } finally {
      setLoading(false);
    }
  };

  // If translation exists, show toggle between original and translated
  if (translation) {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <p className={`text-xs md:text-sm text-slate-700 whitespace-pre-wrap break-words ${comment.moderation_status === 'rejected' ? 'line-through text-slate-400' : ''}`}>
          {showOriginal ? comment.content : translation}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowOriginal(!showOriginal)}
            className="h-6 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2"
          >
            {showOriginal ? (
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
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleTranslate}
        disabled={loading}
        className="h-6 text-xs text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 px-2 self-start"
      >
        {loading ? (
          <>
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            {t('commentTranslation.translating')}
          </>
        ) : (
          <>
            <Languages className="w-3 h-3 mr-1" />
            {t('commentTranslation.translate', { lang: targetLang })}
          </>
        )}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}