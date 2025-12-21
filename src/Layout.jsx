import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Vote, BarChart3, Settings, User, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";

export default function Layout({ children, currentPageName }) {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false
  });

  const { data: infomarian } = useQuery({
    queryKey: ['myInfomarian'],
    queryFn: async () => {
      if (!user?.email) return null;
      const infomarians = await base44.entities.Infomarian.list();
      return infomarians.find(i => i.user_email === user.email);
    },
    enabled: !!user?.email
  });

  const { data: pendingCount } = useQuery({
    queryKey: ['pendingModerationCount'],
    queryFn: async () => {
      if (!infomarian) return 0;
      const comments = await base44.entities.Comment.list();
      const pending = comments.filter(c => 
        c.moderation_status === 'pending' || c.moderation_status === 'flagged'
      );
      return pending.length;
    },
    enabled: !!infomarian,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const navItems = [
    { name: 'Home', icon: Vote, label: 'Polls' },
    { name: 'Results', icon: BarChart3, label: 'Results' },
    { name: 'Admin', icon: Settings, label: 'Admin' },
    { name: 'Profile', icon: User, label: 'Profile' },
  ];

  if (infomarian) {
    navItems.splice(3, 0, { 
      name: 'InfomarianDashboard', 
      icon: Shield, 
      label: 'Infomarian',
      badge: pendingCount > 0 ? pendingCount : null
    });
  }

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
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all relative
                      ${isActive 
                        ? 'bg-indigo-50 text-indigo-700' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                    {item.badge && (
                      <Badge className="ml-1 h-5 min-w-5 px-1.5 bg-red-500 text-white text-xs">
                        {item.badge}
                      </Badge>
                    )}
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