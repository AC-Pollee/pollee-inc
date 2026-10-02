import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calculator, Users, Lock, ChevronRight, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import BudgetPanel from '@/components/polls/BudgetPanel';

const money = (n) => (typeof n === 'number' && Number.isFinite(n) ? `$${n.toLocaleString()}` : '—');

export default function BudgetManagement() {
  const [budgetPollId, setBudgetPollId] = useState(null);

  const { data: polls = [], isLoading } = useQuery({
    queryKey: ['activeBudgets'],
    queryFn: async () => {
      const all = await base44.entities.Poll.list('-created_date');
      return all.filter((p) => p.budget_enabled !== false);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (polls.length === 0) {
    return (
      <Card className="border-0 shadow-xl text-center">
        <CardContent className="pt-12 pb-12">
          <Calculator className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No active budgets</h3>
          <p className="text-slate-500">Proposals with the budget engine attached will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  const selectedPoll = polls.find((p) => p.id === budgetPollId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Budget management</h2>
          <p className="text-sm text-slate-500">
            {polls.length} active budget{polls.length === 1 ? '' : 's'} — select one to edit lines, set the envelope, or share with co-editors.
          </p>
        </div>
      </div>

      {polls.map((poll, index) => {
        const lines = Array.isArray(poll.budget_lines) ? poll.budget_lines : [];
        const total = lines.reduce((a, l) => a + (typeof l.cost === 'number' ? l.cost : 0), 0);
        const costed = lines.filter((l) => typeof l.cost === 'number' && l.cost > 0).length;
        const locked = lines.filter((l) => l.locked).length;
        const editors = Array.isArray(poll.budget_editors) ? poll.budget_editors : [];
        const status = poll.budget_status || 'draft';
        const envelope = poll.budget_envelope;
        const overLimit = envelope != null && total > envelope;

        return (
          <motion.div
            key={poll.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-lg font-semibold text-slate-900 truncate">{poll.title}</h3>
                      <Badge
                        className={
                          status === 'finalised'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }
                      >
                        {status === 'finalised' ? 'Finalised' : 'Draft'}
                      </Badge>
                      <Badge variant="outline" className="capitalize">{poll.poll_level}</Badge>
                      {poll.status === 'closed' && (
                        <Badge variant="outline" className="text-slate-500">Poll closed</Badge>
                      )}
                    </div>
                    {poll.end_date && (
                      <p className="text-xs text-slate-500 mb-3">Ballot closes {format(new Date(poll.end_date), 'MMM d, yyyy')}</p>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Lines</p>
                        <p className="font-medium text-slate-900">{lines.length} ({costed} costed)</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Total</p>
                        <p className="font-medium text-slate-900">{money(total)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Envelope</p>
                        <p className={`font-medium ${overLimit ? 'text-red-600' : 'text-slate-900'}`}>
                          {poll.budget_envelope_set ? (envelope != null ? money(envelope) : 'Derived') : 'Not set'}
                          {overLimit && <span className="ml-1 text-xs">over limit</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Shared with</p>
                        <p className="font-medium text-slate-900 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                          {editors.length}
                        </p>
                      </div>
                    </div>

                    {locked > 0 && (
                      <p className="text-xs text-emerald-700 flex items-center gap-1 mt-3">
                        <Lock className="w-3 h-3" />
                        {locked} of {lines.length} line{lines.length === 1 ? '' : 's'} locked as official
                      </p>
                    )}
                    {lines.length > 0 && costed < lines.length && (
                      <p className="text-xs text-amber-600 flex items-center gap-1 mt-2">
                        <AlertCircle className="w-3 h-3" />
                        {lines.length - costed} line{lines.length - costed === 1 ? '' : 's'} still need a figure
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setBudgetPollId(poll.id)}
                    >
                      <Calculator className="w-4 h-4 mr-2" />
                      Edit budget
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      <BudgetPanel
        poll={selectedPoll}
        open={!!budgetPollId}
        onOpenChange={(open) => !open && setBudgetPollId(null)}
      />
    </div>
  );
}