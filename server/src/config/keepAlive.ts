// Keeps Render free-tier dynos awake. Render puts a free web service to
// sleep after ~15 minutes without inbound traffic; this module hits the
// service's own PUBLIC health endpoint on an interval well under that
// threshold so a warmed-up dyno never dozes off again.
//
// Enable in production by adding to the Render environment:
//   SELF_PING_URL=https://<your-app>.onrender.com
//
// When the variable is absent (e.g. local dev) the loop stays disabled.

const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes (< Render's 15-min idle limit)

let timer: ReturnType<typeof setInterval> | null = null;

const ping = async (url: string): Promise<void> => {
  try {
    const res = await fetch(url, { method: 'GET' });
    console.log(`[KeepAlive] ${url} -> HTTP ${res.status}`);
  } catch (err) {
    console.error('[KeepAlive] ping failed:', (err as Error).message);
  }
};

export const startKeepAlive = (): void => {
  const base = process.env.SELF_PING_URL;
  if (!base) {
    console.log('[KeepAlive] SELF_PING_URL not set — self-ping disabled.');
    return;
  }
  if (timer) return; // already running

  const url = `${base.replace(/\/+$/, '')}/api/v1/health`;
  console.log(`[KeepAlive] Self-ping enabled (every 10 min) -> ${url}`);

  void ping(url);
  timer = setInterval(() => void ping(url), PING_INTERVAL_MS);
};
