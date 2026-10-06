import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Plus, Trash2, Loader2, Calculator, Lock, Info, CheckCircle2, AlertCircle, Search, Users,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

const SUPERADMIN = 'ac@acproductiondesign.com';
const ELEVATED = ['infomarian', 'admin', 'master_franchiser', 'franchise_manager'];

function HelpNote({ children }) {
  return (
    <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
      <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
      <span>{children}</span>
    </div>
  );
}

function LineRow({ line, canEdit, canManage, busy, onCommit, onRemove }) {
  const [label, setLabel] = useState(line.label || '');
  const [cost, setCost] = useState(line.cost ?? '');
  const [ci, setCi] = useState(line.ci ?? '');

  const locked = !!line.locked;
  const costSet = typeof line.cost === 'number' && line.cost > 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Input
          value={label}
          placeholder="Budget line label"
          disabled={locked || busy}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => label !== line.label && !locked && onCommit({ label })}
          className="flex-1"
        />
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-red-500 flex-shrink-0"
          disabled={locked || busy}
          onClick={onRemove}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-slate-500">Figure ($)</Label>
          <div className="relative">
            <Input
              type="number"
              min="0"
              value={cost}
              placeholder="0"
              disabled={!canEdit || busy || locked}
              onChange={(e) => setCost(e.target.value)}
              onBlur={() => {
                const n = cost === '' ? null : Number(cost);
                if (n !== line.cost) onCommit({ cost: n });
              }}
              className={!canEdit || locked ? 'bg-slate-50' : ''}
            />
            {(!canEdit || locked) && (
              <Lock className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
            )}
          </div>
        </div>
        <div>
          <Label className="text-xs text-slate-500">CI ±%</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={ci}
            placeholder="0"
            disabled={!canEdit || busy || locked}
            onChange={(e) => setCi(e.target.value)}
            onBlur={() => {
              const n = ci === '' ? null : Number(ci);
              if (n !== line.ci) onCommit({ ci: n });
            }}
            className={!canEdit || locked ? 'bg-slate-50' : ''}
          />
        </div>
      </div>
      {/* Lock toggle — Infomarian or above only */}
      <div className="flex items-center justify-between pt-1">
        <Switch
          checked={locked}
          disabled={!canManage || busy || !costSet}
          onCheckedChange={(v) => onCommit({ locked: v })}
        />
        <span className="text-xs text-slate-500">
          {locked ? 'Figure locked' : canManage ? (costSet ? 'Lock figure (Infomarian)' : 'Enter a figure to lock') : 'Locking is Infomarian-only'}
        </span>
      </div>
      {costSet ? (
        <p className="text-xs text-emerald-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Entered by {line.entered_by_name || 'an editor'}
          {line.entered_at && ` • ${format(new Date(line.entered_at), 'd MMM yyyy')}`}
        </p>
      ) : (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {canEdit ? 'No figure yet — enter a dollar amount to cost this line.' : 'Awaiting a figure from an Infomarian or a nominated editor.'}
        </p>
      )}
    </div>
  );
}

