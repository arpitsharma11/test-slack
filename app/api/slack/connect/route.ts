import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';

export async function GET() {
  const scopes = [
    'channels:history',
    'chat:write',
    'channels:read',
    'groups:read',
  ].join(',');

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/slack/callback`;

  const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=${scopes}&user_scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  console.log("🚀 ~ GET ~ authUrl:", authUrl);
  
  // In the App Router, you redirect by returning a NextResponse object.
  return NextResponse.redirect(authUrl);
}