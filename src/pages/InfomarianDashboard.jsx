import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, MessageSquare, Image, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import AssignedPolls from '@/components/infomarian/AssignedPolls';
import CommentsModeration from '@/components/infomarian/CommentsModeration';
import ModerationQueue from '@/components/infomarian/ModerationQueue';
import MediaModeration from '@/components/infomarian/MediaModeration';
import EarningsTracker from '@/components/infomarian/EarningsTracker';
import UserManagement from '@/components/infomarian/UserManagement';
import UserSupport from '@/components/infomarian/UserSupport';
import TaskAssignment from '@/components/infomarian/TaskAssignment';
import PollModeration from '@/components/infomarian/PollModeration';
import InfomarianHelp from '@/components/help/InfomarianHelp';

export default function InfomarianDashboard() {
  const [activeTab, setActiveTab] = useState('queue');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: infomarian } = useQuery({
    queryKey: ['myInfomarian'],
    queryFn: async () => {
      const infomarians = await base44.entities.Infomarian.list();
      return infomarians.find(i => i.user_email === user?.email);
    },
    enabled: !!user?.email
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['pendingComments'],
    queryFn: () => base44.entities.Comment.list()
  });

  const { data: polls = [] } = useQuery({
    queryKey: ['polls-dashboard'],
    queryFn: () => base44.entities.Poll.list()
  });

  const pendingComments = comments.filter(c => 
    c.moderation_status === 'pending' || c.moderation_status === 'flagged'
  );

  const pendingMedia = comments.filter(c => 
    c.media_urls && c.media_urls.length > 0 && c.moderation_status === 'pending'
  );

  const pendingPolls = polls.filter(p => p.moderation_status === 'pending');

  const isSuperAdmin = user?.email === 'ac@acproductiondesign.com';
  
  if (!infomarian && user?.user_role !== 'infomarian' && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-4 md:p-8">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="border-0 shadow-xl">
            <CardContent className="pt-12 pb-12">
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Not an Infomarian</h2>
              <p className="text-slate-600">You need Infomarian credentials to access this dashboard.</p>
              <Link to={createPageUrl('Home')}>
                <Button className="mt-6 bg-indigo-600 hover:bg-indigo-700">
                  Go to Home
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Link to={createPageUrl('Home')}>
          <Button variant="ghost" className="mb-6 text-slate-600 hover:text-slate-900 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Infomarian Dashboard</h1>
              <p className="text-slate-500">Welcome, {infomarian.full_name}</p>
            </div>
            <Badge className="bg-purple-100 text-purple-700 px-4 py-2 text-base">
              {infomarian.infomarian_id}
            </Badge>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-green-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Total Earnings</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      ${(infomarian.total_earnings || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Pending Comments</p>
                    <p className="text-2xl font-bold text-amber-700">{pendingComments.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Pending Media</p>
                    <p className="text-2xl font-bold text-blue-700">{pendingMedia.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Image className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Moderation Level</p>
                    <p className="text-lg font-bold text-purple-700 capitalize">
                      {infomarian.moderation_level}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm flex-wrap">
            <TabsTrigger value="queue" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-4 relative">
              <AlertCircle className="w-4 h-4 mr-2" />
              Queue
              {pendingComments.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {pendingComments.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="poll-moderation" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-4 relative">
              <AlertCircle className="w-4 h-4 mr-2" />
              Poll Review
              {pendingPolls.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {pendingPolls.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="polls" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-4">
              <BarChart3 className="w-4 h-4 mr-2" />
              My Polls
            </TabsTrigger>
            <TabsTrigger value="comments" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-4">
              <MessageSquare className="w-4 h-4 mr-2" />
              Moderate
            </TabsTrigger>
            <TabsTrigger value="media" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-4 relative">
              <Image className="w-4 h-4 mr-2" />
              Media
              {pendingMedia.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {pendingMedia.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-4">
              Users
            </TabsTrigger>
            <TabsTrigger value="support" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-4">
              Support
            </TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-4">
              Tasks
            </TabsTrigger>
            <TabsTrigger value="earnings" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-4">
              <DollarSign className="w-4 h-4 mr-2" />
              Earnings
            </TabsTrigger>
            <TabsTrigger value="help" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-4">
              Help
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue">
            <ModerationQueue infomarian={infomarian} />
          </TabsContent>

          <TabsContent value="poll-moderation">
            <PollModeration infomarian={infomarian} />
          </TabsContent>

          <TabsContent value="polls">
            <AssignedPolls infomarian={infomarian} />
          </TabsContent>

          <TabsContent value="comments">
            <CommentsModeration infomarian={infomarian} />
          </TabsContent>

          <TabsContent value="media">
            <MediaModeration infomarian={infomarian} />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement infomarian={infomarian} />
          </TabsContent>

          <TabsContent value="support">
            <UserSupport infomarian={infomarian} />
          </TabsContent>

          <TabsContent value="tasks">
            <TaskAssignment infomarian={infomarian} />
          </TabsContent>

          <TabsContent value="earnings">
            <EarningsTracker infomarian={infomarian} />
          </TabsContent>

          <TabsContent value="help">
            <InfomarianHelp />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}