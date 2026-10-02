import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const GOOGLE_DOC = 'application/vnd.google-apps.document';
const SUPER_ADMIN_EMAIL = 'ac@acproductiondesign.com';

export default async function(req) {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);
    const data = body.data || {};
    const meta = data._provider_meta || {};
    const state = meta['x-goog-resource-state'];

    // Google Drive sends a 'sync' ack on first webhook registration — nothing to process
    if (state === 'sync') return Response.json({ status: 'sync_ack' });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Load the saved page token (incremental sync cursor)
    const existing = await base44.asServiceRole.entities.SyncState.filter({ label: 'googledrive' });
    let syncRecord = existing.length > 0 ? existing[0] : null;

    if (!syncRecord) {
      const tokenRes = await fetch(
        'https://www.googleapis.com/drive/v3/changes/startPageToken',
        { headers: authHeader }
      );
      const { startPageToken } = await tokenRes.json();
      await base44.asServiceRole.entities.SyncState.create({
        page_token: startPageToken,
        label: 'googledrive'
      });
      return Response.json({ status: 'initialized' });
    }

    // Fetch all pages of changes since the last cursor
    const fields = 'changes(file(id,name,mimeType,trashed),removed),newStartPageToken,nextPageToken';
    let changesUrl = `https://www.googleapis.com/drive/v3/changes?fields=${encodeURIComponent(fields)}&pageToken=${syncRecord.page_token}`;
    const allChanges = [];
    let newPageToken = null;

    while (changesUrl) {
      const changesRes = await fetch(changesUrl, { headers: authHeader });
      if (!changesRes.ok) {
        return Response.json(
          { status: 'api_error', detail: await changesRes.text() },
          { status: 502 }
        );
      }
      const page = await changesRes.json();
      allChanges.push(...(page.changes || []));
      if (page.newStartPageToken) newPageToken = page.newStartPageToken;
      changesUrl = page.nextPageToken
        ? `https://www.googleapis.com/drive/v3/changes?fields=${encodeURIComponent(fields)}&pageToken=${page.nextPageToken}`
        : null;
    }

    // Find an infomarian to assign pending content to (super admin first, else first active)
    const infomarians = await base44.asServiceRole.entities.Infomarian.list();
    const assignee =
      infomarians.find((i) => i.user_email === SUPER_ADMIN_EMAIL) ||
      infomarians.find((i) => i.status === 'active') ||
      null;

    let processed = 0;

    for (const change of allChanges) {
      const file = change.file;
      const removed = change.removed || (file && file.trashed);

      // Skip deletions — file metadata is usually gone, so we can't confirm it was a policy doc
      if (removed) continue;

      // Only process Google Docs whose name contains "policy" (case-insensitive)
      const isPolicyDoc =
        file && file.name && file.mimeType === GOOGLE_DOC && /policy/i.test(file.name);
      if (!isPolicyDoc) continue;

      const fileUrl = `https://docs.google.com/document/d/${file.id}/edit`;

      // 1. Audit log entry
      const audit = await base44.asServiceRole.entities.PolicyChange.create({
        file_id: file.id,
        file_name: file.name,
        mime_type: file.mimeType,
        change_type: 'updated',
        file_url: fileUrl,
        processed_at: new Date().toISOString()
      });

      // 2. Pending content library item for infomarian review
      let contentItemId = null;
      if (assignee) {
        const item = await base44.asServiceRole.entities.ContentLibraryItem.create({
          title: file.name,
          description: 'Auto-imported from a Google Drive policy document update.',
          content_type: 'url',
          url: fileUrl,
          infomarian_id: assignee.infomarian_id,
          infomarian_name: assignee.full_name,
          tags: ['policy', 'google-drive', 'auto-imported'],
          source: 'infomarian',
          moderation_status: 'pending'
        });
        contentItemId = item.id;
        await base44.asServiceRole.entities.PolicyChange.update(audit.id, {
          content_item_id: contentItemId
        });
      }

      processed++;
    }

    // Save the new cursor after successful processing
    if (newPageToken) {
      await base44.asServiceRole.entities.SyncState.update(syncRecord.id, {
        page_token: newPageToken
      });
    }

    return Response.json({ status: 'processed', count: processed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}