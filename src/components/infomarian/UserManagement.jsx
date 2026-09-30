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
import { AlertCircle, Search, Flag, CheckCircle2, User, MessageSquare, Pencil, Save, X, History, Loader2 } from 'lucide-react';
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
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [editReason, setEditReason] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

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
  const startEdit = () => {
    setEditData({
      full_name: selectedUser.name || selectedUser.full_name || '',
      email: selectedUser.email || '',
      last_name: selectedUser.last_name || '',
      date_of_birth: selectedUser.date_of_birth || '',
      phone_number: selectedUser.phone_number || '',
      language: selectedUser.language || 'en',
      user_role: selectedUser.user_role || selectedUser.role || 'voter',
      franchise_id: selectedUser.franchise_id || '',
      infomarian_id: selectedUser.infomarian_id || '',
      bsb: selectedUser.bsb || '',
      account_number: selectedUser.account_number || '',
      account_name: selectedUser.account_name || '',
      account_validated: !!selectedUser.account_validated,
      voter_id: selectedUser.voter_id || ''
    });
    setEditReason('');
    setEditMode(true);
    setHistoryOpen(false);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditData({});
    setEditReason('');
  };

  const saveEdit = async () => {
    if (!selectedUser) return;
    setSavingEdit(true);
    try {
      const res = await base44.functions.invoke('update-user-record', {
        target_user_id: selectedUser.id,
        updates: editData,
        reason: editReason
      });
      const updated = res.data?.user;
      if (updated) {
        setSelectedUser({ ...selectedUser, ...updated });
      }
      setEditMode(false);
      alert('User record updated. Change history recorded.');
    } catch (e) {
      alert('Failed to update user record: ' + (e.message || 'Unknown error'));
    } finally {
      setSavingEdit(false);
    }
  };

  const [strikeData, setStrikeData] = useState({
    reason: '',
    severity: 'moderate',
    comment_id: ''
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false
  });

  const canRevokeStrike = !!currentUser && (
    currentUser.email === 'ac@acproductiondesign.com' ||
    currentUser.role === 'admin' ||
    currentUser.user_role === 'master_franchiser'
  );

  const [revokingStrike, setRevokingStrike] = useState(null);

  const handleRevokeStrike = async (strike) => {
    const note = prompt('Enter a reason for revoking this strike:', 'Strike issued in error');
    if (note === null) return;
    setRevokingStrike(strike.date);
    try {
      const res = await base44.functions.invoke('revoke-strike', {
        target_user_id: selectedUser.id,
        strike_date: strike.date,
        reason: note
      });
      const data = res.data;
      if (data?.ok) {
        // Refresh the selected user's strikes from the server
        const fresh = await base44.functions.invoke('search-users', { query: selectedUser.email });
        const updated = fresh.data?.users?.find(u => u.id === selectedUser.id);
        if (updated) setSelectedUser({ ...selectedUser, ...updated });
        alert(`Strike revoked. ${data.strike_count} strike(s) remaining. Reputation restored to ${data.reputation_score}.`);
      }
    } catch (e) {
      alert('Failed to revoke strike: ' + (e.message || 'Unknown error'));
    } finally {
      setRevokingStrike(null);
    }
  };

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
                          <div className="flex justify-between items-center">
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
                          {strike.infomarian_name && (
                            <p className="mt-1 text-slate-400">Issued by: {strike.infomarian_name}</p>
                          )}
                          {canRevokeStrike && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRevokeStrike(strike)}
                              disabled={revokingStrike === strike.date}
                              className="mt-2 h-7 text-xs border-red-200 text-red-700 hover:bg-red-50"
                            >
                              {revokingStrike === strike.date ? (
                                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Revoking...</>
                              ) : (
                                <><X className="w-3 h-3 mr-1" /> Revoke Strike</>
                              )}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap gap-2">
                  <Button
                    onClick={handleDirectMessage}
                    disabled={dmLoading}
                    variant="outline"
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {t('messages.directMessage')}
                  </Button>
                  <Button
                    onClick={() => { setEditMode(false); setHistoryOpen(!historyOpen); }}
                    variant="outline"
                    className="border-slate-300 text-slate-700 hover:bg-slate-100"
                  >
                    <History className="w-4 h-4 mr-2" />
                    Change History Report
                  </Button>
                  {!editMode ? (
                    <Button onClick={startEdit} className="bg-indigo-600 hover:bg-indigo-700">
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Record
                    </Button>
                  ) : (
                    <Button onClick={cancelEdit} variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                      <X className="w-4 h-4 mr-2" />
                      Cancel Edit
                    </Button>
                  )}
                </div>

                {/* Edit Record Form */}
                {editMode && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-indigo-200 space-y-3">
                    <h4 className="font-semibold text-indigo-900 flex items-center gap-2">
                      <Pencil className="w-4 h-4" />
                      Edit User Record
                    </h4>
                    <p className="text-xs text-slate-500">
                      Changes are logged to the change history report with your name and role.
                    </p>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Full Name</Label>
                        <Input
                          value={editData.full_name || ''}
                          onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Email</Label>
                        <Input
                          type="email"
                          value={editData.email || ''}
                          onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Last Name</Label>
                        <Input
                          value={editData.last_name || ''}
                          onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Date of Birth</Label>
                        <Input
                          type="date"
                          value={editData.date_of_birth || ''}
                          onChange={(e) => setEditData({ ...editData, date_of_birth: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Phone Number</Label>
                        <Input
                          value={editData.phone_number || ''}
                          onChange={(e) => setEditData({ ...editData, phone_number: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Language</Label>
                        <select
                          value={editData.language || 'en'}
                          onChange={(e) => setEditData({ ...editData, language: e.target.value })}
                          className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-slate-900"
                        >
                          <option value="en">English</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                          <option value="es">Spanish</option>
                          <option value="nl">Dutch</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">User Role</Label>
                        <select
                          value={editData.user_role || 'voter'}
                          onChange={(e) => setEditData({ ...editData, user_role: e.target.value })}
                          className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-slate-900"
                        >
                          <option value="voter">Voter</option>
                          <option value="infomarian">Infomarian</option>
                          <option value="franchise_manager">Constituency Manager</option>
                          <option value="master_franchiser">Master Franchiser</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Constituency (Franchise) ID</Label>
                        <Input
                          value={editData.franchise_id || ''}
                          onChange={(e) => setEditData({ ...editData, franchise_id: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">BSB</Label>
                        <Input
                          value={editData.bsb || ''}
                          onChange={(e) => setEditData({ ...editData, bsb: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Account Number</Label>
                        <Input
                          value={editData.account_number || ''}
                          onChange={(e) => setEditData({ ...editData, account_number: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Account Name</Label>
                        <Input
                          value={editData.account_name || ''}
                          onChange={(e) => setEditData({ ...editData, account_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Voter ID</Label>
                        <Input
                          value={editData.voter_id || ''}
                          onChange={(e) => setEditData({ ...editData, voter_id: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!editData.account_validated}
                            onChange={(e) => setEditData({ ...editData, account_validated: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                          />
                          <span className="text-sm font-medium text-slate-700">Account Validated</span>
                        </label>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Reason for Change (recorded in history)</Label>
                      <Input
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        placeholder="e.g., Member requested phone number correction"
                      />
                    </div>
                    <Button
                      onClick={saveEdit}
                      disabled={savingEdit}
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                      {savingEdit ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                      ) : (
                        <><Save className="w-4 h-4 mr-2" /> Save Changes</>
                      )}
                    </Button>
                  </div>
                )}

                {/* Change History Report */}
                {historyOpen && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
                      <History className="w-4 h-4" />
                      Change History Report
                    </h4>
                    {(!selectedUser.change_history || selectedUser.change_history.length === 0) ? (
                      <p className="text-sm text-slate-500">No changes have been recorded for this user.</p>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {[...selectedUser.change_history].reverse().map((entry, idx) => (
                          <div key={idx} className="text-xs p-3 bg-slate-50 rounded border border-slate-200">
                            <div className="flex items-center justify-between mb-1">
                              <Badge className="bg-indigo-100 text-indigo-700 capitalize">
                                {entry.field?.replace(/_/g, ' ')}
                              </Badge>
                              <span className="text-slate-500">
                                {entry.date ? format(new Date(entry.date), 'MMM d, yyyy HH:mm') : ''}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <div>
                                <span className="text-slate-400">From:</span>{' '}
                                <span className="text-slate-700 break-all">
                                  {entry.old_value === null || entry.old_value === undefined ? '—' : String(entry.old_value)}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">To:</span>{' '}
                                <span className="text-slate-900 font-medium break-all">
                                  {entry.new_value === null || entry.new_value === undefined ? '—' : String(entry.new_value)}
                                </span>
                              </div>
                            </div>
                            <p className="mt-1 text-slate-500">
                              By {entry.changed_by_name || 'Unknown'}
                              {entry.changed_by_role ? ` (${entry.changed_by_role})` : ''}
                              {entry.reason ? ` — ${entry.reason}` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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