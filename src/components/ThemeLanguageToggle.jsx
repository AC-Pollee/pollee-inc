import React from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function ThemeLanguageToggle() {
  return (
    <div className="relative group inline-block">
      <ThemeToggle />
      <div className="absolute right-0 top-full pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
        <LanguageSwitcher />
      </div>
    </div>
  );
}