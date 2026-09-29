import React from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage, LANGUAGES } from '@/i18n';

const LANGUAGE_LABELS = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
};

const LANGUAGE_FLAGS = {
  en: '🇬🇧',
  fr: '🇫🇷',
  de: '🇩🇪',
  es: '🇪🇸',
};

export default function LanguagePrompt() {
  const { t, i18n } = useTranslation();
  const current = i18n.language?.slice(0, 2) || 'en';

  return (
    <div className="mb-6">
      <label className="block text-xs font-medium text-muted-foreground mb-2 text-center">
        {t('common.language')}
      </label>
      <div className="grid grid-cols-4 gap-2">
        {LANGUAGES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => changeLanguage(code)}
            className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-medium transition-all ${
              current === code
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border text-muted-foreground hover:bg-accent'
            }`}
          >
            <span className="text-lg">{LANGUAGE_FLAGS[code]}</span>
            {LANGUAGE_LABELS[code]}
          </button>
        ))}
      </div>
    </div>
  );
}