import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Send, FileText, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import EvidenceManager from '@/components/polls/EvidenceManager';
import EvidenceDisplay from '@/components/polls/EvidenceDisplay';
import { useTranslation } from 'react-i18next';

export default function CreatePollPanel({ infomarian, user }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editingPoll, setEditingPoll] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState([{ id: '1', label: '' }, { id: '2', label: '' }]);
  const [pollLevel, setPollLevel] = useState('local');
  const [pollState, setPollState] = useState('');
  const [postcodes, setPostcodes] = useState('');

  const franchiseId = infomarian?.franchise_id;

  const { data: allPolls = [] } = useQuery({
    queryKey: ['polls'],
    queryFn: () => base44.entities.Poll.list('-created_date'),
  });

  // Draft and pending polls created by this user
  const myPolls = allPolls.filter(
    (p) => p.created_by_id === user?.id && (p.moderation_status === 'draft' || p.moderation_status === 'pending')
  );
  const myDrafts = myPolls.filter((p) => p.moderation_status === 'draft');
  const myPending = myPolls.filter((p) => p.moderation_status === 'pending');

  const createPoll = useMutation({
    mutationFn: (data) => base44.entities.Poll.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['polls']);
      resetForm();
      setShowForm(false);
    },
  });

  const updatePoll = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Poll.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['polls']);
      resetForm();
      setEditingPoll(null);
      setShowForm(false);
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setOptions([{ id: '1', label: '' }, { id: '2', label: '' }]);
    setPollLevel('local');
    setPollState('');
    setPostcodes('');
  };

  const startNewPoll = () => {
    resetForm();
    setEditingPoll(null);
    setShowForm(true);
  };

  const startEditDraft = (poll) => {
    setTitle(poll.title || '');
    setDescription(poll.description || '');
    setOptions(poll.options?.length >= 2 ? poll.options : [{ id: '1', label: '' }, { id: '2', label: '' }]);
    setPollLevel(poll.poll_level || 'local');
    setPollState(poll.state || '');
    setPostcodes((poll.postcodes || []).join(', '));
    setEditingPoll(poll);
    setShowForm(true);
  };

  const addOption = () => {
    if (options.length >= 2) return;
    setOptions([...options, { id: Date.now().toString(), label: '' }]);
  };

  const removeOption = (id) => {
    if (options.length > 2) setOptions(options.filter((o) => o.id !== id));
  };

  const updateOption = (id, label) => {
    setOptions(options.map((o) => (o.id === id ? { ...o, label } : o)));
  };

  const buildPollData = (status) => {
    const validOptions = options.filter((o) => o.label.trim()).slice(0, 2);
    const optionsWithRts = [...validOptions, { id: 'rts', label: 'RTS' }];
    const endDate = new Date();
    endDate.setHours(endDate.getHours() + 720);
    const postcodeArr = postcodes.split(',').map((p) => p.trim()).filter(Boolean);
    return {
      title: title.trim(),
      description: description.trim(),
      end_date: endDate.toISOString(),
      options: optionsWithRts,
      franchise_id: franchiseId,
      poll_level: pollLevel,
      state: pollState || undefined,
      postcodes: postcodeArr.length > 0 ? postcodeArr : undefined,
      assigned_infomarians: [],
      status: 'active',
      moderation_status: status,
      budget_enabled: true,
      budget_status: 'draft',
    };
  };

  const handleSaveDraft = () => {
    if (!title.trim() || !franchiseId) return;
    if (editingPoll) {
      updatePoll.mutate({ id: editingPoll.id, data: buildPollData('draft') });
    } else {
      createPoll.mutate(buildPollData('draft'));
    }
  };

  const handlePublish = () => {
    const validOptions = options.filter((o) => o.label.trim());
    if (!title.trim() || validOptions.length < 2 || !franchiseId) return;
    if (editingPoll) {
      updatePoll.mutate({ id: editingPoll.id, data: buildPollData('pending') });
    } else {
      createPoll.mutate(buildPollData('pending'));
    }
  };

  const publishExistingDraft = (poll) => {
    updatePoll.mutate({ id: poll.id, data: { moderation_status: 'pending' } });
  };

  if (!franchiseId) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="pt-12 pb-12 text-center">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            {t('createPoll.noFranchise', { defaultValue: 'No constituency assigned' })}
          </h2>
          <p className="text-slate-500">
            {t('createPoll.noFranchiseDesc', { defaultValue: 'You need to be assigned to a constituency before creating polls.' })}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (showForm) {
    const validOptions = options.filter((o) => o.label.trim());
    const canSaveDraft = title.trim() && franchiseId;
    const canPublish = title.trim() && validOptions.length >= 2 && franchiseId;

    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {editingPoll
                ? t('createPoll.editDraft', { defaultValue: 'Edit Draft Poll' })
                : t('createPoll.newPoll', { defaultValue: 'Create New Poll' })}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditingPoll(null); resetForm(); }}>
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label>{t('admin.pollQuestion', { defaultValue: 'Poll Question' })}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('admin.pollQuestionPlaceholder', { defaultValue: 'What would you like to ask?' })} className="mt-1" />
          </div>

          <div>
            <Label>{t('admin.description', { defaultValue: 'Description (optional)' })}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('admin.descriptionPlaceholder', { defaultValue: 'Add more context about this poll...' })} className="mt-1" rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('admin.pollLevel', { defaultValue: 'Poll Level' })}</Label>
              <select
                value={pollLevel}
                onChange={(e) => setPollLevel(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-md border border-slate-200 bg-background text-foreground"
              >
                <option value="local">{t('admin.localLevel', { defaultValue: 'Local' })}</option>
                <option value="state">{t('admin.stateLevel', { defaultValue: 'State' })}</option>
                <option value="federal">{t('admin.federalLevel', { defaultValue: 'Federal' })}</option>
              </select>
            </div>
            <div>
              <Label>{t('admin.stateTerritory', { defaultValue: 'State/Territory' })}</Label>
              <Input value={pollState} onChange={(e) => setPollState(e.target.value)} placeholder="e.g., NSW" className="mt-1" />
            </div>
          </div>

          {pollLevel === 'local' && (
            <div>
              <Label>{t('admin.eligiblePostcodes', { defaultValue: 'Eligible Postcodes (comma-separated)' })}</Label>
              <Input value={postcodes} onChange={(e) => setPostcodes(e.target.value)} placeholder="e.g., 2000, 2001, 2002" className="mt-1" />
            </div>
          )}

          <div>
            <Label>{t('admin.votingOptions', { defaultValue: 'Voting Options' })}</Label>
            <p className="text-xs text-slate-500 mb-2">{t('admin.votingOptionsHint', { defaultValue: 'Maximum 2 options. RTS is added automatically.' })}</p>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <Input
                    value={opt.label}
                    onChange={(e) => updateOption(opt.id, e.target.value)}
                    placeholder={`${t('votingOptionsEditor.option', { defaultValue: 'Option' })} ${i + 1}`}
                  />
                  {options.length > 2 && (
                    <Button variant="ghost" size="icon" onClick={() => removeOption(opt.id)}>
                      <Trash2 className="w-4 h-4 text-slate-400" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 2 && (
              <Button variant="outline" size="sm" className="mt-2" onClick={addOption}>
                <Plus className="w-4 h-4 mr-1" /> {t('votingOptionsEditor.addOption', { defaultValue: 'Add Option' })}
              </Button>
            )}
          </div>

          {/* Evidence section — only for existing drafts */}
          {editingPoll && editingPoll.moderation_status === 'draft' && (
            <div className="pt-4 border-t border-slate-100">
              <Label className="mb-2 block">{t('evidence.supportingEvidence', { defaultValue: 'Supporting Evidence' })}</Label>
              <EvidenceDisplay pollId={editingPoll.id} canManage />
              <div className="mt-2">
                <EvidenceManager pollId={editingPoll.id} infomarian={infomarian} />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={handleSaveDraft} disabled={!canSaveDraft || createPoll.isPending || updatePoll.isPending}>
              <FileText className="w-4 h-4 mr-2" />
              {t('createPoll.saveDraft', { defaultValue: 'Save as Draft' })}
            </Button>
            <Button onClick={handlePublish} disabled={!canPublish || createPoll.isPending || updatePoll.isPending}
              className="bg-indigo-600 hover:bg-indigo-700">
              <Send className="w-4 h-4 mr-2" />
              {t('createPoll.publish', { defaultValue: 'Publish for Review' })}
            </Button>
            {(createPoll.isPending || updatePoll.isPending) && (
              <span className="text-sm text-slate-500">{t('common.loading', { defaultValue: 'Loading...' })}</span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Drafts */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" />
              {t('createPoll.myDrafts', { defaultValue: 'My Draft Polls' })}
              <Badge className="bg-amber-100 text-amber-700">{myDrafts.length}</Badge>
            </CardTitle>
            <Button size="sm" onClick={startNewPoll} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-1" /> {t('createPoll.newPoll', { defaultValue: 'New Poll' })}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {myDrafts.length === 0 ? (
            <p className="text-center py-8 text-slate-500">
              {t('createPoll.noDrafts', { defaultValue: 'No draft polls. Click "New Poll" to start creating one.' })}
            </p>
          ) : (
            <div className="space-y-3">
              {myDrafts.map((poll) => (
                <div key={poll.id} className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-100">
                  <div>
                    <p className="font-semibold text-slate-900">{poll.title}</p>
                    <p className="text-sm text-slate-500">
                      {poll.options?.length || 0} {t('createPoll.options', { defaultValue: 'options' })} • {poll.poll_level}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => startEditDraft(poll)}>
                      {t('common.edit', { defaultValue: 'Edit' })}
                    </Button>
                    <Button size="sm" onClick={() => publishExistingDraft(poll)} className="bg-indigo-600 hover:bg-indigo-700"
                      disabled={updatePoll.isPending}>
                      <Send className="w-3 h-3 mr-1" /> {t('createPoll.publish', { defaultValue: 'Publish' })}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending — published, awaiting moderator approval */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            {t('createPoll.pendingReview', { defaultValue: 'Pending Moderator Review' })}
            <Badge className="bg-blue-100 text-blue-700">{myPending.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myPending.length === 0 ? (
            <p className="text-center py-8 text-slate-500">
              {t('createPoll.noPending', { defaultValue: 'No polls awaiting review.' })}
            </p>
          ) : (
            <div className="space-y-3">
              {myPending.map((poll) => (
                <div key={poll.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div>
                    <p className="font-semibold text-slate-900">{poll.title}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {t('createPoll.awaitingApproval', { defaultValue: 'Awaiting moderator approval' })}
                    </p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">{t('common.pending', { defaultValue: 'Pending' })}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}