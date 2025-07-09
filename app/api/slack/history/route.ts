import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Define the shape of a message object we'll send to the client
export type Message = {
  ts: string;    // Timestamp, serves as a unique ID
  user: string;  // User ID of the sender
  text: string;  // Message content
};

// Minimal type for Slack's history API response
type SlackHistoryResponse = {
  ok: boolean;
  messages?: { ts: string; user: string; text: string }[];
  error?: string;
};

export async function GET(request: NextRequest) {
  // 1. Get token from cookies and channel ID from search parameters
  const cookieStore = await cookies();
  const token = cookieStore.get('slack-user-token')?.value;
  const channel = request.nextUrl.searchParams.get('channel');

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized: No token found.' },
      { status: 401 }
    );
  }

  if (!channel) {
    return NextResponse.json(
      { error: 'Bad Request: Channel ID is required.' },
      { status: 400 }
    );
  }

  // 2. Call Slack's API
  try {
    const slackApiUrl = `https://slack.com/api/conversations.history?channel=${channel}&limit=50`;

    const slackResponse = await fetch(slackApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store', // Ensure fresh data for each request
    });

    const data: SlackHistoryResponse = await slackResponse.json();

    if (!data.ok || !data.messages) {
      // Forward the error from Slack (e.g., "not_in_channel")
      return NextResponse.json(
        { error: data.error || 'Failed to fetch history.' },
        { status: 500 }
      );
    }

    // 3. Format and send the data back
    // We reverse the messages so they appear in chronological order (oldest first)
    const formattedMessages: Message[] = data.messages
      .filter(msg => msg.user && msg.text) // Ensure message has a user and text
      .map(msg => ({
        ts: msg.ts,
        user: msg.user,
        text: msg.text,
      }))
      .reverse();

    return NextResponse.json(formattedMessages);

  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred.' },
      { status: 500 }
    );
  }
}