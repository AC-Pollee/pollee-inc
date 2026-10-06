/**
 * Send a notification email with recipient validation.
 *
 * Validates every recipient against registered app users (or the fixed board
 * address) so user-supplied input can never direct the app's email sender to
 * an arbitrary external address. The message body is rendered as plain text
 * with a length limit.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const BOARD_EMAIL = 'ac@acproductiondesign.com';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { recipients, subject, message, context_label } = body || {};

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return Response.json({ error: 'recipients array is required' }, { status: 400 });
    }
    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'message is required' }, { status: 400 });
    }

    // Validate all recipients are registered app users or the fixed board address
    const users = await base44.asServiceRole.entities.User.list();
    const userEmails = new Set(users.map(u => u.email?.toLowerCase()).filter(Boolean));
    const validRecipients = recipients.filter(r =>
      r && typeof r === 'string' && (r.toLowerCase() === BOARD_EMAIL || userEmails.has(r.toLowerCase()))
    );

    if (validRecipients.length === 0) {
      return Response.json({ error: 'No valid recipients — all must be registered app users' }, { status: 400 });
    }

    const safeMessage = String(message).slice(0, 5000);
    const safeSubject = String(subject || 'Pollee notification').slice(0, 200);
    const senderName = caller.full_name || caller.email;
    const emailBody = `${context_label || 'Pollee notification'}

From: ${senderName} (${caller.email})

Message:
${safeMessage}

You are receiving this because the report was forwarded to your level. Please review it in the Pollee app.`;

    let sent = 0;
    for (const recipient of validRecipients) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: recipient,
          subject: safeSubject,
          body: emailBody
        });
        sent++;
      } catch (err) {
        // continue with other recipients
      }
    }

    return Response.json({ ok: true, sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}