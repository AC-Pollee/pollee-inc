/**
 * Cast a vote with server-side validation.
 *
 * Authenticates the caller, verifies each claimed delegation against the
 * Delegation entity for that caller and poll, and sets the vote status
 * server-side instead of trusting client-supplied fields.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      poll_id,
      poll_item_id,
      option_label,
      carrying_delegation,
      delegation_ids,
      account_binding,
      destination_account_bsb,
      destination_account_number
    } = body || {};

    if (!poll_id || !poll_item_id) {
      return Response.json({ error: 'poll_id and poll_item_id are required' }, { status: 400 });
    }

    // Verify poll exists
    const polls = await base44.asServiceRole.entities.Poll.filter({ id: poll_id });
    const poll = polls[0];
    if (!poll) return Response.json({ error: 'Poll not found' }, { status: 404 });

    // Verify poll is active and not closed
    if (poll.status === 'closed' || (poll.end_date && new Date(poll.end_date) < new Date())) {
      return Response.json({ error: 'Poll is closed' }, { status: 400 });
    }

    // Verify delegations belong to the caller and are valid for this poll
    let verifiedDelegationCount = 0;
    if (carrying_delegation && Array.isArray(delegation_ids) && delegation_ids.length > 0) {
      const allDelegations = await base44.asServiceRole.entities.Delegation.filter({
        delegate_user_id: caller.id,
        status: 'verified'
      });
      const validIds = new Set(
        allDelegations
          .filter(d => d.delegation_type === 'open' || d.poll_id === poll_id)
          .map(d => d.id)
      );
      verifiedDelegationCount = delegation_ids.filter(id => validIds.has(id)).length;
    }

    // Check for existing votes to set is_vote_change
    const existingVotes = await base44.asServiceRole.entities.Vote.filter({ poll_id });
    const myVotes = existingVotes.filter(v => v.voter_id === caller.voter_id || v.created_by === caller.email);
    const isVoteChange = myVotes.length > 0;

    // Create the vote record with server-side status
    const vote = await base44.asServiceRole.entities.Vote.create({
      poll_id,
      poll_item_id,
      option_label,
      voter_name: caller.full_name || '',
      voter_id: caller.voter_id || caller.id,
      infomarian_id: caller.infomarian_id || '',
      delegation_status: carrying_delegation ? 'delegated' : 'direct',
      delegated_votes_count: 1 + verifiedDelegationCount,
      transaction_reference: `DEMO-${Date.now()}`,
      transaction_amount: 0,
      transaction_date: new Date().toISOString(),
      transaction_description: 'Demo vote (transaction layer suspended)',
      bank_name: 'Development (suspended)',
      tip_amount: 0,
      delegation_ids: delegation_ids || [],
      status: 'verified',
      is_vote_change: isVoteChange,
      account_binding: account_binding || '',
      destination_account_bsb: destination_account_bsb || '',
      destination_account_number: destination_account_number || ''
    });

    return Response.json({ ok: true, vote });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}