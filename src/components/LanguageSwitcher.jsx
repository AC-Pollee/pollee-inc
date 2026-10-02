import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { changeLanguage, LANGUAGES } from '@/i18n';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const LANGUAGE_LABELS = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  nl: 'Nederlands',
};

const LANGUAGE_FLAGS = {
  en: '🇬🇧',
  fr: '🇫🇷',
  de: '🇩🇪',
  es: '🇪🇸',
  nl: '🇳🇱',
};

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = i18n.language?.slice(0, 2) || 'en';

  const handleSelect = (code) => {
    changeLanguage(code);
    setOpen(false);
    if (user) {
      base44.auth.updateMe({ language: code }).catch(() => {});
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
      >
        <Globe className="w-4 h-4 text-indigo-600" />
        <span>{LANGUAGE_LABELS[current]}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-44 z-50">
          {LANGUAGES.map((code) => (
            <button
              key={code}
              onClick={() => handleSelect(code)}
              className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-slate-100 ${
                current === code ? 'text-indigo-700 font-medium' : 'text-slate-700'
              }`}
            >
              <span className="text-base">{LANGUAGE_FLAGS[code]}</span>
              <span className="flex-1">{LANGUAGE_LABELS[code]}</span>
              {current === code && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}