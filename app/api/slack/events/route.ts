import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto-js';
import eventEmitter from '../../../lib/event-emitter'; // Adjust path if needed

export async function POST(request: NextRequest) {
  // 1. Verify the request is from Slack
  const signature = request.headers.get('x-slack-signature');
  const timestamp = Number(request.headers.get('x-slack-request-timestamp'));
  const signingSecret = process.env.SLACK_SIGNING_SECRET!;

  if (!signature || !timestamp) {
    return new Response('Missing Slack signature headers', { status: 400 });
  }

  // Protect against replay attacks by checking if the timestamp is recent
  const fiveMinutesInSeconds = 60 * 5;
  if (Math.abs(Date.now() / 1000 - timestamp) > fiveMinutesInSeconds) {
    return new Response('Request timed out', { status: 403 });
  }

  // Get the raw text body for signature verification
  const rawBody = await request.text();
  const sigBasestring = `v0:${timestamp}:${rawBody}`;
  const mySignature = `v0=${crypto.HmacSHA256(sigBasestring, signingSecret).toString()}`;

  if (mySignature !== signature) {
    return new Response('Signature verification failed', { status: 403 });
  }

  // At this point, the request is verified. Parse the body.
  const body = JSON.parse(rawBody);

  // 2. Handle the one-time URL verification challenge from Slack
  if (body.type === 'url_verification') {
    return new Response(body.challenge, { status: 200 });
  }

  // 3. Handle incoming message events
  if (body.type === 'event_callback') {
    const event = body.event;
    
    // We only care about standard messages, not subtypes like 'channel_join'
    if (event.type === 'message' && !event.subtype) {
      console.log(`Emitting event for channel: ${event.channel}`);
      // Emit the event to our in-memory bus. The channel ID is the event name.
      eventEmitter.emit(event.channel, {
        ts: event.ts,
        user: event.user,
        text: event.text,
      });
    }
  }

  // Respond to Slack immediately so it knows we received the event
  return new Response('OK', { status: 200 });
}