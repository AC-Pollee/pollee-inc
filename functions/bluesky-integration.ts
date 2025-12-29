/**
 * Blue Sky Integration - Share polls and sync discussions
 * 
 * Usage: Call this function to post polls to Blue Sky or fetch replies
 */

export default async function handler(request, context) {
  const { base44, secrets } = context;
  const { action, poll_data, post_uri } = request.body;

  const BLUESKY_IDENTIFIER = secrets.BLUESKY_IDENTIFIER;
  const BLUESKY_PASSWORD = secrets.BLUESKY_PASSWORD;

  if (!BLUESKY_IDENTIFIER || !BLUESKY_PASSWORD) {
    return { success: false, error: 'Blue Sky credentials not configured' };
  }

  try {
    // Authenticate with Blue Sky
    const authResponse = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: BLUESKY_IDENTIFIER,
        password: BLUESKY_PASSWORD
      })
    });

    if (!authResponse.ok) {
      throw new Error('Failed to authenticate with Blue Sky');
    }

    const authData = await authResponse.json();
    const accessToken = authData.accessJwt;

    switch (action) {
      case 'post_poll':
        // Create a post on Blue Sky
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

        if (!postResponse.ok) {
          throw new Error('Failed to post to Blue Sky');
        }

        const postResult = await postResponse.json();

        return {
          success: true,
          bluesky_uri: postResult.uri,
          message: 'Posted to Blue Sky successfully'
        };

      case 'fetch_replies':
        // Fetch replies/thread from Blue Sky post
        const repliesResponse = await fetch(
          `https://bsky.social/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(post_uri)}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );

        if (!repliesResponse.ok) {
          throw new Error('Failed to fetch Blue Sky replies');
        }

        const threadData = await repliesResponse.json();
        const replies = threadData.thread?.replies || [];

        return {
          success: true,
          comments: replies.map(reply => ({
            content: reply.post?.record?.text || '',
            user_name: reply.post?.author?.displayName || reply.post?.author?.handle,
            bluesky_uri: reply.post?.uri,
            created_date: reply.post?.record?.createdAt
          }))
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