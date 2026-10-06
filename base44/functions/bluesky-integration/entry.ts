/**
 * Blue Sky Integration - Share polls and sync discussions
 *
 * Requires an authenticated moderator/admin caller.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { canModerate } from '../../shared/moderation.ts';

export default async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const allowed = await canModerate(base44, caller);
    if (!allowed) return Response.json({ error: 'Not authorized' }, { status: 403 });

    const body = await req.json();
    const { action, poll_data, post_uri } = body || {};

    const BLUESKY_IDENTIFIER = secrets.get('BLUESKY_IDENTIFIER');
    const BLUESKY_PASSWORD = secrets.get('BLUESKY_PASSWORD');

    if (!BLUESKY_IDENTIFIER || !BLUESKY_PASSWORD) {
      return Response.json({ success: false, error: 'Blue Sky credentials not configured' }, { status: 500 });
    }

    // Authenticate with Blue Sky
    const authResponse = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: BLUESKY_IDENTIFIER,
        password: BLUESKY_PASSWORD
      })
    });

    if (!authResponse.ok) throw new Error('Failed to authenticate with Blue Sky');
    const authData = await authResponse.json();
    const accessToken = authData.accessJwt;

    switch (action) {
      case 'post_poll': {
        const postRecord = {
          repo: authData.did,
          collection: 'app.bsky.feed.post',
          record: {
            text: `${poll_data.title}\n\n${poll_data.description}\n\nVote now: ${poll_data.vote_url}`,
            createdAt: new Date().toISOString(),
            $type: 'app.bsky.feed.post'
          }
        };

        const postResponse = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(postRecord)
        });

        if (!postResponse.ok) throw new Error('Failed to post to Blue Sky');
        const postResult = await postResponse.json();

        return Response.json({
          success: true,
          bluesky_uri: postResult.uri,
          message: 'Posted to Blue Sky successfully'
        });
      }

      case 'fetch_replies': {
        const repliesResponse = await fetch(
          `https://bsky.social/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(post_uri)}`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );

        if (!repliesResponse.ok) throw new Error('Failed to fetch Blue Sky replies');
        const threadData = await repliesResponse.json();
        const replies = threadData.thread?.replies || [];

        return Response.json({
          success: true,
          comments: replies.map(reply => ({
            content: reply.post?.record?.text || '',
            user_name: reply.post?.author?.displayName || reply.post?.author?.handle,
            bluesky_uri: reply.post?.uri,
            created_date: reply.post?.record?.createdAt
          }))
        });
      }

      default:
        return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}