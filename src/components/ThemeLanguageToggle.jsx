import React from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function ThemeLanguageToggle() {
  return (
    <div className="inline-flex flex-col items-end gap-2">
      <ThemeToggle />
      <LanguageSwitcher />
    </div>
  );
}