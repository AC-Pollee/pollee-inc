import React from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ActiveUsersCounter from '@/components/ActiveUsersCounter';

export default function ThemeLanguageToggle() {
  return (
    <div className="inline-flex flex-row items-center gap-2">
      <ThemeToggle />
      <LanguageSwitcher />
      <ActiveUsersCounter />
    </div>
  );
}