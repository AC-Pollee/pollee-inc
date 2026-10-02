import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

const money = (n) =>
  typeof n === 'number' && Number.isFinite(n)
    ? `$${n.toLocaleString()}`
    : '—';

export default function BudgetSummary({ poll }) {
  const lines = Array.isArray(poll?.budget_lines) ? poll.budget_lines : [];
  if (!poll || poll.budget_enabled === false || lines.length === 0) return null;

  const status = poll.budget_status || 'draft';
  const total = lines.reduce((a, l) => a + (typeof l.cost === 'number' ? l.cost : 0), 0);
  const lockedCount = lines.filter((l) => l.locked).length;
  const costedCount = lines.filter((l) => typeof l.cost === 'number' && l.cost > 0).length;

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="w-5 h-5 text-emerald-600" />
            Budget summary
          </CardTitle>
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
            <Badge variant="outline" className="text-emerald-700 border-emerald-200">
              Budget engine on
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {lines.map((line) => {
            const hasFigure = typeof line.cost === 'number' && line.cost > 0;
            return (
              <div
                key={line.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {line.locked ? (
                    <Lock className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  ) : hasFigure ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  )}
                  <span className="text-sm text-slate-900 truncate">{line.label}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {line.ci != null && hasFigure && (
                    <span className="text-xs text-slate-400">±{line.ci}%</span>
                  )}
                  <span
                    className={`text-sm font-medium ${hasFigure ? 'text-slate-900' : 'text-slate-400'}`}
                  >
                    {money(line.cost)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-slate-500">
            {lockedCount} of {lines.length} line{lines.length === 1 ? '' : 's'} locked
            {costedCount < lines.length && ` • ${lines.length - costedCount} awaiting a figure`}
          </span>
          <span className="text-base font-semibold text-slate-900">
            Total: {money(total)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}