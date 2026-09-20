import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, Plus, Trash2, Loader2, CheckCircle2, XCircle, 
  Clock, ExternalLink, Settings, Vote, Eye, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import VotingOptionsEditor from '@/components/polls/VotingOptionsEditor';

export default function Admin() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('create');
  
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });
  
  const isSuperAdmin = currentUser?.email === 'ac@acproductiondesign.com';
  const hasAccess = isSuperAdmin || currentUser?.role === 'admin' || currentUser?.user_role === 'master_franchiser' || currentUser?.user_role === 'franchise_manager';
  
  // Create Poll State
  const [pollTitle, setPollTitle] = useState('');
  const [pollDescription, setPollDescription] = useState('');
  const [pollEndDate, setPollEndDate] = useState('');
  const [options, setOptions] = useState([{ id: '1', label: '' }, { id: '2', label: '' }]);
  const [pollLevel, setPollLevel] = useState('local');
  const [franchiseId, setFranchiseId] = useState('');
  const [pollState, setPollState] = useState('');
  const [pollPostcodes, setPollPostcodes] = useState('');

  const { data: franchises = [] } = useQuery({
    queryKey: ['franchises'],
    queryFn: () => base44.entities.Franchise.list()
  });

  // Bank Details State
  const [bankDetails, setBankDetails] = useState({
    pollee_bsb: '123-456',
    pollee_account: 'Pollee Inc',
    pollee_account_name: 'Pollee Inc',
    yes_account: '11111111',
    no_account: '22222222',
    undecided_account: '33333333'
  });
  const [bankSaved, setBankSaved] = useState(false);
  
  const { data: polls = [], isLoading: loadingPolls } = useQuery({
    queryKey: ['polls'],
    queryFn: () => base44.entities.Poll.list('-created_date')
  });
  
  const { data: votes = [], isLoading: loadingVotes } = useQuery({
    queryKey: ['votes'],
    queryFn: () => base44.entities.Vote.list('-created_date')
  });
  
  const createPoll = useMutation({
    mutationFn: (pollData) => base44.entities.Poll.create(pollData),
    onSuccess: () => {
      queryClient.invalidateQueries(['polls']);
      setPollTitle('');
      setPollDescription('');
      setPollEndDate('');
      setOptions([{ id: '1', label: '' }, { id: '2', label: '' }]);
      setActiveTab('manage');
    }
  });
  
  const updateVote = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vote.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['votes'])
  });
  
  const updatePoll = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Poll.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['polls'])
  });
  
  const deletePoll = useMutation({
    mutationFn: (id) => base44.entities.Poll.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['polls'])
  });
  
  const addOption = () => {
    setOptions([...options, { id: Date.now().toString(), label: '' }]);
  };
  
  const removeOption = (id) => {
    if (options.length > 2) {
      setOptions(options.filter(o => o.id !== id));
    }
  };
  
  const updateOption = (id, label) => {
    setOptions(options.map(o => o.id === id ? { ...o, label } : o));
  };
  
  const handleCreatePoll = () => {
    const validOptions = options.filter(o => o.label.trim());
    if (!pollTitle.trim() || validOptions.length < 2 || !franchiseId) return;

    // Calculate end date as 720 hours (30 days) from now
    const endDate = new Date();
    endDate.setHours(endDate.getHours() + 720);

    const postcodes = pollPostcodes.split(',').map(p => p.trim()).filter(p => p);

    createPoll.mutate({
      title: pollTitle.trim(),
      description: pollDescription.trim(),
      end_date: endDate.toISOString(),
      options: validOptions,
      franchise_id: franchiseId,
      poll_level: pollLevel,
      state: pollState || undefined,
      postcodes: postcodes.length > 0 ? postcodes : undefined,
      assigned_infomarians: [],
      status: 'active',
      moderation_status: 'pending'
    });
  };
  
  const handleSaveBankDetails = () => {
    // Save bank details (in real app, this would save to database)
    setBankSaved(true);
    setTimeout(() => setBankSaved(false), 3000);
  };

  const pendingVotes = votes.filter(v => v.status === 'pending');
  
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-8">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="pt-12 pb-12">
            <Settings className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-500">You don't have permission to access the admin panel.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <Link to={createPageUrl('Home')}>
          <Button variant="ghost" className="mb-6 text-slate-600 hover:text-slate-900 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Polls
          </Button>
        </Link>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Panel</h1>
          <p className="text-slate-500">Create polls and verify votes</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            <TabsTrigger 
              value="create" 
              className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Poll
            </TabsTrigger>
            <TabsTrigger 
              value="manage" 
              className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-6"
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Polls
            </TabsTrigger>
            <TabsTrigger 
              value="verify" 
              className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-6 relative"
            >
              <Vote className="w-4 h-4 mr-2" />
              Verify Votes
              {pendingVotes.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {pendingVotes.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="banking" 
              className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-6"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Banking
            </TabsTrigger>
          </TabsList>

          <div className="mb-4">
            <Link to={createPageUrl('FranchiseAdmin')}>
              <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                <Building2 className="w-4 h-4 mr-2" />
                Manage Franchises & Infomarians
              </Button>
            </Link>
          </div>
          
          {/* Create Poll Tab */}
          <TabsContent value="create">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Create New Poll</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Poll Question</Label>
                  <Input
                    id="title"
                    placeholder="What would you like to ask?"
                    value={pollTitle}
                    onChange={(e) => setPollTitle(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Add more context about this poll..."
                    value={pollDescription}
                    onChange={(e) => setPollDescription(e.target.value)}
                    className="rounded-xl min-h-[100px]"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="franchise">Franchise</Label>
                  <select
                    id="franchise"
                    value={franchiseId}
                    onChange={(e) => setFranchiseId(e.target.value)}
                    className="w-full h-12 px-3 rounded-xl border border-slate-200"
                  >
                    <option value="">Select Franchise</option>
                    {franchises.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.franchise_name} ({f.postcode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pollLevel">Poll Level</Label>
                  <select
                    id="pollLevel"
                    value={pollLevel}
                    onChange={(e) => setPollLevel(e.target.value)}
                    className="w-full h-12 px-3 rounded-xl border border-slate-200"
                  >
                    <option value="local">Local (Specific Postcodes)</option>
                    <option value="state">State</option>
                    <option value="federal">Federal</option>
                  </select>
                </div>

                {pollLevel === 'local' && (
                  <div className="space-y-2">
                    <Label htmlFor="pollPostcodes">Eligible Postcodes (comma-separated)</Label>
                    <Input
                      id="pollPostcodes"
                      value={pollPostcodes}
                      onChange={(e) => setPollPostcodes(e.target.value)}
                      placeholder="e.g., 2000, 2001, 2002"
                      className="h-12 rounded-xl"
                    />
                  </div>
                )}

                {pollLevel === 'state' && (
                  <div className="space-y-2">
                    <Label htmlFor="pollState">State/Territory</Label>
                    <Input
                      id="pollState"
                      value={pollState}
                      onChange={(e) => setPollState(e.target.value)}
                      placeholder="e.g., NSW"
                      className="h-12 rounded-xl"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="endDate">Duration</Label>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-sm text-slate-600">
                      Polls automatically close after <span className="font-semibold text-slate-900">720 hours (30 days)</span> from creation.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label>Voting Options</Label>
                  <p className="text-xs text-slate-500 -mt-1">
                    Drag the handle to reorder options. Text wraps automatically for longer option labels.
                  </p>
                  <VotingOptionsEditor
                    options={options}
                    onChange={setOptions}
                    onAdd={addOption}
                    onRemove={removeOption}
                    onUpdate={updateOption}
                  />
                </div>
                
                <Button
                  onClick={handleCreatePoll}
                  disabled={!pollTitle.trim() || options.filter(o => o.label.trim()).length < 2 || !franchiseId || createPoll.isPending}
                  className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-lg"
                >
                  {createPoll.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating Poll...
                    </>
                  ) : (
                    'Create Poll'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Manage Polls Tab */}
          <TabsContent value="manage">
            {loadingPolls ? (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : polls.length === 0 ? (
              <Card className="border-0 shadow-xl text-center">
                <CardContent className="pt-12 pb-12">
                  <p className="text-slate-500">No polls created yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {polls.map((poll) => {
                  const pollVotes = votes.filter(v => v.poll_id === poll.id);
                  const totalVotes = pollVotes.reduce((sum, vote) => sum + (vote.delegated_votes_count || 1), 0);
                  const verifiedVotes = pollVotes.filter(v => v.status === 'verified').reduce((sum, vote) => sum + (vote.delegated_votes_count || 1), 0);
                  return (
                    <Card key={poll.id} className="border-0 shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold text-slate-900">{poll.title}</h3>
                              <Badge className={`${
                                poll.status === 'active' 
                                  ? 'bg-emerald-50 text-emerald-700' 
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {poll.status}
                              </Badge>
                              {poll.moderation_status && (
                                <Badge className={`${
                                  poll.moderation_status === 'approved'
                                    ? 'bg-green-100 text-green-700'
                                    : poll.moderation_status === 'rejected'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {poll.moderation_status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                                  {poll.moderation_status === 'approved' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                  {poll.moderation_status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                                  {poll.moderation_status}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">
                              {totalVotes} total votes • {verifiedVotes} verified • {pollVotes.length} transactions
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Link to={createPageUrl(`Results`)}>
                              <Button variant="ghost" size="icon">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            {poll.moderation_status === 'pending' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                  disabled={updatePoll.isPending}
                                  onClick={() => updatePoll.mutate({
                                    id: poll.id,
                                    data: {
                                      moderation_status: 'approved',
                                      moderated_by: currentUser?.email,
                                      moderation_date: new Date().toISOString()
                                    }
                                  })}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-red-200 text-red-600 hover:bg-red-50"
                                  disabled={updatePoll.isPending}
                                  onClick={() => {
                                    const reason = prompt('Reason for rejection:');
                                    if (reason === null) return;
                                    updatePoll.mutate({
                                      id: poll.id,
                                      data: {
                                        moderation_status: 'rejected',
                                        moderated_by: currentUser?.email,
                                        moderation_date: new Date().toISOString(),
                                        moderation_reason: reason
                                      }
                                    });
                                  }}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updatePoll.mutate({
                                id: poll.id,
                                data: { status: poll.status === 'active' ? 'closed' : 'active' }
                              })}
                            >
                              {poll.status === 'active' ? 'Close' : 'Reopen'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm('Delete this poll?')) {
                                  deletePoll.mutate(poll.id);
                                }
                              }}
                              className="text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
          
          {/* Verify Votes Tab */}
          <TabsContent value="verify">
            {loadingVotes ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
              </div>
            ) : pendingVotes.length === 0 ? (
              <Card className="border-0 shadow-xl text-center">
                <CardContent className="pt-12 pb-12">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">All Caught Up!</h3>
                  <p className="text-slate-500">No pending votes to verify</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingVotes.map((vote) => {
                  const poll = polls.find(p => p.id === vote.poll_id);
                  return (
                    <Card key={vote.id} className="border-0 shadow-lg overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-start gap-6">
                          {/* Transaction Details */}
                          <div className="w-full md:w-64 bg-slate-50 rounded-xl p-4 flex-shrink-0 space-y-2 text-sm">
                            <div>
                              <p className="text-xs text-slate-500">Transaction Ref</p>
                              <p className="font-mono text-slate-900">{vote.transaction_reference || 'N/A'}</p>
                            </div>
                            {vote.transaction_amount && (
                              <div>
                                <p className="text-xs text-slate-500">Amount</p>
                                <p className="font-semibold text-slate-900">${vote.transaction_amount.toFixed(2)}</p>
                              </div>
                            )}
                            {vote.bank_name && (
                              <div>
                                <p className="text-xs text-slate-500">Bank</p>
                                <p className="text-slate-900">{vote.bank_name}</p>
                              </div>
                            )}
                            {vote.transaction_date && (
                              <div>
                                <p className="text-xs text-slate-500">Transaction Date</p>
                                <p className="text-slate-900">{format(new Date(vote.transaction_date), 'MMM d, h:mm a')}</p>
                              </div>
                            )}
                          </div>
                          
                          {/* Vote Details */}
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                              <span className="text-sm text-slate-400">
                                {format(new Date(vote.created_date), 'MMM d, yyyy h:mm a')}
                              </span>
                            </div>
                            
                            <div className="space-y-1">
                              <p className="text-sm text-slate-500">Poll</p>
                              <p className="font-medium text-slate-900">{poll?.title || 'Unknown Poll'}</p>
                            </div>
                            
                            <div className="space-y-1">
                              <p className="text-sm text-slate-500">Vote</p>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-indigo-600">{vote.option_label}</p>
                                <Badge variant="outline" className="text-xs">
                                  ID: {vote.poll_item_id}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-sm text-slate-500">Voter</p>
                                <p className="font-medium text-slate-900">{vote.voter_name || 'N/A'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm text-slate-500">Infomarian ID</p>
                                <p className="font-medium text-slate-900">{vote.infomarian_id || 'N/A'}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-sm text-slate-500">Delegation</p>
                                <Badge className={`${
                                  vote.delegation_status === 'delegated' 
                                    ? 'bg-purple-100 text-purple-700' 
                                    : 'bg-blue-100 text-blue-700'
                                } w-fit`}>
                                  {vote.delegation_status || 'direct'}
                                </Badge>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm text-slate-500">Delegated Votes</p>
                                <p className="font-semibold text-slate-900 text-lg">{vote.delegated_votes_count || 1}</p>
                              </div>
                            </div>
                            
                            {vote.transaction_description && (
                              <div className="space-y-1">
                                <p className="text-sm text-slate-500">Transaction Description</p>
                                <p className="text-xs font-mono text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                                  {vote.transaction_description}
                                </p>
                              </div>
                            )}
                            
                            {vote.payment_breakdown && (
                              <div className="space-y-1">
                                <p className="text-sm text-slate-500">Payment Breakdown ($0.55 per vote)</p>
                                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-xs space-y-1">
                                  <div className="flex justify-between">
                                    <span>Infomarian:</span>
                                    <span className="font-semibold">${vote.payment_breakdown.infomarian?.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Pollee Inc:</span>
                                    <span className="font-semibold">${vote.payment_breakdown.pollee_incorporated?.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Local Franchise:</span>
                                    <span className="font-semibold">${vote.payment_breakdown.local_franchise?.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-emerald-300 pt-1">
                                    <span>GST:</span>
                                    <span className="font-semibold">${vote.payment_breakdown.gst?.toFixed(2)}</span>
                                  </div>
                                  {vote.transaction_amount && vote.transaction_amount > 0.55 && (
                                    <div className="flex justify-between border-t border-emerald-300 pt-1 mt-1">
                                      <span className="font-bold text-emerald-700">Tip to Infomarian:</span>
                                      <span className="font-bold text-emerald-700">
                                        ${(vote.transaction_amount - 0.55).toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-3 pt-4">
                              <Button
                                onClick={async () => {
                                  const tipAmount = Math.max(0, (vote.transaction_amount || 0.55) - 0.55);
                                  updateVote.mutate({ 
                                    id: vote.id, 
                                    data: { 
                                      status: 'verified',
                                      tip_amount: tipAmount
                                    } 
                                  });
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700"
                                disabled={updateVote.isPending}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Verify
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => updateVote.mutate({ id: vote.id, data: { status: 'rejected' } })}
                                className="border-red-200 text-red-600 hover:bg-red-50"
                                disabled={updateVote.isPending}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Banking Tab */}
          <TabsContent value="banking">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Bank Account Configuration</CardTitle>
                <p className="text-sm text-slate-500 mt-2">
                  Configure Pollee Inc bank account and vote destination accounts
                </p>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Pollee Inc Account */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold text-slate-900">
                      Pollee Inc Account (For 55c Validation Deposits)
                    </h3>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      New users must make a 55c deposit to this account to validate their registration.
                    </p>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pollee_bsb">BSB</Label>
                      <Input
                        id="pollee_bsb"
                        value={bankDetails.pollee_bsb}
                        onChange={(e) => setBankDetails({...bankDetails, pollee_bsb: e.target.value})}
                        placeholder="123-456"
                        className="h-11 rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pollee_account">Account Name</Label>
                      <Input
                        id="pollee_account"
                        value={bankDetails.pollee_account}
                        onChange={(e) => setBankDetails({...bankDetails, pollee_account: e.target.value})}
                        placeholder="Pollee Inc"
                        className="h-11 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Vote Destination Accounts */}
                <div className="space-y-4 pt-6 border-t border-slate-200">
                  <div className="flex items-center gap-2 mb-4">
                    <Vote className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-lg font-semibold text-slate-900">
                      Vote Destination Accounts
                    </h3>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">
                    Vote transactions will be directed to these account numbers based on the vote option
                  </p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="yes_account" className="text-base">
                        "Yes" Account Number
                      </Label>
                      <Input
                        id="yes_account"
                        value={bankDetails.yes_account}
                        onChange={(e) => setBankDetails({...bankDetails, yes_account: e.target.value})}
                        placeholder="11111111"
                        className="h-11 rounded-lg"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="no_account" className="text-base">
                        "No" Account Number
                      </Label>
                      <Input
                        id="no_account"
                        value={bankDetails.no_account}
                        onChange={(e) => setBankDetails({...bankDetails, no_account: e.target.value})}
                        placeholder="22222222"
                        className="h-11 rounded-lg"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="undecided_account" className="text-base">
                        "Undecided" Account Number
                      </Label>
                      <Input
                        id="undecided_account"
                        value={bankDetails.undecided_account}
                        onChange={(e) => setBankDetails({...bankDetails, undecided_account: e.target.value})}
                        placeholder="33333333"
                        className="h-11 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {bankSaved && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <p className="text-sm text-emerald-800 font-medium">
                      Bank details saved successfully!
                    </p>
                  </motion.div>
                )}

                <Button
                  onClick={handleSaveBankDetails}
                  className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-lg"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Save Bank Details
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}