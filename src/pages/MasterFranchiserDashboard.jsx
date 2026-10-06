import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Building2, Users, Vote, BarChart3, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ConstituencyHelp from '@/components/help/ConstituencyHelp';
import InfomarianEditDialog from '@/components/infomarian/InfomarianEditDialog';
import UserDirectory from '@/components/admin/UserDirectory';
import { useTranslation } from 'react-i18next';

export default function MasterFranchiserDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [editingInfomarian, setEditingInfomarian] = useState(null);

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

  const { data: comments = [] } = useQuery({
    queryKey: ['comments'],
    queryFn: () => base44.entities.Comment.list()
  });

  const pendingComments = comments.filter(c => c.moderation_status === 'pending' || c.moderation_status === 'flagged');
  const activePolls = polls.filter(p => p.status === 'active');
  const totalVotes = votes.filter(v => v.status === 'verified').reduce((sum, v) => sum + (v.delegated_votes_count || 1), 0);

  const isAdminRole = user?.user_role === 'admin' || user?.user_role === 'master_franchiser' || user?.user_role === 'franchise_manager';
  if (!isAdminRole && user?.email !== 'ac@acproductiondesign.com') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-8">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="pt-12 pb-12">
            <Shield className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">{t('masterDash.accessDenied')}</h2>
            <p className="text-slate-500">{t('masterDash.accessDeniedDesc')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-slate-900">{t('masterDash.title')}</h1>
          </div>
          <p className="text-slate-500">{t('masterDash.subtitle')}</p>
        </div>

        {/* Overview Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">{t('masterDash.totalConstituencies')}</p>
                  <p className="text-3xl font-bold text-slate-900">{franchises.length}</p>
                </div>
                <Building2 className="w-10 h-10 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">{t('masterDash.totalInfomarians')}</p>
                  <p className="text-3xl font-bold text-slate-900">{infomarians.length}</p>
                </div>
                <Users className="w-10 h-10 text-emerald-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">{t('masterDash.activePolls')}</p>
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
                  <p className="text-sm text-slate-500 mb-1">{t('masterDash.totalVotes')}</p>
                  <p className="text-3xl font-bold text-slate-900">{totalVotes}</p>
                </div>
                <BarChart3 className="w-10 h-10 text-purple-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            <TabsTrigger value="overview" className="rounded-lg">{t('masterDash.overview')}</TabsTrigger>
            <TabsTrigger value="franchises" className="rounded-lg">{t('masterDash.constituencies')}</TabsTrigger>
            <TabsTrigger value="infomarians" className="rounded-lg">{t('masterDash.infomarians')}</TabsTrigger>
            <TabsTrigger value="polls" className="rounded-lg">{t('masterDash.polls')}</TabsTrigger>
            <TabsTrigger value="moderation" className="rounded-lg">
              {t('masterDash.moderation')}
              {pendingComments.length > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{pendingComments.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg">{t('userDirectory.title')}</TabsTrigger>
            <TabsTrigger value="help" className="rounded-lg">{t('masterDash.help')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>{t('masterDash.quickActions')}</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4">
                  <Link to={createPageUrl('FranchiseAdmin')}>
                    <Button className="w-full h-20 flex flex-col gap-2" variant="outline">
                      <Building2 className="w-6 h-6" />
                      <span>{t('masterDash.manageConstituencies')}</span>
                    </Button>
                  </Link>
                  <Link to={createPageUrl('Admin')}>
                    <Button className="w-full h-20 flex flex-col gap-2" variant="outline">
                      <Vote className="w-6 h-6" />
                      <span>{t('masterDash.managePolls')}</span>
                    </Button>
                  </Link>
                  <Link to={createPageUrl('Results')}>
                    <Button className="w-full h-20 flex flex-col gap-2" variant="outline">
                      <BarChart3 className="w-6 h-6" />
                      <span>{t('masterDash.viewAllResults')}</span>
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>{t('masterDash.systemStatus')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <span className="text-slate-700">{t('masterDash.activeConstituencies')}</span>
                      <Badge className="bg-emerald-100 text-emerald-700">
                        {franchises.filter(f => f.status === 'active').length} Active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <span className="text-slate-700">{t('masterDash.pendingModeration')}</span>
                      <Badge className={pendingComments.length > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}>
                        {pendingComments.length} Items
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="franchises" className="mt-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>{t('masterDash.allConstituencies')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {franchises.map(franchise => (
                    <div key={franchise.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-slate-900">{franchise.franchise_name}</p>
                        <p className="text-sm text-slate-500">{franchise.postcode} • {franchise.state}</p>
                      </div>
                      <Badge className={
                        franchise.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        franchise.status === 'suspended' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-600'
                      }>
                        {franchise.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="infomarians" className="mt-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>{t('masterDash.allInfomarians')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {infomarians.map(infomarian => (
                    <div key={infomarian.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-slate-900">{infomarian.full_name}</p>
                        <p className="text-sm text-slate-500">ID: {infomarian.infomarian_id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          infomarian.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                          infomarian.status === 'suspended' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-600'
                        }>
                          {infomarian.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingInfomarian(infomarian)}
                          className="text-slate-400 hover:text-indigo-600"
                          title="Edit Infomarian"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="polls" className="mt-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('masterDash.allPolls')}</CardTitle>
                  <Link to={createPageUrl('Admin')}>
                    <Button size="sm">{t('masterDash.createPoll')}</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {polls.map(poll => (
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="moderation" className="mt-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>{t('masterDash.pendingModerationTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingComments.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    {t('masterDash.noItemsPending')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingComments.map(comment => (
                      <div key={comment.id} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={
                            comment.moderation_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }>
                            {comment.moderation_status}
                          </Badge>
                          <span className="text-sm text-slate-500">{comment.user_name}</span>
                        </div>
                        <p className="text-slate-700">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UserDirectory />
          </TabsContent>

          <TabsContent value="help" className="mt-6">
            <ConstituencyHelp />
          </TabsContent>
        </Tabs>
      </div>

      <InfomarianEditDialog
        infomarian={editingInfomarian}
        open={!!editingInfomarian}
        onOpenChange={(v) => !v && setEditingInfomarian(null)}
        franchises={franchises}
      />
    </div>
  );
}