export default function BudgetPanel({ poll, open, onOpenChange }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [envInput, setEnvInput] = useState('');
  const [editingEnvelope, setEditingEnvelope] = useState(false);
  const [editorQuery, setEditorQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const editorBoxRef = useRef(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: infomarian } = useQuery({
    queryKey: ['myInfomarian'],
    queryFn: async () => {
      if (!user?.email) return null;
      const list = await base44.entities.Infomarian.list();
      return list.find((i) => i.user_email === user.email) || null;
    },
    enabled: !!user?.email,
  });
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-for-budget-editors'],
    queryFn: () => base44.entities.User.list(),
  });

  const canManage =
    user?.email === SUPERADMIN || ELEVATED.includes(user?.user_role) || user?.role === 'admin' || !!infomarian;

  const editors = Array.isArray(poll?.budget_editors) ? poll.budget_editors : [];
  const isEditor = editors.some((e) => (e.email && e.email === user?.email) || (e.user_id && e.user_id === user?.id));
  const canEdit = canManage || isEditor;

  const lines = Array.isArray(poll?.budget_lines) ? poll.budget_lines : [];
  const enabled = poll?.budget_enabled !== false;
  const status = poll?.budget_status || 'draft';
  const allCosted = lines.length > 0 && lines.every((l) => typeof l.cost === 'number' && l.cost > 0);
  const total = lines.reduce((a, l) => a + (typeof l.cost === 'number' ? l.cost : 0), 0);

  const editorMatches = useMemo(() => {
    const q = editorQuery.trim().toLowerCase();
    if (!q) return [];
    return allUsers
      .filter((u) => u.id !== user?.id)
      .map((u) => {
        const full = `${u.full_name || ''} ${u.last_name || ''}`.trim();
        return { id: u.id, full: full || u.email, email: u.email || '' };
      })
      .filter((u) => u.full.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .slice(0, 6);
  }, [allUsers, editorQuery, user?.id]);

  // Close the editor search dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (editorBoxRef.current && !editorBoxRef.current.contains(e.target)) setEditorOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const call = async (payload, successMsg) => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('manage-poll-budget', payload);
      if (res?.data?.error) throw new Error(res.data.error);
      if (successMsg) toast({ title: successMsg });
      queryClient.invalidateQueries({ queryKey: ['polls'] });
      queryClient.invalidateQueries({ queryKey: ['assignedPolls'] });
      queryClient.invalidateQueries({ queryKey: ['activeBudgets'] });
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Action failed';
      toast({ variant: 'destructive', title: 'Budget', description: msg });
    } finally {
      setBusy(false);
    }
  };

  const addLine = () => {
    const label = newLabel.trim();
    if (!label) return;
    call({ action: 'addLine', pollId: poll.id, label }, 'Line added').then(() => setNewLabel(''));
  };

  const envelopeSet = poll?.budget_envelope_set === true;
  const envelope = poll?.budget_envelope;

  const setEnvelope = () => {
    const n = envInput === '' ? null : Number(envInput);
    if (n === null || !Number.isFinite(n) || n < 0) {
      toast({ variant: 'destructive', title: 'Envelope', description: 'Enter a non-negative dollar amount.' });
      return;
    }
    call({ action: 'setEnvelope', pollId: poll.id, envelope: n }, 'Envelope set as legislative limit')
      .then(() => { setEnvInput(''); setEditingEnvelope(false); });
  };

  const skipEnvelope = () => {
    call({ action: 'setEnvelope', pollId: poll.id, skipped: true }, 'Envelope will be derived from line totals')
      .then(() => setEditingEnvelope(false));
  };

  const saveEditors = (next) =>
    call({ action: 'setEditors', pollId: poll.id, editors: next }, 'Editors updated');

  const addEditor = (m) => {
    if (editors.some((e) => (e.user_id && e.user_id === m.id) || (e.email && e.email === m.email))) return;
    saveEditors([...editors, { user_id: m.id, email: m.email, name: m.full }]);
    setEditorQuery('');
    setEditorOpen(false);
  };

  const removeEditor = (ed) => {
    saveEditors(editors.filter((e) => (ed.user_id ? e.user_id !== ed.user_id : e.email !== ed.email)));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-600" />
            Budget
          </SheetTitle>
          <SheetDescription className="text-slate-600">
            {poll?.title}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {/* Status badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              className={
                status === 'finalised'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }
            >
              {status === 'finalised' ? 'Finalised' : 'Draft'}
            </Badge>
            {enabled ? (
              <Badge variant="outline" className="text-emerald-700 border-emerald-200">Budget engine on</Badge>
            ) : (
              <Badge variant="outline" className="text-slate-500">Budget engine off</Badge>
            )}
            {isEditor && !canManage && (
              <Badge variant="outline" className="text-indigo-700 border-indigo-200">Shared editor</Badge>
            )}
          </div>

          {/* Toggle */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Budget engine</Label>
              <Switch
                checked={enabled}
                disabled={!canManage || busy}
                onCheckedChange={(v) => call({ action: 'toggle', pollId: poll.id, enabled: v }, v ? 'Budget engine attached' : 'Budget engine switched off')}
              />
            </div>
            <HelpNote>
              Attached to every new proposal by default. Switch it off for a plain (non-budgetary) poll.
              {!canManage && ' Only an Infomarian or above can switch this.'}
            </HelpNote>
          </div>

          {enabled ? (
            <>
              {/* Envelope — prompted first; optional (legislative limit or derived from line totals) */}
              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Envelope</Label>
                  {envelopeSet && !editingEnvelope && (
                    <Button variant="ghost" size="sm" onClick={() => { setEditingEnvelope(true); setEnvInput(envelope != null ? String(envelope) : ''); }} disabled={busy || !canManage}>
                      Edit
                    </Button>
                  )}
                </div>
                {!envelopeSet || editingEnvelope ? (
                  <>
                    <HelpNote>
                      Set the audited envelope as a legislative limit, or skip to derive it from the sum of all
                      budget line totals. This step is optional.
                      {!canManage && ' Only an Infomarian or above can set the envelope.'}
                    </HelpNote>
                    <Input
                      type="number"
                      min="0"
                      value={envInput}
                      placeholder="Legislative limit ($)"
                      disabled={busy || !canManage}
                      onChange={(e) => setEnvInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && envInput !== '' && setEnvelope()}
                    />
                    <div className="flex gap-2">
                      <Button onClick={setEnvelope} disabled={busy || !canManage || envInput === ''}>
                        Set as legislative limit
                      </Button>
                      <Button variant="outline" onClick={skipEnvelope} disabled={busy || !canManage}>
                        Skip — derive from totals
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-sm">
                    {envelope != null ? (
                      <span className="text-slate-900">
                        Legislative limit: <strong>${envelope.toLocaleString()}</strong>
                        {total > envelope && (
                          <span className="ml-2 text-red-600 text-xs">Line totals exceed the limit</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        Derived from line totals: <strong className="text-slate-900">${total.toLocaleString()}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Shared with — collaborative editing */}
              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    Shared with
                  </Label>
                  <Badge variant="outline">{editors.length} editor{editors.length === 1 ? '' : 's'}</Badge>
                </div>
                <HelpNote>
                  Nominate members to co-edit this budget. Nominated editors can enter figures on budget lines;
                  locking, the envelope, and finalising stay restricted to an Infomarian or above.
                </HelpNote>
                <div className="space-y-2">
                  {editors.map((ed) => (
                    <div key={ed.user_id || ed.email} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{ed.name || ed.email}</p>
                        {ed.name && ed.email && <p className="text-xs text-slate-500 truncate">{ed.email}</p>}
                      </div>
                      {canManage && (
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 flex-shrink-0" disabled={busy} onClick={() => removeEditor(ed)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {editors.length === 0 && <p className="text-sm text-slate-500">Not shared yet — only Infomarians can edit.</p>}
                </div>
                {canManage && (
                  <div className="space-y-2" ref={editorBoxRef}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        value={editorQuery}
                        placeholder="Search members by name or email"
                        onChange={(e) => { setEditorQuery(e.target.value); setEditorOpen(true); }}
                        onFocus={() => setEditorOpen(true)}
                        className="pl-9"
                        autoComplete="off"
                      />
                    </div>
                    {editorOpen && editorQuery.trim() && (
                      <div className="relative z-20">
                        {editorMatches.length > 0 ? (
                          <div className="absolute top-0 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                            {editorMatches.map((m) => (
                              <button
                                type="button"
                                key={m.id}
                                onClick={() => addEditor(m)}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b last:border-0"
                              >
                                <p className="text-sm font-medium text-slate-900 truncate">{m.full}</p>
                                <p className="text-xs text-slate-500 truncate">{m.email}</p>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="absolute top-0 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm text-slate-500">
                            No matching members
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Budget lines</Label>
                  <span className="text-sm font-semibold text-slate-900">
                    Total: ${total.toLocaleString()}
                  </span>
                </div>
                <HelpNote>
                  Add a line for each item the proposal spends on. The budget finalises only when every line
                  carries a figure entered by an Infomarian or above, or a nominated editor.
                </HelpNote>

                <div className="space-y-2">
                  {lines.map((line) => (
                    <LineRow
                      key={line.id}
                      line={line}
                      canEdit={canEdit}
                      canManage={canManage}
                      busy={busy}
                      onCommit={(patch) => call({ action: 'updateLine', pollId: poll.id, lineId: line.id, ...patch }, 'Line updated')}
                      onRemove={() => call({ action: 'removeLine', pollId: poll.id, lineId: line.id }, 'Line removed')}
                    />
                  ))}
                  {lines.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-6">No budget lines yet.</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={newLabel}
                    placeholder="New line label"
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addLine()}
                  />
                  <Button variant="outline" onClick={addLine} disabled={busy || !newLabel.trim()}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Finalise */}
              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <Button
                  className="w-full"
                  disabled={!canManage || busy || !allCosted || status === 'finalised'}
                  onClick={() => call({ action: 'finalise', pollId: poll.id }, 'Budget finalised')}
                >
                  {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  {status === 'finalised' ? 'Finalised' : 'Finalise budget'}
                </Button>
                <HelpNote>
                  {status === 'finalised'
                    ? 'This budget is finalised. Editing any line reverts it to draft so a figure can be corrected.'
                    : canManage
                      ? 'Enabled once every line has a dollar figure. Only an Infomarian or above can finalise.'
                      : 'Awaiting figures on every line. Finalising is restricted to an Infomarian or above.'}
                </HelpNote>
              </div>
            </>
          ) : (
            <HelpNote>
              The budget engine is switched off for this proposal, so it is a plain poll with no budget lines.
            </HelpNote>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}