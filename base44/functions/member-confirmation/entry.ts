import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Generates and emails a random 6-digit confirmation code to the member after
// they complete their initial registration fields, then verifies the code they
// paste back. The code is stored on the user record and cleared on success.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body?.action;

    if (action === 'send') {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await base44.asServiceRole.entities.User.update(user.id, { confirmation_code: code });

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: user.email,
          template_name: 'AccountConfirmation',
          variables: {
            first_name: user.full_name || '',
            confirmation_code: code,
            confirmation_url: 'https://pollee-app.org/NewUserRegistration'
          }
        });
      } catch (e) {
        // email send failed; code still stored so user can verify if email arrives
      }

      return Response.json({ ok: true });
    }

    if (action === 'verify') {
      const enteredCode = String(body?.code || '').trim();
      if (!enteredCode) {
        return Response.json({ error: 'Please enter the confirmation code' }, { status: 400 });
      }

      const freshUser = await base44.asServiceRole.entities.User.get(user.id);
      if (!freshUser || !freshUser.confirmation_code) {
        return Response.json({ error: 'No confirmation code found. Please request a new code.' }, { status: 400 });
      }

      if (enteredCode !== String(freshUser.confirmation_code)) {
        return Response.json({ error: 'The code does not match. Please try again.' }, { status: 400 });
      }

      await base44.asServiceRole.entities.User.update(user.id, {
        confirmation_code: '',
        confirmation_verified: true
      });
      return Response.json({ ok: true, verified: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}