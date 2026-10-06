/**
 * Discord Integration - Sync poll discussions with Discord channels
 *
 * Requires an authenticated moderator/admin caller. Posting is restricted
 * to the configured Discord webhook URL (no caller-supplied channels).
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
    const { action, poll_id, comment_data, discord_channel_id } = body || {};

    const DISCORD_BOT_TOKEN = secrets.get('DISCORD_BOT_TOKEN');
    const DISCORD_WEBHOOK_URL = secrets.get('DISCORD_WEBHOOK_URL');

    if (!DISCORD_BOT_TOKEN) {
      return Response.json({ success: false, error: 'Discord bot token not configured' }, { status: 500 });
    }

    switch (action) {
      case 'post_to_discord': {
        // Only post to the configured webhook URL — never a caller-supplied channel
        if (!DISCORD_WEBHOOK_URL) {
          return Response.json({ success: false, error: 'Discord webhook URL not configured' }, { status: 500 });
        }

        const discordMessage = {
          embeds: [{
            title: comment_data.poll_title,
            description: comment_data.content,
            author: { name: comment_data.user_name },
            color: 5814783,
            timestamp: new Date().toISOString()
          }]
        };

        const discordResponse = await fetch(DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(discordMessage)
        });

        if (!discordResponse.ok) throw new Error('Failed to post to Discord');
        const messageData = await discordResponse.json();

        return Response.json({
          success: true,
          discord_message_id: messageData.id,
          message: 'Posted to Discord successfully'
        });
      }

      case 'fetch_from_discord': {
        if (!discord_channel_id) {
          return Response.json({ success: false, error: 'discord_channel_id is required' }, { status: 400 });
        }

        const fetchResponse = await fetch(`https://discord.com/api/v10/channels/${discord_channel_id}/messages?limit=50`, {
          headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` }
        });

        if (!fetchResponse.ok) throw new Error('Failed to fetch from Discord');
        const messages = await fetchResponse.json();

        const comments = messages.map(msg => ({
          content: msg.content,
          user_name: msg.author.username,
          discord_message_id: msg.id,
          created_date: msg.timestamp
        }));

        return Response.json({ success: true, comments });
      }

      default:
        return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}