import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';

const LANGUAGE_NAMES = {
  en: 'English',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  nl: 'Dutch',
};

// Cache translations per poll + language so we don't re-call the LLM on every render
const cache = new Map();

export function usePollTranslation(poll) {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'en';
  const [translated, setTranslated] = useState(null);

  useEffect(() => {
    if (!poll?.id || lang === 'en') {
      setTranslated(null);
      return;
    }
    const cacheKey = `${poll.id}:${lang}`;
    if (cache.has(cacheKey)) {
      setTranslated(cache.get(cacheKey));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const targetLang = LANGUAGE_NAMES[lang] || 'English';
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Translate the following poll title and description into ${targetLang}. Return ONLY a JSON object with "title" and "description" fields. Preserve meaning and tone. If description is empty, return an empty string for it.\n\nTitle:\n${poll.title}\n\nDescription:\n${poll.description || ''}`,
          response_json_schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
            },
          },
        });
        if (cancelled) return;
        const val = { title: result.title || poll.title, description: result.description ?? poll.description };
        cache.set(cacheKey, val);
        setTranslated(val);
      } catch (e) {
        if (!cancelled) setTranslated(null);
      }
    })();
    return () => { cancelled = true; };
  }, [poll?.id, lang, poll?.title, poll?.description]);

  if (lang === 'en' || !translated) {
    return { title: poll?.title, description: poll?.description };
  }
  return translated;
}