/**
 * Facebook Integration - Share polls and sync discussions
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
    const { action, poll_data, page_id, post_id } = body || {};

    const FACEBOOK_ACCESS_TOKEN = secrets.get('FACEBOOK_ACCESS_TOKEN');
    const FACEBOOK_PAGE_ID = secrets.get('FACEBOOK_PAGE_ID');

    if (!FACEBOOK_ACCESS_TOKEN) {
      return Response.json({ success: false, error: 'Facebook access token not configured' }, { status: 500 });
    }

    // Only allow the configured page ID — ignore caller-supplied page_id
    const pageId = FACEBOOK_PAGE_ID || page_id;

    switch (action) {
      case 'post_poll': {
        const postData = new URLSearchParams({
          message: `${poll_data.title}\n\n${poll_data.description}\n\nVote now at: ${poll_data.vote_url}`,
          access_token: FACEBOOK_ACCESS_TOKEN
        });

        const postResponse = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
          method: 'POST',
          body: postData
        });

        if (!postResponse.ok) throw new Error('Failed to post to Facebook');
        const postResult = await postResponse.json();

        return Response.json({
          success: true,
          facebook_post_id: postResult.id,
          message: 'Posted to Facebook successfully'
        });
      }

      case 'fetch_comments': {
        const commentsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${post_id}/comments?access_token=${FACEBOOK_ACCESS_TOKEN}&fields=id,from,message,created_time`
        );

        if (!commentsResponse.ok) throw new Error('Failed to fetch Facebook comments');
        const commentsData = await commentsResponse.json();

        return Response.json({
          success: true,
          comments: commentsData.data.map(comment => ({
            content: comment.message,
            user_name: comment.from.name,
            facebook_comment_id: comment.id,
            created_date: comment.created_time
          }))
        });
      }

      case 'post_comment': {
        const commentData = new URLSearchParams({
          message: poll_data.comment_text,
          access_token: FACEBOOK_ACCESS_TOKEN
        });

        const commentResponse = await fetch(`https://graph.facebook.com/v18.0/${post_id}/comments`, {
          method: 'POST',
          body: commentData
        });

        if (!commentResponse.ok) throw new Error('Failed to post comment to Facebook');
        const commentResult = await commentResponse.json();

        return Response.json({
          success: true,
          facebook_comment_id: commentResult.id
        });
      }

      default:
        return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}