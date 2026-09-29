import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { UserPlus, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const UserNotRegisteredError = () => {
  const { logout } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50 p-4">
      <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl border border-slate-100 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-indigo-100">
          <UserPlus className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">Join Pollee</h1>
        <p className="text-slate-600 mb-6">
          You're signed in, but this account isn't registered to Pollee yet. If you're new here,
          log out and create an account to join — or ask an administrator to invite you.
        </p>
        <Button
          onClick={() => logout(true)}
          className="w-full h-12 mb-3 bg-indigo-600 hover:bg-indigo-700"
        >
          <LogOut className="w-5 h-5 mr-2" /> Log out to sign up
        </Button>
        <p className="text-xs text-slate-400">
          If you believe this is an error, contact the app administrator.
        </p>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;