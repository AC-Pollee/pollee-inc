import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { usePollTranslation } from '@/hooks/usePollTranslation';

export default function TransactionForm({ pollId, pollOptions, onSubmit, currentUser, poll, franchise }) {
  const { t } = useTranslation();
  const { options: translatedOptions } = usePollTranslation(poll);
  const optionLabel = (id, fallback) => translatedOptions.find(o => o.id === id)?.label || fallback;
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [carryingDelegation, setCarryingDelegation] = useState(false);
  const [selectedDelegations, setSelectedDelegations] = useState([]);

  // Check if user has already voted on this poll
  const { data: existingVotes = [] } = useQuery({
    queryKey: ['user-votes', currentUser?.id, pollId],
    queryFn: async () => {
      if (!currentUser?.id || !pollId) return [];
      const votes = await base44.entities.Vote.filter({ poll_id: pollId });
      return votes.filter(v => v.voter_id === currentUser.voter_id || v.created_by === currentUser.email)
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!currentUser?.id && !!pollId
  });

  const hasVotedBefore = existingVotes.length > 0;
  const lastVote = hasVotedBefore ? existingVotes[0] : null;

  const { data: availableDelegations = [] } = useQuery({
    queryKey: ['available-delegations', currentUser?.id, pollId],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const allDelegations = await base44.entities.Delegation.filter({
        delegate_user_id: currentUser.id,
        status: 'verified'
      });
      return allDelegations.filter(d =>
        d.delegation_type === 'open' || d.poll_id === pollId
      );
    },
    enabled: !!currentUser?.id
  });

  const totalVotes = 1 + selectedDelegations.length;

  const handleVote = () => {
    if (!selectedChoice) return;
    const option = pollOptions.find(o => o.id === selectedChoice);
    if (!option) return;

    // Bind the chosen option to the constituency's Yes / No / RTS account by position.
    // Option 1 -> Yes, Option 2 -> No, Option 3 (RTS) -> RTS.
    const optionIndex = pollOptions.findIndex(o => o.id === selectedChoice);
    const bindings = ['yes', 'no', 'rts'];
    const accountBinding = bindings[optionIndex] || 'rts';
    const accountFields = {
      yes: { bsb: franchise?.yes_account_bsb, number: franchise?.yes_account_number },
      no: { bsb: franchise?.no_account_bsb, number: franchise?.no_account_number },
      rts: { bsb: franchise?.rts_account_bsb, number: franchise?.rts_account_number }
    };
    const destination = accountFields[accountBinding] || {};

    onSubmit({
      poll_id: pollId,
      poll_item_id: option.id,
      option_label: option.label,
      voter_name: currentUser?.full_name || '',
      infomarian_id: currentUser?.infomarian_id || '',
      delegation_status: carryingDelegation ? 'delegated' : 'direct',
      delegated_votes_count: totalVotes,
      transaction_reference: `DEMO-${Date.now()}`,
      transaction_amount: 0,
      transaction_date: new Date().toISOString(),
      transaction_description: `Demo vote: ${option.label} (transaction layer suspended)`,
      bank_name: 'Development (suspended)',
      voter_id: currentUser?.voter_id || currentUser?.id || `V${Date.now()}`,
      tip_amount: 0,
      delegation_ids: selectedDelegations.map(d => d.id),
      status: 'verified',
      is_vote_change: hasVotedBefore,
      account_binding: accountBinding,
      destination_account_bsb: destination.bsb || '',
      destination_account_number: destination.number || ''
    });
  };

  return (
    <div className="space-y-6">
      {hasVotedBefore && (
        <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-amber-900">{t('transactionForm.voteChange')}</h3>
              <p className="text-sm text-amber-700">
                {t('transactionForm.voteChangeDesc', { choice: optionLabel(lastVote?.poll_item_id, lastVote?.option_label) })}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <span className="font-semibold">{t('transactionForm.devMode')}</span>
        </AlertDescription>
      </Alert>

      {availableDelegations.length > 0 && (
        <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="carryingDelegation"
              checked={carryingDelegation}
              onCheckedChange={(checked) => {
                setCarryingDelegation(checked);
                if (!checked) setSelectedDelegations([]);
              }}
            />
            <Label htmlFor="carryingDelegation" className="font-semibold text-blue-900 cursor-pointer">
              {t('transactionForm.carryingDelegation')}
            </Label>
          </div>

          {carryingDelegation && (
            <div className="space-y-2 ml-6">
              <p className="text-sm text-blue-700 mb-2">{t('transactionForm.selectDelegations')}</p>
              {availableDelegations.map(delegation => (
                <div key={delegation.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`delegation-${delegation.id}`}
                    checked={selectedDelegations.some(d => d.id === delegation.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedDelegations([...selectedDelegations, delegation]);
                      } else {
                        setSelectedDelegations(selectedDelegations.filter(d => d.id !== delegation.id));
                      }
                    }}
                  />
                  <Label htmlFor={`delegation-${delegation.id}`} className="text-sm text-blue-800 cursor-pointer">
                    {delegation.delegator_full_name} ({delegation.delegation_type === 'open' ? t('transactionForm.open') : t('transactionForm.thisPoll')})
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
        <h3 className="font-semibold text-indigo-900 mb-4">{t('transactionForm.castYourVote')}</h3>
        <div className="grid gap-3 mb-4">
          {pollOptions.map((option) => {
            const isSelected = selectedChoice === option.id;
            const isLast = lastVote?.poll_item_id === option.id;
            return (
              <Button
                key={option.id}
                onClick={() => setSelectedChoice(option.id)}
                className={`min-h-16 h-auto text-base font-semibold justify-start text-left whitespace-normal break-words px-6 py-3 ${
                  isSelected
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-200'
                }`}
              >
                {optionLabel(option.id, option.label)}
                {isLast && !isSelected && (
                  <span className="ml-auto text-xs font-normal text-slate-400">{t('transactionForm.currentVote')}</span>
                )}
                {isSelected && <CheckCircle2 className="w-5 h-5 ml-auto" />}
              </Button>
            );
          })}
        </div>

        {selectedChoice && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4 border-t border-indigo-200 pt-4"
          >
            <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">{t('transactionForm.yourChoice')}</span>
                <span className="font-semibold text-indigo-900">
                  {optionLabel(selectedChoice, pollOptions.find(o => o.id === selectedChoice)?.label)}
                </span>
              </div>
              {carryingDelegation && (
                <div className="flex justify-between">
                  <span className="text-slate-600">{t('transactionForm.delegatedVotes')}</span>
                  <span className="font-semibold text-indigo-900">{totalVotes}</span>
                </div>
              )}
            </div>
            <Button
              onClick={handleVote}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              {t('transactionForm.submitVote')}
            </Button>
          </motion.div>
        )}
      </Card>
    </div>
  );
}