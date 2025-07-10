// /app/api/slack/user/route.ts

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// The shape of the user object we'll use in our app
export type User = {
  id: string;
  name: string;
  avatar: string; // URL for the user's profile picture
};

// A minimal type for Slack's API response
type SlackUserInfoResponse = {
  ok: boolean;
  user?: {
    id: string;
    real_name: string;
    profile: {
      image_72: string;
    };
  };
  error?: string;
};

// Simple in-memory cache for user data on the server.
// This helps reduce API calls for frequently seen users.
const userCache = new Map<string, User>();

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('slack-user-token')?.value;
  const userId = request.nextUrl.searchParams.get('userId');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  // 1. Check our server-side cache first
  if (userCache.has(userId)) {
    return NextResponse.json(userCache.get(userId)!);
  }

  // 2. If not in cache, call Slack's API
  try {
    const slackApiUrl = `https://slack.com/api/users.info?user=${userId}`;
    const slackResponse = await fetch(slackApiUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    const data: SlackUserInfoResponse = await slackResponse.json();

    if (!data.ok || !data.user) {
      return NextResponse.json({ error: data.error || `User ${userId} not found` }, { status: 404 });
    }

    // 3. Format the data and store it in the cache
    const userData: User = {
      id: data.user.id,
      name: data.user.real_name,
      avatar: data.user.profile.image_72,
    };

    userCache.set(userId, userData);

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error fetching user info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}