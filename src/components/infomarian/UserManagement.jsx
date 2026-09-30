import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Search, Flag, CheckCircle2, User, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

export default function UserManagement({ infomarian }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [dmLoading, setDmLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleDirectMessage = async () => {
    if (!selectedUser) return;
    setDmLoading(true);
    try {
      const res = await base44.functions.invoke('start-conversation', { target_user_id: selectedUser.id });
      const conv = res.data?.conversation;
      if (conv) navigate(`/Messages?c=${conv.id}`);
    } catch (e) {
      alert('Could not start conversation');
    } finally {
      setDmLoading(false);
    }
  };
  const [strikeData, setStrikeData] = useState({
    reason: '',
    severity: 'moderate',
    comment_id: ''
  });

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      // In a real app, you'd have a proper user listing endpoint
      return [];
    }
  });

  const issueStrike = useMutation({
    mutationFn: async ({ userId, strikeInfo }) => {
      const user = await base44.entities.User.list();
      const targetUser = user.find(u => u.email === userId || u.id === userId);
      
      if (!targetUser) throw new Error('User not found');

      const newStrike = {
        date: new Date().toISOString(),
        infomarian_id: infomarian.infomarian_id,
        infomarian_name: infomarian.full_name,
        reason: strikeInfo.reason,
        severity: strikeInfo.severity,
        comment_id: strikeInfo.comment_id || null
      };

      const existingStrikes = targetUser.strikes || [];
      const updatedStrikes = [...existingStrikes, newStrike];
      
      // Restrict commenting if 3+ strikes
      const commenting_restricted = updatedStrikes.length >= 3;

      await base44.auth.updateMe({
        strikes: updatedStrikes,
        commenting_restricted
      });

      return { strikes: updatedStrikes, commenting_restricted };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allUsers']);
      setStrikeData({ reason: '', severity: 'moderate', comment_id: '' });
      alert('Strike issued successfully');
    }
  });

  const searchUser = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    setSearchResults([]);
    setSelectedUser(null);
    try {
      const res = await base44.functions.invoke('search-users', { query: searchEmail.trim() });
      const users = res.data?.users || [];
      setSearchResults(users);
      if (users.length === 0) {
        alert('No users found');
      }
    } catch (error) {
      console.error('Error searching user:', error);
      alert('Error searching for user');
    } finally {
      setSearching(false);
    }
  };

  const handleIssueStrike = () => {
    if (!selectedUser || !strikeData.reason.trim()) {
      alert('Please select a user and provide a reason');
      return;
    }

    issueStrike.mutate({
      userId: selectedUser.email,
      strikeInfo: strikeData
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>{t('userMgmt.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search by name or email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchUser()}
              />
            </div>
            <Button onClick={searchUser} disabled={searching}>
              <Search className="w-4 h-4 mr-2" />
              {searching ? 'Searching...' : t('userMgmt.search')}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-1 border border-slate-200 rounded-md p-2 bg-white max-h-64 overflow-y-auto">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { setSelectedUser(u); setSearchResults([]); }}
                  className="w-full flex items-center justify-between text-left px-3 py-2 rounded hover:bg-slate-100 transition"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">{u.role}</Badge>
                </button>
              ))}
            </div>
          )}

          {selectedUser && (
            <Card className="bg-slate-50">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedUser.name || selectedUser.full_name}</h3>
                    <p className="text-sm text-slate-600">{selectedUser.email}</p>
                    {selectedUser.voter_id && (
                      <Badge className="mt-2">Voter ID: {selectedUser.voter_id}</Badge>
                    )}
                  </div>
                  <User className="w-8 h-8 text-slate-400" />
                </div>

                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Strikes:</span>
                    <span className="ml-2 font-semibold">{selectedUser.strikes?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Commenting:</span>
                    <Badge className={selectedUser.commenting_restricted ? 'bg-red-100 text-red-700 ml-2' : 'bg-emerald-100 text-emerald-700 ml-2'}>
                      {selectedUser.commenting_restricted ? 'Restricted' : 'Active'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-slate-500">Account:</span>
                    <Badge className={selectedUser.account_validated ? 'bg-emerald-100 text-emerald-700 ml-2' : 'bg-amber-100 text-amber-700 ml-2'}>
                      {selectedUser.account_validated ? 'Validated' : 'Pending'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-slate-500">Role:</span>
                    <span className="ml-2 font-semibold capitalize">{selectedUser.user_role || 'voter'}</span>
                  </div>
                </div>

                {selectedUser.strikes && selectedUser.strikes.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Strike History:</p>
                    <div className="space-y-2">
                      {selectedUser.strikes.map((strike, idx) => (
                        <div key={idx} className="text-xs bg-white p-2 rounded border">
                          <div className="flex justify-between">
                            <Badge className={
                              strike.severity === 'severe' ? 'bg-red-600' :
                              strike.severity === 'moderate' ? 'bg-orange-600' :
                              'bg-yellow-600'
                            }>
                              {strike.severity}
                            </Badge>
                            <span className="text-slate-500">{format(new Date(strike.date), 'MMM d, yyyy')}</span>
                          </div>
                          <p className="mt-1 text-slate-700">{strike.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-slate-200">
                  <Button onClick={handleDirectMessage} disabled={dmLoading} className="bg-indigo-600 hover:bg-indigo-700">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {t('messages.directMessage')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5" />
              {t('userMgmt.issueStrike')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Issue a strike for conduct violations. User will be notified and can view strikes in their profile.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="severity">Strike Severity</Label>
              <select
                id="severity"
                value={strikeData.severity}
                onChange={(e) => setStrikeData({...strikeData, severity: e.target.value})}
                className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-slate-900"
              >
                <option value="minor">Minor - Warning only</option>
                <option value="moderate">Moderate - Counted toward 3 strikes</option>
                <option value="severe">Severe - Immediate restriction consideration</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Strike</Label>
              <Textarea
                id="reason"
                placeholder="Describe the conduct violation in detail..."
                value={strikeData.reason}
                onChange={(e) => setStrikeData({...strikeData, reason: e.target.value})}
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment_id">Related Comment ID (optional)</Label>
              <Input
                id="comment_id"
                placeholder="Enter comment ID if applicable"
                value={strikeData.comment_id}
                onChange={(e) => setStrikeData({...strikeData, comment_id: e.target.value})}
              />
            </div>

            <Button
              onClick={handleIssueStrike}
              disabled={!strikeData.reason.trim() || issueStrike.isPending}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {issueStrike.isPending ? (
                <>Processing...</>
              ) : (
                <>
                  <Flag className="w-4 h-4 mr-2" />
                  Issue Strike
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}