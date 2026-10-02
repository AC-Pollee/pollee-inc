import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Lock, Calculator, Info } from 'lucide-react';

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);

function LineRow({ line, canBudget, currentUser, onChange, onRemove }) {
  const [label, setLabel] = useState(line.label || '');
  const [cost, setCost] = useState(line.cost ?? '');

  const locked = !!line.locked;
  const costSet = typeof line.cost === 'number' && line.cost > 0;

  const commit = (patch) => onChange({ ...line, ...patch });

  const toggleLock = (v) => {
    if (v && !costSet) return; // need a figure to lock
    const stamp = v && currentUser
      ? {
          entered_by_id: currentUser.id,
          entered_by_name: currentUser.full_name || currentUser.email,
          entered_at: new Date().toISOString(),
        }
      : {};
    commit({ locked: v, ...stamp });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
      <div className="flex items-start gap-2">
        <Input
          value={label}
          placeholder="Item title (e.g. Solar panels)"
          disabled={locked}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => label !== line.label && commit({ label: label.trim() })}
          className="flex-1"
        />
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-red-500 flex-shrink-0"
          disabled={locked}
          onClick={onRemove}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-slate-500">Estimated cost ($)</Label>
          <div className="relative">
            <Input
              type="number"
              min="0"
              value={cost}
              placeholder="0"
              disabled={locked}
              onChange={(e) => setCost(e.target.value)}
              onBlur={() => {
                const n = cost === '' ? null : Number(cost);
                if (n !== line.cost) commit({ cost: n });
              }}
              className={locked ? 'bg-slate-50' : ''}
            />
            {locked && (
              <Lock className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
            )}
          </div>
        </div>
        <div>
          <Label className="text-xs text-slate-500">Lock figure</Label>
          <div className="flex items-center gap-2 h-9">
            <Switch
              checked={locked}
              disabled={!canBudget || !costSet}
              onCheckedChange={toggleLock}
            />
            <span className="text-xs text-slate-500">
              {!canBudget
                ? 'Infomarian only'
                : locked
                  ? 'Locked'
                  : costSet
                    ? 'Lock as official'
                    : 'Enter a cost to lock'}
            </span>
          </div>
        </div>
      </div>

      {locked && line.entered_by_name && (
        <p className="text-xs text-emerald-700 flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Locked by {line.entered_by_name}
        </p>
      )}
    </div>
  );
}

export default function BudgetLinesEditor({ lines, onChange, canBudget, currentUser }) {
  const [newLabel, setNewLabel] = useState('');

  const addLine = () => {
    const label = newLabel.trim();
    if (!label) return;
    onChange([
      ...lines,
      { id: uid(), label, cost: null, ci: null, locked: false, entered_by_id: null, entered_by_name: null, entered_at: null },
    ]);
    setNewLabel('');
  };

  const total = lines.reduce((a, l) => a + (typeof l.cost === 'number' ? l.cost : 0), 0);
  const lockedCount = lines.filter((l) => l.locked).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-emerald-600" />
          Budget line items
        </Label>
        <span className="text-sm font-semibold text-slate-900">
          Total: ${total.toLocaleString()}
        </span>
      </div>
      <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
        <span>
          Add a line for each item the proposal spends on. Anyone can enter a title and an
          estimated cost; an Infomarian or above can lock a figure to mark it as official.
        </span>
      </div>

      <div className="space-y-2">
        {lines.map((line) => (
          <LineRow
            key={line.id}
            line={line}
            canBudget={canBudget}
            currentUser={currentUser}
            onChange={(next) => onChange(lines.map((l) => (l.id === next.id ? next : l)))}
            onRemove={() => onChange(lines.filter((l) => l.id !== line.id))}
          />
        ))}
        {lines.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-6">No budget lines yet.</p>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={newLabel}
          placeholder="New line title"
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addLine()}
        />
        <Button variant="outline" onClick={addLine} disabled={!newLabel.trim()}>
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {lines.length > 0 && (
        <p className="text-xs text-slate-500">
          {lockedCount} of {lines.length} line{lines.length === 1 ? '' : 's'} locked.
        </p>
      )}
    </div>
  );
}