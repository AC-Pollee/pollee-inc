/**
 * Discord Integration - Sync poll discussions with Discord channels
 * 
 * Usage: Call this function to sync comments to/from Discord
 */

export default async function handler(request, context) {
  const { base44, secrets } = context;
  const { action, poll_id, comment_data, discord_channel_id } = request.body;

  const DISCORD_BOT_TOKEN = secrets.DISCORD_BOT_TOKEN;
  const DISCORD_WEBHOOK_URL = secrets.DISCORD_WEBHOOK_URL;

  if (!DISCORD_BOT_TOKEN) {
    return { success: false, error: 'Discord bot token not configured' };
  }

  try {
    switch (action) {
      case 'post_to_discord':
        // Post comment to Discord channel
        const discordMessage = {
          embeds: [{
            title: comment_data.poll_title,
            description: comment_data.content,
            author: {
              name: comment_data.user_name
            },
            color: 5814783, // Indigo color
            timestamp: new Date().toISOString()
          }]
        };

        const discordResponse = await fetch(DISCORD_WEBHOOK_URL || `https://discord.com/api/v10/channels/${discord_channel_id}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(discordMessage)
        });

        if (!discordResponse.ok) {
          throw new Error('Failed to post to Discord');
        }

        const messageData = await discordResponse.json();
        
        return {
          success: true,
          discord_message_id: messageData.id,
          message: 'Posted to Discord successfully'
        };

      case 'fetch_from_discord':
        // Fetch messages from Discord channel
        const fetchResponse = await fetch(`https://discord.com/api/v10/channels/${discord_channel_id}/messages?limit=50`, {
          headers: {
            'Authorization': `Bot ${DISCORD_BOT_TOKEN}`
          }
        });

        if (!fetchResponse.ok) {
          throw new Error('Failed to fetch from Discord');
        }

        const messages = await fetchResponse.json();
        
        // Convert Discord messages to Comment format
        const comments = messages.map(msg => ({
          content: msg.content,
          user_name: msg.author.username,
          discord_message_id: msg.id,
          created_date: msg.timestamp
        }));

        return {
          success: true,
          comments: comments
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