import { NextRequest, NextResponse } from 'next/server';

// Define types for the Slack API response for better safety
type SlackOAuthSuccessResponse = {
  ok: true;
  authed_user: {
    access_token: string;
    // Add other user fields if you need them
  };
  // Add other top-level fields if needed
};

type SlackOAuthErrorResponse = {
  ok: false;
  error: string;
};

type SlackOAuthResponse = SlackOAuthSuccessResponse | SlackOAuthErrorResponse;

export async function GET(request: NextRequest) {
  // 1. Get the 'code' from search parameters
  const code = request.nextUrl.searchParams.get('code');
  console.log("🚀 ~ code:", code);

  // Validate that the code exists
  if (!code) {
    return new NextResponse('Error: No code provided.', { status: 400 });
  }

  const params = new URLSearchParams();
  params.append('client_id', process.env.SLACK_CLIENT_ID!);
  params.append('client_secret', process.env.SLACK_CLIENT_SECRET!);
  params.append('code', code);
  // The redirect_uri must match the one used in the initial auth request
  params.append('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/slack/callback`);
  console.log("🚀 ~ params:", params);

  try {
    const slackResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const data: SlackOAuthResponse = await slackResponse.json();

    // Handle Slack API errors
    if (!data.ok) {
      console.error('Slack API error:', data.error);
      return new NextResponse(`Slack Error: ${data.error}`, { status: 500 });
    }

    const userAccessToken = data.authed_user.access_token;

    if (!userAccessToken) {
        return new NextResponse('Error: User access token not found in Slack response.', { status: 500 });
    }

    // 2. Create a redirect response to the target page
    // Constructing a new URL ensures the redirect is absolute
    const redirectUrl = new URL('/slack-chat', request.url);
    const response = NextResponse.redirect(redirectUrl);

    // 3. Set the token in a secure, httpOnly cookie on the response
    response.cookies.set('slack-user-token', userAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Internal server error:', error);
    return new NextResponse('An internal error occurred.', { status: 500 });
  }
}