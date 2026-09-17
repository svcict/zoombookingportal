import { M365User } from '../types';

// Builds the identity headers sent with API requests. When the backend has
// Supabase configured, it verifies the Authorization bearer token itself
// and ignores X-User-Email entirely; X-User-Email is only consulted as a
// fallback when the backend has no Supabase configuration at all (local/
// demo mode), so it's still sent for that case to keep working there.
export function buildAuthHeaders(user: M365User | null | undefined): Record<string, string> {
  if (!user?.email) return {};
  const headers: Record<string, string> = { 'X-User-Email': user.email };
  if (user.accessToken) {
    headers['Authorization'] = `Bearer ${user.accessToken}`;
  }
  return headers;
}
