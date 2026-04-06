import { handler } from '@/lib/ai/chat-route';

export function POST(req: Request) {
  return handler.handler(req);
}
