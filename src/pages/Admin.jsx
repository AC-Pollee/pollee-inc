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
  Clock, ExternalLink, Settings, Vote, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export default function Admin() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('create');
  
  // Create Poll State
  const [pollTitle, setPollTitle] = useState('');
  const [pollDescription, setPollDescription] = useState('');
  const [pollEndDate, setPollEndDate] = useState('');
  const [options, setOptions] = useState([{ id: '1', label: '' }, { id: '2', label: '' }]);
  
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
    if (!pollTitle.trim() || validOptions.length < 2) return;
    
    createPoll.mutate({
      title: pollTitle.trim(),
      description: pollDescription.trim(),
      end_date: pollEndDate || null,
      options: validOptions,
      status: 'active'
    });
  };
  
  const pendingVotes = votes.filter(v => v.status === 'pending');
  
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
          </TabsList>
          
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
                  <Label htmlFor="endDate">End Date (optional)</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={pollEndDate}
                    onChange={(e) => setPollEndDate(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label>Voting Options</Label>
                  <AnimatePresence>
                    {options.map((option, index) => (
                      <motion.div
                        key={option.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-3"
                      >
                        <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-medium text-indigo-600">
                          {index + 1}
                        </span>
                        <Input
                          placeholder={`Option ${index + 1}`}
                          value={option.label}
                          onChange={(e) => updateOption(option.id, e.target.value)}
                          className="flex-1 h-12 rounded-xl"
                        />
                        {options.length > 2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOption(option.id)}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  <Button
                    variant="outline"
                    onClick={addOption}
                    className="w-full h-12 rounded-xl border-dashed"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Option
                  </Button>
                </div>
                
                <Button
                  onClick={handleCreatePoll}
                  disabled={!pollTitle.trim() || options.filter(o => o.label.trim()).length < 2 || createPoll.isPending}
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
                            </div>
                            <p className="text-sm text-slate-500">
                              {pollVotes.length} total votes • {pollVotes.filter(v => v.status === 'verified').length} verified
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Link to={createPageUrl(`Results`)}>
                              <Button variant="ghost" size="icon">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
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
                          {/* Transaction Preview */}
                          <div className="w-full md:w-48 h-48 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                            {vote.transaction_file_url && (
                              vote.transaction_file_url.toLowerCase().endsWith('.pdf') ? (
                                <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                  <div className="text-center">
                                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-2">
                                      <ExternalLink className="w-6 h-6 text-slate-500" />
                                    </div>
                                    <a 
                                      href={vote.transaction_file_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-sm text-indigo-600 hover:underline"
                                    >
                                      View PDF
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                <a href={vote.transaction_file_url} target="_blank" rel="noopener noreferrer">
                                  <img 
                                    src={vote.transaction_file_url} 
                                    alt="Transaction" 
                                    className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                  />
                                </a>
                              )
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
                              <p className="font-semibold text-indigo-600">{vote.option_label}</p>
                            </div>
                            
                            {vote.voter_name && (
                              <div className="space-y-1">
                                <p className="text-sm text-slate-500">Voter</p>
                                <p className="font-medium text-slate-900">{vote.voter_name}</p>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-3 pt-4">
                              <Button
                                onClick={() => updateVote.mutate({ id: vote.id, data: { status: 'verified' } })}
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
        </Tabs>
      </div>
    </div>
  );
}