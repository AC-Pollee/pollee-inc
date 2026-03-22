/**
 * Facebook Integration - Share polls and sync discussions
 * 
 * Usage: Call this function to post polls to Facebook or fetch comments
 */

export default async function handler(request, context) {
  const { base44, secrets } = context;
  const { action, poll_data, page_id, post_id } = request.body;

  const FACEBOOK_ACCESS_TOKEN = secrets.FACEBOOK_ACCESS_TOKEN;
  const FACEBOOK_PAGE_ID = secrets.FACEBOOK_PAGE_ID;

  if (!FACEBOOK_ACCESS_TOKEN) {
    return { success: false, error: 'Facebook access token not configured' };
  }

  const pageId = page_id || FACEBOOK_PAGE_ID;

  try {
    switch (action) {
      case 'post_poll':
        // Post poll to Facebook page
        const postData = new URLSearchParams({
          message: `${poll_data.title}\n\n${poll_data.description}\n\nVote now at: ${poll_data.vote_url}`,
          access_token: FACEBOOK_ACCESS_TOKEN
        });

        const postResponse = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
          method: 'POST',
          body: postData
        });

        if (!postResponse.ok) {
          throw new Error('Failed to post to Facebook');
        }

        const postResult = await postResponse.json();

        return {
          success: true,
          facebook_post_id: postResult.id,
          message: 'Posted to Facebook successfully'
        };

      case 'fetch_comments':
        // Fetch comments from Facebook post
        const commentsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${post_id}/comments?access_token=${FACEBOOK_ACCESS_TOKEN}&fields=id,from,message,created_time`
        );

        if (!commentsResponse.ok) {
          throw new Error('Failed to fetch Facebook comments');
        }

        const commentsData = await commentsResponse.json();

        return {
          success: true,
          comments: commentsData.data.map(comment => ({
            content: comment.message,
            user_name: comment.from.name,
            facebook_comment_id: comment.id,
            created_date: comment.created_time
          }))
        };

      case 'post_comment':
        // Post comment to Facebook
        const commentData = new URLSearchParams({
          message: poll_data.comment_text,
          access_token: FACEBOOK_ACCESS_TOKEN
        });

        const commentResponse = await fetch(`https://graph.facebook.com/v18.0/${post_id}/comments`, {
          method: 'POST',
          body: commentData
        });

        if (!commentResponse.ok) {
          throw new Error('Failed to post comment to Facebook');
        }

        const commentResult = await commentResponse.json();

        return {
          success: true,
          facebook_comment_id: commentResult.id
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