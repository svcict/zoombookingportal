// Real browser Push subscription flow (service worker + Push API), distinct
// from the local-only Notification calls in notifications.ts. Requires the
// server to have VAPID keys configured (GET /api/push/vapid-public-key).

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export type PushSetupResult =
  | { status: 'subscribed' }
  | { status: 'unsupported' }
  | { status: 'permission_denied' }
  | { status: 'not_configured' }
  | { status: 'error'; message: string };

// authHeaders: the signed-in user's session (buildAuthHeaders) - the server
// only lets a browser subscribe to, or remove, that user's own notifications.
export async function enablePushNotifications(
  email: string,
  authHeaders: Record<string, string> = {}
): Promise<PushSetupResult> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { status: 'unsupported' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { status: 'permission_denied' };
    }

    const keyRes = await fetch('/api/push/vapid-public-key');
    const keyData = await keyRes.json();
    if (!keyRes.ok || !keyData.configured) {
      return { status: 'not_configured' };
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });
    }

    const subJson = subscription.toJSON();
    const subscribeRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ email, subscription: subJson }),
    });
    if (!subscribeRes.ok) {
      const data = await subscribeRes.json().catch(() => null);
      return { status: 'error', message: data?.error || data?.message || 'The server rejected the push subscription.' };
    }

    return { status: 'subscribed' };
  } catch (err: any) {
    return { status: 'error', message: err?.message || 'Failed to enable push notifications' };
  }
}

export async function disablePushNotifications(authHeaders: Record<string, string> = {}): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
    }
  } catch (e) {
    // best-effort
  }
}
