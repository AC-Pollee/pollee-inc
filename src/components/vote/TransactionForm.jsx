import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';

export default function TransactionForm({ pollId, pollOptions, onSubmit }) {
  const [transactionData, setTransactionData] = useState({
    fullName: '',
    reference: '',
    amount: '',
    date: '',
    description: '',
    bank: ''
  });
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);

  const handleExtract = async () => {
    if (!transactionData.fullName.trim()) {
      setError('Please enter your full name');
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
    const expectedAmount = extractedData.delegated_votes_count * 0.55;
    
    // Validate amount (allow small floating point differences)
    if (Math.abs(amount - expectedAmount) > 0.01) {
      setError(`Transaction amount should be $${expectedAmount.toFixed(2)} AUD (${extractedData.delegated_votes_count} votes × $0.55)`);
      return;
    }

    onSubmit({
      poll_id: pollId,
      poll_item_id: extractedData.poll_item_id,
      option_label: extractedData.option_label,
      voter_name: transactionData.fullName,
      infomarian_id: extractedData.infomarian_id,
      delegation_status: extractedData.delegation_status,
      delegated_votes_count: extractedData.delegated_votes_count,
      transaction_reference: transactionData.reference,
      transaction_amount: amount,
      transaction_date: transactionData.date || new Date().toISOString(),
      transaction_description: transactionData.description,
      bank_name: transactionData.bank,
      payment_breakdown: {
        infomarian: 0.30 * extractedData.delegated_votes_count,
        pollee_incorporated: 0.10 * extractedData.delegated_votes_count,
        local_franchise: 0.10 * extractedData.delegated_votes_count,
        gst: 0.05 * extractedData.delegated_votes_count
      },
      status: 'pending'
    });
  };

  return (
    <div className="space-y-6">
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
        <h3 className="font-semibold text-emerald-900 mb-3">Vote Payment: $0.55 AUD per vote</h3>
        <div className="space-y-2 text-sm text-emerald-700">
          <div className="flex justify-between">
            <span>Infomarian:</span>
            <span className="font-semibold">$0.30</span>
          </div>
          <div className="flex justify-between">
            <span>Pollee Incorporated:</span>
            <span className="font-semibold">$0.10</span>
          </div>
          <div className="flex justify-between">
            <span>Local Franchise:</span>
            <span className="font-semibold">$0.10</span>
          </div>
          <div className="flex justify-between border-t border-emerald-200 pt-2">
            <span>GST:</span>
            <span className="font-semibold">$0.05</span>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
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
            value={transactionData.description}
            onChange={(e) => setTransactionData({...transactionData, description: e.target.value})}
            className="min-h-[120px] rounded-lg"
          />
          <p className="text-xs text-slate-500">
            Copy and paste the exact description from your bank transaction
          </p>
        </div>

        <Button
          onClick={handleExtract}
          disabled={!transactionData.fullName.trim() || !transactionData.description.trim() || extracting}
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
                <p className="text-emerald-900 font-semibold">{extractedData.infomarian_id}</p>
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
                <p className="text-emerald-900 font-semibold capitalize">{extractedData.delegation_status}</p>
              </div>
              <div>
                <p className="text-emerald-600 font-medium">Delegated Votes</p>
                <p className="text-emerald-900 font-semibold">{extractedData.delegated_votes_count}</p>
              </div>
              <div>
                <p className="text-emerald-600 font-medium">Expected Payment</p>
                <p className="text-emerald-900 font-semibold">${(extractedData.delegated_votes_count * 0.55).toFixed(2)} AUD</p>
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