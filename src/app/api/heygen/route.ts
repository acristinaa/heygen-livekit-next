import { NextRequest, NextResponse } from 'next/server';
import {
  createSessionToken,
  createNewSession,
  startSession,
  sendTask,
  stopSession,
} from '@/lib/heygen';

export async function POST(req: NextRequest) {
  const body = await req.json();

  switch (body.op) {
    case 'token':
      return NextResponse.json({ token: await createSessionToken() });

    case 'new':
      return NextResponse.json(await createNewSession(body));

    case 'start':
      return NextResponse.json(await startSession(body));

    case 'task':
      return NextResponse.json(await sendTask(body));

    case 'stop':
      return NextResponse.json(await stopSession(body));

    default:
      return NextResponse.json({ error: 'Unknown op' }, { status: 400 });
  }
}
