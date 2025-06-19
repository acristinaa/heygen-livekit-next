const HEYGEN_BASE = 'https://api.heygen.com/v1';
const API_KEY     = process.env.HEYGEN_API_KEY!;   

async function post<T>(
  path: string,
  body: Record<string, unknown>,
  auth: { apiKey?: true; token?: string },
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth.apiKey)  headers['X-Api-Key']    = API_KEY;
  if (auth.token)   headers['Authorization'] = `Bearer ${auth.token}`;

  const res = await fetch(`${HEYGEN_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`${path} → ${res.status} ${res.statusText}\n${msg}`);
  }
  return res.json() as Promise<T>;
}

interface TokenRes      { data: { token: string } }
interface NewRes        { data: { session_id: string; url: string; access_token: string } }
interface GenericOK     { data: { success: boolean } }
interface TaskOK        { data: { task_id: string } }

export async function createSessionToken(): Promise<string> {
  const json = await post<TokenRes>(
    '/streaming.create_token',
    {},                       // no body required
    { apiKey: true },
  );
  return json.data.token;
}

export async function createNewSession(args: {
  token: string;
  avatar_id: string;
  voice_id?: string;
  version?: 'v2';
  use_custom_server?: boolean;
  server_url?: string;
  token_ttl?: number;
}) {
  const { token, ...payload } = args;
  const json = await post<NewRes>(
    '/streaming.new',
    payload,
    { token },
  );
  return json.data;
}

export async function startSession(args: { token: string; session_id: string }) {
  const { token, session_id } = args;
  return post<GenericOK>(
    '/streaming.start',
    { session_id },
    { token },
  );
}

export async function sendTask(args: {
  token: string;
  session_id: string;
  text: string;
  action?: 'talk' | 'repeat';
}) {
  const { token, ...payload } = args;
  return post<TaskOK>(
    '/streaming.task',
    payload,
    { token },
  );
}

export async function stopSession(args: { token: string; session_id: string }) {
  const { token, session_id } = args;
  return post<GenericOK>(
    '/streaming.stop',
    { session_id },
    { token },
  );
}
