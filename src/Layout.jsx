import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createPageUrl } from '@/utils';
import { Vote, BarChart3, Settings, User, Shield, AlertTriangle, ShieldAlert, MessageSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Layout({ children, currentPageName }) {
  const { t } = useTranslation();
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

  const { data: ownedFranchise } = useQuery({
    queryKey: ['myFranchise'],
    queryFn: async () => {
      if (!user?.email) return null;
      const franchises = await base44.entities.Franchise.list();
      return franchises.find(f => f.owner_email === user.email) || null;
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

  // Role-based navigation
  const getRoleNavItems = () => {
    const isSuperAdmin = user?.email === 'ac@acproductiondesign.com';
    const userRole = user?.user_role;

    if (isSuperAdmin) {
      return [
        { name: 'InfomarianDashboard', icon: Shield, label: 'nav.dashboard', badge: pendingCount > 0 ? pendingCount : null },
        { name: 'Home', icon: Vote, label: 'nav.polls' },
        { name: 'Results', icon: BarChart3, label: 'nav.results' },
        { name: 'MasterFranchiserDashboard', icon: Shield, label: 'nav.master' },
        { name: 'Admin', icon: Settings, label: 'nav.admin' },
        { name: 'Profile', icon: User, label: 'nav.profile' },
      ];
    }

    if (userRole === 'master_franchiser') {
      return [
        { name: 'MasterFranchiserDashboard', icon: Shield, label: 'nav.dashboard' },
        { name: 'FranchiseAdmin', icon: Settings, label: 'nav.constituencies' },
        { name: 'Admin', icon: Settings, label: 'nav.admin' },
        { name: 'Profile', icon: User, label: 'nav.profile' },
      ];
    }

    if (userRole === 'franchise_manager') {
      return [
        { name: 'FranchiseManagerDashboard', icon: Vote, label: 'nav.dashboard' },
        { name: 'FranchiseAdmin', icon: Settings, label: 'nav.infomarians' },
        { name: 'Admin', icon: Settings, label: 'nav.admin' },
        { name: 'Profile', icon: User, label: 'nav.profile' },
      ];
    }

    if (userRole === 'infomarian' || infomarian) {
      return [
        { name: 'InfomarianDashboard', icon: Shield, label: 'nav.dashboard', badge: pendingCount > 0 ? pendingCount : null },
        { name: 'Home', icon: Vote, label: 'nav.polls' },
        { name: 'Admin', icon: Settings, label: 'nav.admin' },
        { name: 'Results', icon: BarChart3, label: 'nav.results' },
        { name: 'Profile', icon: User, label: 'nav.profile' },
      ];
    }

    // Franchise owners (without an infomarian record) also get admin access to create polls
    if (ownedFranchise) {
      return [
        { name: 'Home', icon: Vote, label: 'nav.polls' },
        { name: 'Admin', icon: Settings, label: 'nav.admin' },
        { name: 'Results', icon: BarChart3, label: 'nav.results' },
        { name: 'Profile', icon: User, label: 'nav.profile' },
      ];
    }

    // Default voter navigation
    return [
      { name: 'Home', icon: Vote, label: 'nav.polls' },
      { name: 'Results', icon: BarChart3, label: 'nav.results' },
      { name: 'Profile', icon: User, label: 'nav.profile' },
    ];
  };

  const navItems = getRoleNavItems();
  // Incident reporting is available to all users — pinned to the menu bar
  navItems.push({ name: 'IncidentReport', icon: AlertTriangle, label: 'nav.report' });
  // Direct messaging — available to all users (moderators initiate, members reply)
  navItems.push({ name: 'Messages', icon: MessageSquare, label: 'nav.messages' });

  // Moderation Alerts — visible only to Infomarians and Constituency administrators
  const isSuperAdmin = user?.email === 'ac@acproductiondesign.com';
  const canModerate = isSuperAdmin || !!infomarian || !!ownedFranchise || user?.user_role === 'master_franchiser' || user?.user_role === 'franchise_manager';
  if (canModerate) {
    navItems.push({ name: 'ModerationAlerts', icon: ShieldAlert, label: 'nav.moderation', badge: pendingCount > 0 ? pendingCount : null });
  }

  // Note: Infomarian moderation and help features accessible via Profile page
  
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')} className="flex items-center gap-2">
                <div className="w-9 h-9 bg-white dark:bg-[#1c233a] rounded-lg flex items-center justify-center">
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69415ee66a530550d1e35558/70757a247_pollee.png"
                    alt="Pollee Inc Logo"
                    className="w-8 h-8 dark:hidden"
                  />
                  <img
                    src="https://media.base44.com/images/public/69415ee66a530550d1e35558/dff239769_Infinite-Pollee-Blue-White.png"
                    alt="Pollee Inc Logo"
                    className="w-8 h-8 hidden dark:block"
                  />
                </div>
                <span className="font-bold text-xl text-slate-900">Pollee Inc</span>
              </Link>
            </div>
            
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
                    <span className="hidden sm:inline">{t(item.label)}</span>
                    {item.badge && (
                      <Badge className="ml-1 h-5 min-w-5 px-1.5 bg-red-500 text-white text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
              <LanguageSwitcher />
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