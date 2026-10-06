/**
 * Stripe Webhook Handler - Process Stripe events
 *
 * Verifies the Stripe signature before processing any event.
 * Configure this URL in your Stripe Dashboard webhooks.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import Stripe from 'npm:stripe@14.21.0';

export default async function handler(req) {
  const STRIPE_WEBHOOK_SECRET = secrets.get('STRIPE_WEBHOOK_SECRET');
  if (!STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return Response.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const stripe = new Stripe(STRIPE_WEBHOOK_SECRET);

  try {
    // Verify the webhook signature using the raw body
    const rawBody = await req.text();
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, STRIPE_WEBHOOK_SECRET);
    } catch (verifyError) {
      return Response.json({ error: 'Invalid signature: ' + verifyError.message }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const votes = await base44.asServiceRole.entities.Vote.filter({
          transaction_reference: paymentIntent.id,
          status: 'pending'
        });

        if (votes.length > 0) {
          await base44.asServiceRole.entities.Vote.update(votes[0].id, {
            status: 'verified',
            transaction_reference: paymentIntent.id
          });
        }

        return Response.json({ success: true, message: 'Payment verified and vote updated' });
      }

      case 'payment_intent.payment_failed': {
        const failedIntent = event.data.object;
        const failedVotes = await base44.asServiceRole.entities.Vote.filter({
          transaction_reference: failedIntent.id
        });

        if (failedVotes.length > 0) {
          await base44.asServiceRole.entities.Vote.update(failedVotes[0].id, {
            status: 'rejected',
            rejection_reason: 'Payment failed'
          });
        }

        return Response.json({ success: true, message: 'Vote marked as failed' });
      }

      case 'transfer.paid': {
        const transfer = event.data.object;
        console.log(`Payout successful: ${transfer.id} for ${transfer.amount / 100} AUD`);
        return Response.json({ success: true, message: 'Payout recorded' });
      }

      case 'account.updated': {
        const account = event.data.object;
        console.log(`Account updated: ${account.id}, charges_enabled: ${account.charges_enabled}`);
        return Response.json({ success: true, message: 'Account status updated' });
      }

      default:
        return Response.json({ success: true, message: `Unhandled event type: ${event.type}` });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}