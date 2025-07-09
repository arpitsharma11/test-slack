// /lib/event-emitter.ts
import { EventEmitter } from 'events';

// This is a simple in-memory event bus.
// NOTE: As mentioned, this will not work reliably on a serverless platform like Vercel.
const eventEmitter = new EventEmitter();

export default eventEmitter;