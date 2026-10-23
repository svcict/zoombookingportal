import { M365User } from '../types';

// Builds the identity headers sent with API requests: the session token the
// server verifies itself (Supabase, M365 SSO or demo session). There is no
// self-asserted email header any more - the server never trusts one.
export function buildAuthHeaders(user: M365User | null | undefined): Record<string, string> {
  if (!user?.accessToken) return {};
  return { Authorization: `Bearer ${user.accessToken}` };
}
