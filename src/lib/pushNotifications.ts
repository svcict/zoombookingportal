import webpush from 'web-push';

// Real Web Push (RFC 8030) - no third-party account/service needed, unlike
// email. VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY are a self-generated key pair
// (see README "Push Notifications" for how to generate your own) that
// identify this server to the browser's push service (Chrome's, Firefox's,
// etc.) - there's no "provider" to sign up with beyond that.

let configured = false;

export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function ensureConfigured(): boolean {
  if (configured) return true;
  if (!isPushConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
  return true;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export interface PushSubscriptionRecord {
  id: string;
  email: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: string;
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

// Sends to one subscription; returns false (and the caller should drop the
// subscription) when the browser's push service reports it's gone (410) or
// invalid (404) - normal and expected when a user revokes permission,
// clears site data, or the subscription simply expires.
export async function sendWebPush(
  subscription: PushSubscriptionRecord,
  payload: PushPayload
): Promise<{ delivered: boolean; shouldRemove: boolean }> {
  if (!ensureConfigured()) return { delivered: false, shouldRemove: false };

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys
      },
      JSON.stringify(payload)
    );
    return { delivered: true, shouldRemove: false };
  } catch (err: any) {
    const statusCode = err?.statusCode;
    const shouldRemove = statusCode === 404 || statusCode === 410;
    if (!shouldRemove) {
      console.error(`[push] Failed to send to ${subscription.endpoint}:`, err?.message || err);
    }
    return { delivered: false, shouldRemove };
  }
}
