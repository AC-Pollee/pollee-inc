import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Trash2, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DelegationManager({ user }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    delegate_full_name: '',
    delegate_user_id: '',
    delegation_type: 'open',
    poll_id: ''
  });

  const { data: delegations = [] } = useQuery({
    queryKey: ['delegations', user?.id],
    queryFn: () => base44.entities.Delegation.filter({ delegator_user_id: user.id }),
    enabled: !!user?.id
  });

  const { data: receivedDelegations = [] } = useQuery({
    queryKey: ['received-delegations', user?.id],
    queryFn: () => base44.entities.Delegation.filter({ delegate_user_id: user.id }),
    enabled: !!user?.id
  });

  const { data: polls = [] } = useQuery({
    queryKey: ['polls-active'],
    queryFn: () => base44.entities.Poll.filter({ status: 'active' })
  });

  const createDelegation = useMutation({
    mutationFn: (data) => base44.entities.Delegation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['delegations']);
      setShowForm(false);
      setFormData({ delegate_full_name: '', delegate_user_id: '', delegation_type: 'open', poll_id: '' });
    }
  });

  const updateDelegation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Delegation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['delegations']);
      queryClient.invalidateQueries(['received-delegations']);
    }
  });

  const deleteDelegation = useMutation({
    mutationFn: (id) => base44.entities.Delegation.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['delegations'])
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createDelegation.mutate({
      delegator_user_id: user.id,
      delegator_full_name: `${user.full_name} ${user.last_name || ''}`.trim(),
      delegate_user_id: formData.delegate_user_id,
      delegate_full_name: formData.delegate_full_name,
      delegation_type: formData.delegation_type,
      poll_id: formData.delegation_type === 'specific_poll' ? formData.poll_id : null,
      status: 'pending'
    });
  };

  const statusConfig = {
    pending: { icon: Clock, color: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Pending' },
    verified: { icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Verified' },
    revoked: { icon: XCircle, color: 'bg-red-50 text-red-700 border-red-200', label: 'Revoked' }
  };

  return (
    <div className="space-y-6">
      {/* My Delegations */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <CardTitle>My Delegations</CardTitle>
            </div>
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Delegation
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <AnimatePresence>
            {showForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSubmit}
                className="bg-slate-50 rounded-lg p-4 space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="delegate_full_name">Delegate Full Name</Label>
                  <Input
                    id="delegate_full_name"
                    value={formData.delegate_full_name}
                    onChange={(e) => setFormData({...formData, delegate_full_name: e.target.value})}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delegate_user_id">Delegate User ID</Label>
                  <Input
                    id="delegate_user_id"
                    value={formData.delegate_user_id}
                    onChange={(e) => setFormData({...formData, delegate_user_id: e.target.value})}
                    placeholder="Enter user ID"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delegation_type">Delegation Type</Label>
                  <Select
                    value={formData.delegation_type}
                    onValueChange={(value) => setFormData({...formData, delegation_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open (All Polls)</SelectItem>
                      <SelectItem value="specific_poll">Specific Poll Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.delegation_type === 'specific_poll' && (
                  <div className="space-y-2">
                    <Label htmlFor="poll_id">Select Poll</Label>
                    <Select
                      value={formData.poll_id}
                      onValueChange={(value) => setFormData({...formData, poll_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a poll" />
                      </SelectTrigger>
                      <SelectContent>
                        {polls.map(poll => (
                          <SelectItem key={poll.id} value={poll.id}>{poll.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={createDelegation.isPending}>
                    Create Delegation
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {delegations.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No delegations created yet</p>
          ) : (
            <div className="space-y-3">
              {delegations.map(delegation => {
                const config = statusConfig[delegation.status];
                const Icon = config.icon;
                const poll = polls.find(p => p.id === delegation.poll_id);
                
                return (
                  <div key={delegation.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{delegation.delegate_full_name}</p>
                          <Badge className={config.color + ' border'}>
                            <Icon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">User ID: {delegation.delegate_user_id}</p>
                        <Badge variant="outline">
                          {delegation.delegation_type === 'open' 
                            ? 'Open - All Polls' 
                            : `Specific Poll: ${poll?.title || delegation.poll_id}`}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Delete this delegation?')) {
                            deleteDelegation.mutate(delegation.id);
                          }
                        }}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delegations to Verify */}
      {receivedDelegations.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Delegations to Verify</CardTitle>
            <p className="text-sm text-slate-500">People who want to delegate their vote to you</p>
          </CardHeader>

          <CardContent className="space-y-3">
            {receivedDelegations.map(delegation => {
              const config = statusConfig[delegation.status];
              const Icon = config.icon;
              const poll = polls.find(p => p.id === delegation.poll_id);
              
              return (
                <div key={delegation.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{delegation.delegator_full_name}</p>
                          <Badge className={config.color + ' border'}>
                            <Icon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">User ID: {delegation.delegator_user_id}</p>
                        <Badge variant="outline">
                          {delegation.delegation_type === 'open' 
                            ? 'Open - All Polls' 
                            : `Specific Poll: ${poll?.title || delegation.poll_id}`}
                        </Badge>
                      </div>
                    </div>

                    {delegation.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateDelegation.mutate({
                            id: delegation.id,
                            data: { status: 'verified', verified_date: new Date().toISOString() }
                          })}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateDelegation.mutate({
                            id: delegation.id,
                            data: { status: 'revoked' }
                          })}
                          className="border-red-200 text-red-600"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}