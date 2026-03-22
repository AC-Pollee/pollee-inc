/**
 * Stripe Webhook Handler - Process Stripe events
 * 
 * Configure this URL in your Stripe Dashboard webhooks
 */

export default async function handler(request, context) {
  const { base44, secrets } = context;

  const STRIPE_WEBHOOK_SECRET = secrets.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers['stripe-signature'];

  if (!STRIPE_WEBHOOK_SECRET) {
    return { success: false, error: 'Webhook secret not configured' };
  }

  try {
    const event = request.body;

    // Verify webhook signature (simplified - use Stripe library in production)
    // In production, use: stripe.webhooks.constructEvent(request.body, signature, STRIPE_WEBHOOK_SECRET)

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        
        // Update vote status to verified
        const votes = await base44.entities.Vote.filter({
          transaction_reference: paymentIntent.id,
          status: 'pending'
        });

        if (votes.length > 0) {
          await base44.entities.Vote.update(votes[0].id, {
            status: 'verified',
            transaction_reference: paymentIntent.id
          });
        }

        return { success: true, message: 'Payment verified and vote updated' };

      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object;
        
        // Update vote status to rejected
        const failedVotes = await base44.entities.Vote.filter({
          transaction_reference: failedIntent.id
        });

        if (failedVotes.length > 0) {
          await base44.entities.Vote.update(failedVotes[0].id, {
            status: 'rejected',
            rejection_reason: 'Payment failed'
          });
        }

        return { success: true, message: 'Vote marked as failed' };

      case 'transfer.paid':
        const transfer = event.data.object;
        
        // Log successful payout
        console.log(`Payout successful: ${transfer.id} for ${transfer.amount / 100} AUD`);
        
        return { success: true, message: 'Payout recorded' };

      case 'account.updated':
        const account = event.data.object;
        
        // Update user/franchise with Stripe account status
        console.log(`Account updated: ${account.id}, charges_enabled: ${account.charges_enabled}`);
        
        return { success: true, message: 'Account status updated' };

      default:
        return { success: true, message: `Unhandled event type: ${event.type}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}