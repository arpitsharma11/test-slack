import { NextRequest } from 'next/server';
import eventEmitter from '../../../lib/event-emitter'; // Adjust path if needed

export async function GET(request: NextRequest) {
  const channel = request.nextUrl.searchParams.get('channel');

  if (!channel) {
    return new Response('Bad Request: Channel ID is required.', { status: 400 });
  }

  // Create a streaming response using the web standard ReadableStream
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Define the listener function that will be called by the event emitter
      const messageListener = (message: unknown) => {
        // Format the message as a Server-Sent Event (SSE)
        const data = `data: ${JSON.stringify(message)}\n\n`;
        // Enqueue the message into the stream, encoded as UTF-8
        controller.enqueue(encoder.encode(data));
      };

      // Subscribe to events for the specific channel
      console.log(`[SSE] Subscribing to channel: ${channel}`);
      eventEmitter.on(channel, messageListener);

      // The `cancel` method is called when the client closes the connection.
      // This is the perfect place to clean up our listener.
      controller.signal.addEventListener('abort', () => {
        console.log(`[SSE] Client disconnected. Unsubscribing from channel: ${channel}`);
        eventEmitter.removeListener(channel, messageListener);
        controller.close();
      });
    },
  });

  // Return the stream with the appropriate headers for SSE
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}