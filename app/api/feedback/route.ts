import { blockFeedback, pageFeedback } from '@/components/feedback/schema';
import { submitBlockFeedback, submitPageFeedback } from '@/lib/github';

export async function POST(req: Request) {
  const body = await req.json();

  if (body?.blockId) {
    const feedback = blockFeedback.parse(body);
    return Response.json(await submitBlockFeedback(feedback));
  }

  const feedback = pageFeedback.parse(body);
  return Response.json(await submitPageFeedback(feedback));
}