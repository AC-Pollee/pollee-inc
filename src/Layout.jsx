import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Vote, BarChart3, Settings, User } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const navItems = [
    { name: 'Home', icon: Vote, label: 'Polls' },
    { name: 'Results', icon: BarChart3, label: 'Results' },
    { name: 'Admin', icon: Settings, label: 'Admin' },
    { name: 'Profile', icon: User, label: 'Profile' },
  ];

  // Note: Infomarian moderation and help features accessible via Profile page
  
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl('Home')} className="flex items-center gap-2">
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69415ee66a530550d1e35558/70757a247_pollee.png" 
                  alt="Pollee Inc Logo" 
                  className="w-8 h-8"
                />
              </div>
              <span className="font-bold text-xl text-slate-900">Pollee Inc</span>
            </Link>
            
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPageName === item.name;
                return (
                  <Link
                    key={item.name}
                    to={createPageUrl(item.name)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                      ${isActive 
                        ? 'bg-indigo-50 text-indigo-700' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
      
      {/* Page Content */}
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}