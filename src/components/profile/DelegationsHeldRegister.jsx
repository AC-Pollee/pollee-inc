import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

export default function DelegationsHeldRegister({ userId }) {
  const { t } = useTranslation();
  const { data: delegationsHeld = [], isLoading } = useQuery({
    queryKey: ['delegations-held', userId],
    queryFn: async () => {
      if (!userId) return [];
      const delegations = await base44.entities.Delegation.filter({
        delegate_user_id: userId,
        status: 'verified'
      });
      return delegations;
    },
    enabled: !!userId
  });

  const { data: polls = [] } = useQuery({
    queryKey: ['polls-for-delegations'],
    queryFn: () => base44.entities.Poll.list()
  });

  const openDelegations = delegationsHeld.filter(d => d.delegation_type === 'open');
  const specificDelegations = delegationsHeld.filter(d => d.delegation_type === 'specific_poll');

  const getPollTitle = (pollId) => {
    const poll = polls.find(p => p.id === pollId);
    return poll?.title || 'Unknown Poll';
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg mt-6">
        <CardContent className="pt-6 text-center text-slate-500">
          {t('delegationsHeld.loading')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg mt-6">
      <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <CardTitle className="text-2xl">{t('delegationsHeld.title')}</CardTitle>
            <p className="text-purple-100 text-sm mt-1">
              {delegationsHeld.length} verified delegation{delegationsHeld.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {delegationsHeld.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">{t('delegationsHeld.noDelegations')}</p>
            <p className="text-sm text-slate-400 mt-1">
              {t('delegationsHeld.noDelegationsDesc')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Open Delegations */}
            {openDelegations.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Badge className="bg-purple-100 text-purple-700">
                    Open Delegations ({openDelegations.length})
                  </Badge>
                </h3>
                <div className="space-y-2">
                  {openDelegations.map((delegation) => (
                    <div
                      key={delegation.id}
                      className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {delegation.delegator_full_name}
                        </p>
                        <p className="text-sm text-slate-600">
                          All polls • Verified {format(new Date(delegation.verified_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Specific Poll Delegations */}
            {specificDelegations.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Badge className="bg-indigo-100 text-indigo-700">
                    Specific Poll Delegations ({specificDelegations.length})
                  </Badge>
                </h3>
                <div className="space-y-2">
                  {specificDelegations.map((delegation) => (
                    <div
                      key={delegation.id}
                      className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-200"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {delegation.delegator_full_name}
                        </p>
                        <p className="text-sm text-slate-600">
                          {getPollTitle(delegation.poll_id)}
                        </p>
                        <p className="text-xs text-slate-500">
                          Verified {format(new Date(delegation.verified_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-purple-800">
                <span className="font-semibold">Voting Power:</span> When you vote, you cast {delegationsHeld.length + 1} vote{delegationsHeld.length + 1 > 1 ? 's' : ''} total 
                ({delegationsHeld.length} delegated + 1 your own)
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}