import React, { useState } from 'react';
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
  Plus, Trash2, Loader2, Calculator, Lock, Info, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

const SUPERADMIN = 'ac@acproductiondesign.com';
const ELEVATED = ['infomarian', 'master_franchiser', 'franchise_manager'];

function HelpNote({ children }) {
  return (
    <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
      <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
      <span>{children}</span>
    </div>
  );
}

function LineRow({ line, canBudget, busy, onCommit, onRemove }) {
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
              disabled={!canBudget || busy || locked}
              onChange={(e) => setCost(e.target.value)}
              onBlur={() => {
                const n = cost === '' ? null : Number(cost);
                if (n !== line.cost) onCommit({ cost: n });
              }}
              className={!canBudget || locked ? 'bg-slate-50' : ''}
            />
            {(!canBudget || locked) && (
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
            disabled={!canBudget || busy || locked}
            onChange={(e) => setCi(e.target.value)}
            onBlur={() => {
              const n = ci === '' ? null : Number(ci);
              if (n !== line.ci) onCommit({ ci: n });
            }}
            className={!canBudget || locked ? 'bg-slate-50' : ''}
          />
        </div>
      </div>
      {/* Lock toggle — Infomarian or above only */}
      <div className="flex items-center justify-between pt-1">
        <Switch
          checked={locked}
          disabled={!canBudget || busy || !costSet}
          onCheckedChange={(v) => onCommit({ locked: v })}
        />
        <span className="text-xs text-slate-500">
          {locked ? 'Figure locked' : canBudget ? (costSet ? 'Lock figure (Infomarian)' : 'Enter a figure to lock') : 'Locking is Infomarian-only'}
        </span>
      </div>
      {costSet ? (
        <p className="text-xs text-emerald-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Entered by {line.entered_by_name || 'Infomarian'}
          {line.entered_at && ` • ${format(new Date(line.entered_at), 'd MMM yyyy')}`}
        </p>
      ) : (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {canBudget ? 'No figure yet — enter a dollar amount to cost this line.' : 'Awaiting a figure from an Infomarian or above.'}
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

  const canBudget =
    user?.email === SUPERADMIN || ELEVATED.includes(user?.user_role) || user?.role === 'admin' || !!infomarian;

  const lines = Array.isArray(poll?.budget_lines) ? poll.budget_lines : [];
  const enabled = poll?.budget_enabled !== false;
  const status = poll?.budget_status || 'draft';
  const allCosted = lines.length > 0 && lines.every((l) => typeof l.cost === 'number' && l.cost > 0);
  const total = lines.reduce((a, l) => a + (typeof l.cost === 'number' ? l.cost : 0), 0);

  const call = async (payload, successMsg) => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('manage-poll-budget', payload);
      if (res?.data?.error) throw new Error(res.data.error);
      if (successMsg) toast({ title: successMsg });
      queryClient.invalidateQueries({ queryKey: ['polls'] });
      queryClient.invalidateQueries({ queryKey: ['assignedPolls'] });
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
          <div className="flex items-center gap-2">
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
          </div>

          {/* Toggle */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Budget engine</Label>
              <Switch
                checked={enabled}
                disabled={!canBudget || busy}
                onCheckedChange={(v) => call({ action: 'toggle', pollId: poll.id, enabled: v }, v ? 'Budget engine attached' : 'Budget engine switched off')}
              />
            </div>
            <HelpNote>
              Attached to every new proposal by default. Switch it off for a plain (non-budgetary) poll.
              {!canBudget && ' Only an Infomarian or above can switch this.'}
            </HelpNote>
          </div>

          {enabled ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Budget lines</Label>
                  <span className="text-sm font-semibold text-slate-900">
                    Total: ${total.toLocaleString()}
                  </span>
                </div>
                <HelpNote>
                  Add a line for each item the proposal spends on. The budget finalises only when an
                  Infomarian or above has entered a dollar figure on every line.
                </HelpNote>

                <div className="space-y-2">
                  {lines.map((line) => (
                    <LineRow
                      key={line.id}
                      line={line}
                      canBudget={canBudget}
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
                  disabled={!canBudget || busy || !allCosted || status === 'finalised'}
                  onClick={() => call({ action: 'finalise', pollId: poll.id }, 'Budget finalised')}
                >
                  {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  {status === 'finalised' ? 'Finalised' : 'Finalise budget'}
                </Button>
                <HelpNote>
                  {status === 'finalised'
                    ? 'This budget is finalised. Editing any line reverts it to draft so a figure can be corrected.'
                    : canBudget
                      ? 'Enabled once every line has a dollar figure. Only an Infomarian or above can finalise.'
                      : 'Awaiting figures from an Infomarian or above on every line.'}
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