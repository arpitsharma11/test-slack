// /app/api/slack/events/route.ts

import { NextRequest } from 'next/server';
import crypto from 'crypto-js';
import eventEmitter from '../../../lib/event-emitter';

export async function POST(request: NextRequest) {
  // NEW: Log that the endpoint was hit
  console.log('[EVENTS] Received a request from Slack.');

  const signature = request.headers.get('x-slack-signature');
  const timestamp = Number(request.headers.get('x-slack-request-timestamp'));
  const signingSecret = process.env.SLACK_SIGNING_SECRET!;

  if (!signature || !timestamp) {
    console.error('[EVENTS] ERROR: Missing Slack signature headers.');
    return new Response('Missing Slack signature headers', { status: 400 });
  }

  // Protect against replay attacks
  if (Math.abs(Date.now() / 1000 - timestamp) > 60 * 5) {
    console.error('[EVENTS] ERROR: Request timestamp is too old.');
    return new Response('Request timed out', { status: 403 });
  }

  const rawBody = await request.text();
  const sigBasestring = `v0:${timestamp}:${rawBody}`;
  const mySignature = `v0=${crypto.HmacSHA256(sigBasestring, signingSecret).toString()}`;

  if (mySignature !== signature) {
    // NEW: Log the failure
    console.error('[EVENTS] ERROR: Signature verification failed!');
    console.error(`[EVENTS] > Expected: ${mySignature}`);
    console.error(`[EVENTS] > Received: ${signature}`);
    return new Response('Signature verification failed', { status: 403 });
  }

  // NEW: Log successful verification
  console.log('[EVENTS] Signature verification successful!');

  const body = JSON.parse(rawBody);
  
  // NEW: Log the entire payload from Slack
  console.log('[EVENTS] Parsed body from Slack:', JSON.stringify(body, null, 2));

  // Handle URL verification challenge
  if (body.type === 'url_verification') {
    console.log('[EVENTS] Responding to URL verification challenge.');
    return new Response(body.challenge, { status: 200 });
  }

  // Handle incoming message events
  if (body.type === 'event_callback') {
    const event = body.event;
    console.log('[EVENTS] Received event_callback containing event type:', event.type);

    if (event.type === 'message' && !event.subtype) {
      // NEW: Log right before emitting the event
      console.log(`[EVENTS] Emitting 'message' event for channel: ${event.channel}`);
      eventEmitter.emit(event.channel, {
        ts: event.ts,
        user: event.user,
        text: event.text,
      });
    } else {
      console.log(`[EVENTS] Ignoring event subtype '${event.subtype}' or type '${event.type}'.`);
    }
  }

  // NEW: Log before sending the final response
  console.log('[EVENTS] Sending 200 OK response to Slack.');
  return new Response('OK', { status: 200 });
}