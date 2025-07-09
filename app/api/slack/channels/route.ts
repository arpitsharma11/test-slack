import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Define the shape of the channel data we want to send to the frontend
type Channel = {
  id: string;
  name: string;
};

// A minimal type for Slack's API response
type SlackChannelsResponse = {
  ok: boolean;
  channels?: { id: string; name: string }[];
  error?: string;
};

export async function GET() {
  // 1. Get the user's token from the secure cookie using the 'next/headers' cookies function
  const cookieStore = await cookies();
  const token = cookieStore.get('slack-user-token')?.value;
  console.log("🚀 ~ GET ~ token:", token)

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized: No token found.' },
      { status: 401 }
    );
  }

  // 2. Call Slack's API to get a list of the user's conversations
  try {
    const slackApiUrl = `https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=200`;
    
    const slackResponse = await fetch(slackApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      // Optional: Add caching strategy for fetch requests in Next.js 13+
      cache: 'no-store', 
    });

    const data: SlackChannelsResponse = await slackResponse.json();

    if (!data.ok || !data.channels) {
      console.error('Slack API error:', data.error);
      return NextResponse.json(
        { error: data.error || 'Failed to fetch channels from Slack.' },
        { status: 500 }
      );
    }

    // 3. Format the data and send it back to the frontend using NextResponse.json
    const filteredChannels: Channel[] = data.channels.map(channel => ({
      id: channel.id,
      name: channel.name,
    }));

    return NextResponse.json(filteredChannels);
    
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred.' },
      { status: 500 }
    );
  }
}