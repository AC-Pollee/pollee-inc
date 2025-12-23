import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';

export default function TransactionForm({ pollId, pollOptions, onSubmit, currentUser, poll, franchise }) {
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [transactionData, setTransactionData] = useState({
    fullName: currentUser?.full_name || '',
    pollNumber: pollId || '',
    infomarianId: currentUser?.infomarian_id || '',
    infomarianTip: '0.30',
    carryingDelegation: false,
    reference: '',
    amount: '',
    date: '',
    description: '',
    bank: ''
  });
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDelegations, setSelectedDelegations] = useState([]);

  // Check if user has already voted on this poll
  const { data: existingVotes = [] } = useQuery({
    queryKey: ['user-votes', currentUser?.id, pollId],
    queryFn: async () => {
      if (!currentUser?.id || !pollId) return [];
      const votes = await base44.entities.Vote.filter({ poll_id: pollId });
      return votes.filter(v => v.voter_id === currentUser.voter_id || v.created_by === currentUser.email);
    },
    enabled: !!currentUser?.id && !!pollId
  });

  const hasVotedBefore = existingVotes.length > 0;
  const lastVote = hasVotedBefore ? existingVotes[existingVotes.length - 1] : null;

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
  const expectedTip = parseFloat(transactionData.infomarianTip) || 0.30;

  const handleExtract = async () => {
    if (!transactionData.fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!transactionData.infomarianId.trim()) {
      setError('Please enter your Infomarian ID');
      return;
    }
    if (!transactionData.description.trim()) {
      setError('Please enter the transaction description');
      return;
    }

    setExtracting(true);
    setError(null);

    try {
      // Create a detailed prompt for the LLM to extract vote data
      const prompt = `Extract voting information from this bank transaction description:

"${transactionData.description}"

Available poll options:
${pollOptions.map(opt => `- ID: ${opt.id}, Label: ${opt.label}`).join('\n')}

Extract the following information:
1. Voter Name
2. Poll Item ID (must match one of the available option IDs above)
3. Delegation Status (either "direct" or "delegated")
4. Number of Delegated Votes (integer, minimum 1)
5. Infomarian ID (any identifier found)

Return the data in the exact JSON format specified. If a field cannot be found, use reasonable defaults.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            voter_name: { type: "string" },
            poll_item_id: { type: "string" },
            delegation_status: { 
              type: "string",
              enum: ["direct", "delegated"]
            },
            delegated_votes_count: { type: "number" },
            infomarian_id: { type: "string" }
          },
          required: ["voter_name", "poll_item_id", "delegation_status", "delegated_votes_count"]
        }
      });

      // Validate that the poll_item_id exists
      const matchingOption = pollOptions.find(opt => opt.id === result.poll_item_id);
      
      if (!matchingOption) {
        setError(`Could not identify a valid poll option from the transaction. Please ensure the description contains one of: ${pollOptions.map(o => o.id).join(', ')}`);
        setExtracting(false);
        return;
      }

      setExtractedData({
        ...result,
        option_label: matchingOption.label
      });
      setError(null);
    } catch (err) {
      setError('Failed to extract vote data. Please check your transaction description and try again.');
      console.error(err);
    }

    setExtracting(false);
  };

  const handleSubmit = () => {
    if (!extractedData) return;

    const amount = parseFloat(transactionData.amount) || 0;
    const baseAmount = 0.25; // Pollee + Franchise + GST
    const expectedAmount = (baseAmount + expectedTip) * totalVotes;
    
    if (Math.abs(amount - expectedAmount) > 0.01) {
      setError(`Transaction amount should be $${expectedAmount.toFixed(2)} AUD (${totalVotes} votes × $${(baseAmount + expectedTip).toFixed(2)})`);
      return;
    }

    onSubmit({
      poll_id: pollId,
      poll_item_id: extractedData.poll_item_id,
      option_label: extractedData.option_label,
      voter_name: transactionData.fullName,
      infomarian_id: transactionData.infomarianId,
      delegation_status: transactionData.carryingDelegation ? 'delegated' : 'direct',
      delegated_votes_count: totalVotes,
      transaction_reference: transactionData.reference,
      transaction_amount: amount,
      transaction_date: transactionData.date || new Date().toISOString(),
      transaction_description: transactionData.description,
      bank_name: transactionData.bank,
      voter_id: currentUser?.voter_id || `V${Date.now()}`,
      payment_breakdown: {
        infomarian: expectedTip * totalVotes,
        pollee_incorporated: 0.10 * totalVotes,
        local_franchise: 0.10 * totalVotes,
        gst: 0.05 * totalVotes
      },
      delegation_ids: selectedDelegations.map(d => d.id),
      status: 'pending',
      is_vote_change: hasVotedBefore
    });
  };

  const handleQuickVote = () => {
    if (!selectedChoice || !franchise) return;

    const amount = 0.25 + expectedTip;
    
    onSubmit({
      poll_id: pollId,
      poll_item_id: selectedChoice,
      option_label: selectedChoice === 'undecided' ? "I Don't Know" : selectedChoice.charAt(0).toUpperCase() + selectedChoice.slice(1),
      voter_name: transactionData.fullName,
      infomarian_id: transactionData.infomarianId,
      delegation_status: 'direct',
      delegated_votes_count: 1,
      transaction_reference: `AUTO-${Date.now()}`,
      transaction_amount: amount,
      transaction_date: new Date().toISOString(),
      transaction_description: `Vote: ${selectedChoice} - Poll: ${pollId} - Infomarian: ${transactionData.infomarianId}`,
      bank_name: 'Franchise Banking',
      voter_id: currentUser?.voter_id || `V${Date.now()}`,
      franchise_id: franchise.id,
      destination_bsb: selectedChoice === 'yes' ? franchise.yes_account_bsb : selectedChoice === 'no' ? franchise.no_account_bsb : franchise.undecided_account_bsb,
      destination_account: selectedChoice === 'yes' ? franchise.yes_account_number : selectedChoice === 'no' ? franchise.no_account_number : franchise.undecided_account_number,
      payment_breakdown: {
        infomarian: expectedTip,
        pollee_incorporated: 0.10,
        local_franchise: 0.10,
        gst: 0.05
      },
      status: 'pending',
      is_vote_change: hasVotedBefore
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
              <h3 className="font-semibold text-amber-900">Vote Change</h3>
              <p className="text-sm text-amber-700">
                You previously voted for <span className="font-bold">{lastVote?.option_label}</span>. 
                You can change your vote by submitting a new transaction. Only your most recent vote will count.
              </p>
              <p className="text-xs text-amber-600 mt-2">
                All vote transactions are kept in the change log for transparency.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-indigo-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-indigo-900">How to Vote with Your Transaction</h3>
            <p className="text-sm text-indigo-700">
              Your bank transaction description must include:
            </p>
            <ul className="text-sm text-indigo-700 list-disc list-inside space-y-1 ml-2">
              <li>Your Name</li>
              <li>Poll Item ID (e.g., "Option 1" or the ID number)</li>
              <li>Delegation status ("direct" or "delegated")</li>
              <li>Number of delegated votes</li>
              <li>Your Infomarian ID</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
        <h3 className="font-semibold text-emerald-900 mb-3">Vote Payment Breakdown</h3>
        <div className="space-y-2 text-sm text-emerald-700">
          <div className="flex justify-between">
            <span>Infomarian Fee:</span>
            <span className="font-semibold">$0.30</span>
          </div>
          <div className="flex justify-between">
            <span>Infomarian Tip:</span>
            <span className="font-semibold">${(expectedTip - 0.25).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Pollee Incorporated:</span>
            <span className="font-semibold">${(0.10 * totalVotes).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Local Franchise:</span>
            <span className="font-semibold">${(0.10 * totalVotes).toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-emerald-200 pt-2">
            <span>GST:</span>
            <span className="font-semibold">${(0.05 * totalVotes).toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-emerald-300 pt-2 font-bold text-base">
            <span>Total ({totalVotes} vote{totalVotes > 1 ? 's' : ''}):</span>
            <span>${((0.25 + expectedTip) * totalVotes).toFixed(2)} AUD</span>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-base font-semibold">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fullName"
              placeholder="Enter your full name"
              value={transactionData.fullName}
              onChange={(e) => setTransactionData({...transactionData, fullName: e.target.value})}
              className="h-11 rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pollNumber" className="text-base font-semibold">
              Poll Number
            </Label>
            <Input
              id="pollNumber"
              value={transactionData.pollNumber}
              onChange={(e) => setTransactionData({...transactionData, pollNumber: e.target.value})}
              placeholder="Auto-filled"
              className="h-11 rounded-lg bg-slate-50"
              disabled
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="infomarianId" className="text-base font-semibold">
              Infomarian ID <span className="text-red-500">*</span>
            </Label>
            <Input
              id="infomarianId"
              placeholder="Your Infomarian ID"
              value={transactionData.infomarianId}
              onChange={(e) => setTransactionData({...transactionData, infomarianId: e.target.value})}
              className="h-11 rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="infomarianTip" className="text-base font-semibold">
              Infomarian Tip
            </Label>
            <Input
              id="infomarianTip"
              type="number"
              step="0.01"
              min="0.30"
              value={transactionData.infomarianTip}
              onChange={(e) => setTransactionData({...transactionData, infomarianTip: e.target.value})}
              className="h-11 rounded-lg"
            />
            <p className="text-xs text-slate-500">Minimum $0.30 AUD</p>
          </div>
        </div>

        {availableDelegations.length > 0 && (
          <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="carryingDelegation"
                checked={transactionData.carryingDelegation}
                onCheckedChange={(checked) => {
                  setTransactionData({...transactionData, carryingDelegation: checked});
                  if (!checked) setSelectedDelegations([]);
                }}
              />
              <Label htmlFor="carryingDelegation" className="font-semibold text-blue-900 cursor-pointer">
                Carrying Delegation
              </Label>
            </div>

            {transactionData.carryingDelegation && (
              <div className="space-y-2 ml-6">
                <p className="text-sm text-blue-700 mb-2">Select delegations to carry:</p>
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
                      {delegation.delegator_full_name} ({delegation.delegation_type === 'open' ? 'Open' : 'This Poll'})
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="reference">Transaction Reference</Label>
            <Input
              id="reference"
              placeholder="TXN123456789"
              value={transactionData.reference}
              onChange={(e) => setTransactionData({...transactionData, reference: e.target.value})}
              className="h-11 rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Transaction Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={transactionData.amount}
              onChange={(e) => setTransactionData({...transactionData, amount: e.target.value})}
              className="h-11 rounded-lg"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">Transaction Date & Time</Label>
            <Input
              id="date"
              type="datetime-local"
              value={transactionData.date}
              onChange={(e) => setTransactionData({...transactionData, date: e.target.value})}
              className="h-11 rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank">Bank Name</Label>
            <Input
              id="bank"
              placeholder="Your Bank Name"
              value={transactionData.bank}
              onChange={(e) => setTransactionData({...transactionData, bank: e.target.value})}
              className="h-11 rounded-lg"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-base font-semibold">
            Transaction Description <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="description"
            placeholder="Paste your complete transaction description here. Example: 'Vote John Smith Option1 Direct 1 vote InfoID:12345'"
            value={transactionData.description || (selectedChoice ? `Vote ${transactionData.fullName} ${selectedChoice === 'undecided' ? "I Don't Know" : selectedChoice.charAt(0).toUpperCase() + selectedChoice.slice(1)} Direct 1 vote InfoID:${transactionData.infomarianId}` : `Available Options:\n${pollOptions.map(opt => `${opt.label} (ID: ${opt.id})`).join('\n')}`)}
            onChange={(e) => setTransactionData({...transactionData, description: e.target.value})}
            className="min-h-[120px] rounded-lg"
          />
          <p className="text-xs text-slate-500">
            Copy and paste the exact description from your bank transaction
          </p>
        </div>

        <Card className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
          <h3 className="font-semibold text-emerald-900 mb-3">Vote Payment Breakdown</h3>
          <div className="space-y-2 text-sm text-emerald-700">
            <div className="flex justify-between">
              <span>Infomarian Fee (per vote):</span>
              <span className="font-semibold">${(expectedTip - 0.25).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Pollee Incorporated:</span>
              <span className="font-semibold">${(0.10 * totalVotes).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Local Franchise:</span>
              <span className="font-semibold">${(0.10 * totalVotes).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-emerald-200 pt-2">
              <span>GST:</span>
              <span className="font-semibold">${(0.05 * totalVotes).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-emerald-300 pt-2 font-bold text-base">
              <span>Total ({totalVotes} vote{totalVotes > 1 ? 's' : ''}):</span>
              <span>${((0.25 + expectedTip) * totalVotes).toFixed(2)} AUD</span>
            </div>
          </div>
        </Card>

        {/* Quick Vote Selection */}
        <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
          <h3 className="font-semibold text-indigo-900 mb-4">Final Vote Selection</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Button
              onClick={() => setSelectedChoice('yes')}
              className={`h-20 text-lg font-semibold ${
                selectedChoice === 'yes'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-200'
              }`}
            >
              Yes
            </Button>
            <Button
              onClick={() => setSelectedChoice('no')}
              className={`h-20 text-lg font-semibold ${
                selectedChoice === 'no'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-200'
              }`}
            >
              No
            </Button>
            <Button
              onClick={() => setSelectedChoice('undecided')}
              className={`h-20 text-lg font-semibold ${
                selectedChoice === 'undecided'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-200'
              }`}
            >
              I Don't Know
            </Button>
          </div>

          {selectedChoice && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 border-t border-indigo-200 pt-4"
            >
              <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">My Choice:</span>
                  <span className="font-semibold text-indigo-900 capitalize">
                    {selectedChoice === 'undecided' ? "I Don't Know" : selectedChoice}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Franchise Name:</span>
                  <span className="font-semibold text-indigo-900">{franchise?.franchise_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Franchise ID:</span>
                  <span className="font-semibold text-indigo-900">{franchise?.id || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Infomarian Tip:</span>
                  <span className="font-semibold text-indigo-900">${expectedTip.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Destination Account:</span>
                  <span className="font-semibold text-indigo-900 font-mono text-xs">
                    {franchise && selectedChoice === 'yes' && `${franchise.yes_account_bsb || 'N/A'} - ${franchise.yes_account_number || 'N/A'}`}
                    {franchise && selectedChoice === 'no' && `${franchise.no_account_bsb || 'N/A'} - ${franchise.no_account_number || 'N/A'}`}
                    {franchise && selectedChoice === 'undecided' && `${franchise.undecided_account_bsb || 'N/A'} - ${franchise.undecided_account_number || 'N/A'}`}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                  <span className="text-slate-600">Total Amount:</span>
                  <span className="text-indigo-900">${(0.25 + expectedTip).toFixed(2)} AUD</span>
                </div>
              </div>
              <Button
                onClick={handleQuickVote}
                disabled={!transactionData.fullName || !transactionData.infomarianId}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Submit Vote
              </Button>
            </motion.div>
          )}
        </Card>

        <Button
          onClick={handleExtract}
          disabled={!transactionData.fullName.trim() || !transactionData.infomarianId.trim() || !transactionData.description.trim() || extracting}
          className="w-full h-12 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-lg"
        >
          {extracting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Extracting Vote Data...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Extract Vote from Transaction
            </>
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {extractedData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <Card className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-emerald-900">Vote Data Extracted</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-emerald-600 font-medium">Voter Name</p>
                <p className="text-emerald-900 font-semibold">{transactionData.fullName}</p>
              </div>
              <div>
                <p className="text-emerald-600 font-medium">Infomarian ID</p>
                <p className="text-emerald-900 font-semibold">{transactionData.infomarianId}</p>
              </div>
              <div>
                <p className="text-emerald-600 font-medium">Voting For</p>
                <p className="text-emerald-900 font-semibold">{extractedData.option_label}</p>
              </div>
              <div>
                <p className="text-emerald-600 font-medium">Poll Item ID</p>
                <p className="text-emerald-900 font-semibold">{extractedData.poll_item_id}</p>
              </div>
              <div>
                <p className="text-emerald-600 font-medium">Delegation Status</p>
                <p className="text-emerald-900 font-semibold capitalize">
                  {transactionData.carryingDelegation ? 'Delegated' : 'Direct'}
                </p>
              </div>
              <div>
                <p className="text-emerald-600 font-medium">Total Votes</p>
                <p className="text-emerald-900 font-semibold">{totalVotes}</p>
              </div>
              <div>
                <p className="text-emerald-600 font-medium">Infomarian Fee</p>
                <p className="text-emerald-900 font-semibold">${(expectedTip * totalVotes).toFixed(2)} AUD</p>
              </div>
              <div>
                <p className="text-emerald-600 font-medium">Expected Payment</p>
                <p className="text-emerald-900 font-semibold">${((0.25 + expectedTip) * totalVotes).toFixed(2)} AUD</p>
              </div>
            </div>
          </Card>

          <Button
            onClick={handleSubmit}
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-lg"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Submit Vote
          </Button>
        </motion.div>
      )}
    </div>
  );
}