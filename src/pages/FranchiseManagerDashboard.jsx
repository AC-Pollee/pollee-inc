import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, Vote, BarChart3, UserPlus, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function FranchiseManagerDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: franchises = [] } = useQuery({
    queryKey: ['franchises'],
    queryFn: () => base44.entities.Franchise.list()
  });

  const { data: infomarians = [] } = useQuery({
    queryKey: ['infomarians'],
    queryFn: () => base44.entities.Infomarian.list()
  });

  const { data: polls = [] } = useQuery({
    queryKey: ['polls'],
    queryFn: () => base44.entities.Poll.list()
  });

  const { data: votes = [] } = useQuery({
    queryKey: ['votes'],
    queryFn: () => base44.entities.Vote.list()
  });

  // Find franchise for this user
  const myFranchise = franchises.find(f => f.owner_email === user?.email);
  const myFranchiseInfomarians = infomarians.filter(i => i.franchise_id === myFranchise?.id);
  const myFranchisePolls = polls.filter(p => p.franchise_id === myFranchise?.id);
  const activePolls = myFranchisePolls.filter(p => p.status === 'active');

  if (user?.user_role !== 'franchise_manager' && user?.email !== 'ac@acproductiondesign.com') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-8">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="pt-12 pb-12">
            <Building2 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-500">You don't have Constituency Manager access.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!myFranchise) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-8">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="pt-12 pb-12">
            <Building2 className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No Constituency Assigned</h2>
            <p className="text-slate-500">Contact your administrator to assign a constituency to your account.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">Constituency Manager Dashboard</h1>
          </div>
          <p className="text-slate-500">{myFranchise.franchise_name} • {myFranchise.postcode}</p>
        </div>

        {/* Overview Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">My Infomarians</p>
                  <p className="text-3xl font-bold text-slate-900">{myFranchiseInfomarians.length}</p>
                </div>
                <Users className="w-10 h-10 text-emerald-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Active Polls</p>
                  <p className="text-3xl font-bold text-slate-900">{activePolls.length}</p>
                </div>
                <Vote className="w-10 h-10 text-indigo-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Total Polls</p>
                  <p className="text-3xl font-bold text-slate-900">{myFranchisePolls.length}</p>
                </div>
                <BarChart3 className="w-10 h-10 text-purple-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Constituency Status</p>
                  <Badge className={myFranchise.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                    {myFranchise.status}
                  </Badge>
                </div>
                <Building2 className="w-10 h-10 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
            <TabsTrigger value="infomarians" className="rounded-lg">Infomarians</TabsTrigger>
            <TabsTrigger value="polls" className="rounded-lg">Polls</TabsTrigger>
            <TabsTrigger value="registration" className="rounded-lg">User Registration</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4">
                  <Link to={createPageUrl('FranchiseAdmin')}>
                    <Button className="w-full h-20 flex flex-col gap-2" variant="outline">
                      <Users className="w-6 h-6" />
                      <span>Manage Infomarians</span>
                    </Button>
                  </Link>
                  <Link to={createPageUrl('Admin')}>
                    <Button className="w-full h-20 flex flex-col gap-2" variant="outline">
                      <Vote className="w-6 h-6" />
                      <span>Create Poll</span>
                    </Button>
                  </Link>
                  <Link to={createPageUrl('Results')}>
                    <Button className="w-full h-20 flex flex-col gap-2" variant="outline">
                      <BarChart3 className="w-6 h-6" />
                      <span>View Results</span>
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Constituency Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Constituency Name:</span>
                      <span className="font-semibold">{myFranchise.franchise_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Primary Postcode:</span>
                      <span className="font-semibold">{myFranchise.postcode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">State:</span>
                      <span className="font-semibold">{myFranchise.state}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Contact:</span>
                      <span className="font-semibold">{myFranchise.contact_phone || 'Not set'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="infomarians" className="mt-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>My Infomarians</CardTitle>
                  <Link to={createPageUrl('FranchiseAdmin')}>
                    <Button size="sm">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Infomarian
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {myFranchiseInfomarians.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No infomarians assigned yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myFranchiseInfomarians.map(infomarian => (
                      <div key={infomarian.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-semibold text-slate-900">{infomarian.full_name}</p>
                          <p className="text-sm text-slate-500">ID: {infomarian.infomarian_id}</p>
                        </div>
                        <Badge className={
                          infomarian.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-slate-100 text-slate-600'
                        }>
                          {infomarian.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="polls" className="mt-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>My Polls</CardTitle>
                  <Link to={createPageUrl('Admin')}>
                    <Button size="sm">Create Poll</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {myFranchisePolls.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No polls created yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myFranchisePolls.map(poll => (
                      <div key={poll.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-semibold text-slate-900">{poll.title}</p>
                          <p className="text-sm text-slate-500">{poll.poll_level} • {votes.filter(v => v.poll_id === poll.id && v.status === 'verified').reduce((sum, v) => sum + (v.delegated_votes_count || 1), 0)} votes</p>
                        </div>
                        <Badge className={poll.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                          {poll.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="registration" className="mt-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>User Registration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <UserPlus className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4">
                    Users can self-register through the main application.
                  </p>
                  <p className="text-sm text-slate-500">
                    New users will go through the standard registration and validation process.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}