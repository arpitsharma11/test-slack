import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// This is the shape of the message object returned by Slack's API
// which we will forward to our client for an optimistic update.
type SlackMessage = {
  ts: string;
  user: string;
  text: string;
};

type SlackPostMessageResponse = {
  ok: boolean;
  channel?: string;
  ts?: string;
  message?: SlackMessage;
  error?: string;
};

export async function POST(request: NextRequest) {
  // 1. Get the token from the cookie
  const cookieStore = await cookies();
  const token = cookieStore.get('slack-user-token')?.value;
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized: No token found.' },
      { status: 401 }
    );
  }

  try {
    // 2. Get the channel and text from the request body
    const { channel, text } = await request.json();
    if (!channel || !text) {
      return NextResponse.json(
        { error: 'Bad Request: Channel and text are required.' },
        { status: 400 }
      );
    }

    // 3. Call Slack's chat.postMessage API
    const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        channel: channel,
        text: text,
      }),
    });

    const data: SlackPostMessageResponse = await slackResponse.json();

    // 4. Handle the response from Slack
    if (!data.ok || !data.message) {
      console.error('Slack API error:', data.error);
      return NextResponse.json(
        { error: data.error || 'Failed to post message.' },
        { status: 500 }
      );
    }

    // 5. Success! Return the newly created message object.
    return NextResponse.json(data.message);

  } catch (error) {
    console.error('Internal server error:', error);
    // This will catch errors from request.json() if body is malformed, or any other error.
    return NextResponse.json(
      { error: 'An internal error occurred.' },
      { status: 500 }
    );
  }
}