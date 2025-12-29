/**
 * Stripe Integration - Handle all financial transactions
 * 
 * Usage: Call this function for payment processing, refunds, and payouts
 */

export default async function handler(request, context) {
  const { base44, secrets } = context;
  const { action, payment_data, transaction_id } = request.body;

  const STRIPE_SECRET_KEY = secrets.STRIPE_SECRET_KEY;

  if (!STRIPE_SECRET_KEY) {
    return { success: false, error: 'Stripe secret key not configured' };
  }

  const stripeHeaders = {
    'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  try {
    switch (action) {
      case 'create_payment_intent':
        // Create a payment intent for voting
        const amountInCents = Math.round(payment_data.amount * 100); // Convert to cents
        
        const paymentIntentParams = new URLSearchParams({
          amount: amountInCents,
          currency: 'aud',
          'metadata[poll_id]': payment_data.poll_id,
          'metadata[voter_id]': payment_data.voter_id,
          'metadata[option]': payment_data.option_label,
          description: `Vote for poll: ${payment_data.poll_title}`
        });

        const intentResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
          method: 'POST',
          headers: stripeHeaders,
          body: paymentIntentParams
        });

        if (!intentResponse.ok) {
          throw new Error('Failed to create payment intent');
        }

        const intentData = await intentResponse.json();

        return {
          success: true,
          client_secret: intentData.client_secret,
          payment_intent_id: intentData.id
        };

      case 'verify_payment':
        // Verify payment status
        const verifyResponse = await fetch(`https://api.stripe.com/v1/payment_intents/${transaction_id}`, {
          headers: stripeHeaders
        });

        if (!verifyResponse.ok) {
          throw new Error('Failed to verify payment');
        }

        const paymentData = await verifyResponse.json();

        return {
          success: true,
          status: paymentData.status,
          amount: paymentData.amount / 100,
          metadata: paymentData.metadata
        };

      case 'create_payout':
        // Create payout to infomarian/franchise
        const payoutAmount = Math.round(payment_data.payout_amount * 100);
        
        const payoutParams = new URLSearchParams({
          amount: payoutAmount,
          currency: 'aud',
          destination: payment_data.stripe_account_id,
          'metadata[recipient_type]': payment_data.recipient_type,
          'metadata[recipient_id]': payment_data.recipient_id,
          description: `Payout for ${payment_data.recipient_type}: ${payment_data.recipient_name}`
        });

        const payoutResponse = await fetch('https://api.stripe.com/v1/transfers', {
          method: 'POST',
          headers: stripeHeaders,
          body: payoutParams
        });

        if (!payoutResponse.ok) {
          throw new Error('Failed to create payout');
        }

        const payoutData = await payoutResponse.json();

        return {
          success: true,
          transfer_id: payoutData.id,
          amount: payoutData.amount / 100
        };

      case 'refund_payment':
        // Refund a payment (for vote changes)
        const refundParams = new URLSearchParams({
          payment_intent: transaction_id,
          reason: 'requested_by_customer'
        });

        const refundResponse = await fetch('https://api.stripe.com/v1/refunds', {
          method: 'POST',
          headers: stripeHeaders,
          body: refundParams
        });

        if (!refundResponse.ok) {
          throw new Error('Failed to process refund');
        }

        const refundData = await refundResponse.json();

        return {
          success: true,
          refund_id: refundData.id,
          status: refundData.status
        };

      case 'create_connected_account':
        // Create Stripe connected account for franchise/infomarian
        const accountParams = new URLSearchParams({
          type: 'express',
          country: 'AU',
          email: payment_data.email,
          'capabilities[card_payments][requested]': 'true',
          'capabilities[transfers][requested]': 'true',
          'metadata[user_id]': payment_data.user_id,
          'metadata[user_type]': payment_data.user_type
        });

        const accountResponse = await fetch('https://api.stripe.com/v1/accounts', {
          method: 'POST',
          headers: stripeHeaders,
          body: accountParams
        });

        if (!accountResponse.ok) {
          throw new Error('Failed to create connected account');
        }

        const accountData = await accountResponse.json();

        // Create account link for onboarding
        const linkParams = new URLSearchParams({
          account: accountData.id,
          refresh_url: payment_data.refresh_url,
          return_url: payment_data.return_url,
          type: 'account_onboarding'
        });

        const linkResponse = await fetch('https://api.stripe.com/v1/account_links', {
          method: 'POST',
          headers: stripeHeaders,
          body: linkParams
        });

        const linkData = await linkResponse.json();

        return {
          success: true,
          account_id: accountData.id,
          onboarding_url: linkData.url
        };

      default:
        return { success: false, error: 'Invalid action' };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}