import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

// Signs demo-account session tokens (see issueDemoSessionToken below). Falls
// back to a per-process random secret so a restart simply requires
// demo users to log back in, rather than ever using a guessable default.
const DEMO_TOKEN_SECRET = process.env.DEMO_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');
const DEMO_TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function getDemoLoginEmails(): Set<string> {
  return new Set(
    (process.env.DEMO_LOGIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Explicitly-allowlisted demo accounts (DEMO_LOGIN_EMAILS) can sign in
 * without a real password, for demoing the app with seeded profiles that
 * were never given a real Supabase Auth password. Unlike the old "any row
 * in the profiles table" fallback this replaced, this requires an admin to
 * opt an email in via env var - self-registering an account (which also
 * creates a profiles row) does NOT grant this.
 */
export function isDemoLoginEmail(email: string): boolean {
  return getDemoLoginEmails().has(email.trim().toLowerCase());
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

export function issueDemoSessionToken(email: string, isAdmin: boolean): string {
  const payload = JSON.stringify({
    email: email.toLowerCase().trim(),
    isAdmin,
    iat: Date.now(),
    exp: Date.now() + DEMO_TOKEN_TTL_MS,
  });
  const encodedPayload = base64UrlEncode(payload);
  const signature = crypto.createHmac('sha256', DEMO_TOKEN_SECRET).update(encodedPayload).digest('base64url');
  return `demo_v1.${encodedPayload}.${signature}`;
}

/**
 * Verifies a token issued by issueDemoSessionToken: correct signature, not
 * expired, and the email is *still* on the DEMO_LOGIN_EMAILS allowlist right
 * now - removing an email from that list immediately invalidates any
 * outstanding demo token for it, even before it would otherwise expire.
 */
export function verifyDemoSessionToken(token: string): { email: string; isAdmin: boolean } | null {
  if (!token.startsWith('demo_v1.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, encodedPayload, signature] = parts;

  const expectedSignature = crypto
    .createHmac('sha256', DEMO_TOKEN_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  if (
    signature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (typeof payload.email !== 'string' || typeof payload.exp !== 'number') return null;
    if (Date.now() > payload.exp) return null;
    if (!isDemoLoginEmail(payload.email) && !isLocalTestAccountEmail(payload.email)) return null;
    return { email: payload.email, isAdmin: Boolean(payload.isAdmin) };
  } catch {
    return null;
  }
}

export function issueM365SsoSessionToken(email: string, isAdmin: boolean): string {
  const payload = JSON.stringify({
    email: email.toLowerCase().trim(),
    isAdmin,
    iat: Date.now(),
    exp: Date.now() + DEMO_TOKEN_TTL_MS,
  });
  const encodedPayload = base64UrlEncode(payload);
  const signature = crypto.createHmac('sha256', DEMO_TOKEN_SECRET).update(encodedPayload).digest('base64url');
  return `m365sso_v1.${encodedPayload}.${signature}`;
}

/**
 * Verifies a token issued by issueM365SsoSessionToken. Unlike
 * verifyDemoSessionToken, there's no allowlist check here: the email inside
 * was already verified by a real Microsoft Entra ID OAuth code exchange plus
 * a Graph /me lookup at the moment this token was issued.
 */
export function verifyM365SsoSessionToken(token: string): { email: string; isAdmin: boolean } | null {
  if (!token.startsWith('m365sso_v1.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, encodedPayload, signature] = parts;

  const expectedSignature = crypto
    .createHmac('sha256', DEMO_TOKEN_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  if (
    signature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (typeof payload.email !== 'string' || typeof payload.exp !== 'number') return null;
    if (Date.now() > payload.exp) return null;
    return { email: payload.email, isAdmin: Boolean(payload.isAdmin) };
  } catch {
    return null;
  }
}

function getAdminBootstrapEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_BOOTSTRAP_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

/** Emails granted admin purely via server config (env var), independent of
 * anything in the database - the only way to create the very first admin,
 * since granting admin through the app itself requires an existing admin. */
export function isAdminBootstrapEmail(email: string): boolean {
  return getAdminBootstrapEmails().has((email || '').trim().toLowerCase());
}

export function listAdminBootstrapEmails(): string[] {
  return Array.from(getAdminBootstrapEmails());
}

/**
 * Whether an email is a real, currently-active admin - checked against the
 * ADMIN_BOOTSTRAP_EMAILS env allowlist first, then the `admin_emails` table
 * (managed from the in-app Admin Users page). This replaces the old
 * `email.includes('admin')` heuristic, which let anyone grant themselves
 * admin just by choosing an email address with "admin" in it.
 *
 * `admin_emails` is a separate table from Supabase Auth's `profiles`
 * (rather than a `profiles.is_admin` column) because `profiles.id` is bound
 * to a real Supabase Auth user, and Microsoft 365 SSO sign-ins - a fully
 * supported login path in this app - never create one.
 */
export async function isGrantedAdminEmail(email: string): Promise<boolean> {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized) return false;
  if (isAdminBootstrapEmail(normalized)) return true;
  const adminClient = getSupabaseAdmin();
  if (!adminClient) return false;
  try {
    const { data } = await adminClient.from('admin_emails').select('email').eq('email', normalized).maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

export async function listGrantedAdminEmails(): Promise<string[]> {
  const adminClient = getSupabaseAdmin();
  if (!adminClient) return [];
  try {
    const { data } = await adminClient.from('admin_emails').select('email').order('created_at', { ascending: true });
    return (data || []).map((row: any) => row.email as string);
  } catch {
    return [];
  }
}

export async function grantAdminEmail(
  email: string,
  grantedBy: string
): Promise<{ success: boolean; error?: string }> {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized) return { success: false, error: 'Email is required.' };
  const adminClient = getSupabaseAdmin();
  if (!adminClient) {
    return { success: false, error: 'Supabase is not configured, so admin grants cannot be persisted.' };
  }
  const { error } = await adminClient.from('admin_emails').upsert({ email: normalized, granted_by: grantedBy });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function revokeAdminEmail(email: string): Promise<{ success: boolean; error?: string }> {
  const normalized = (email || '').trim().toLowerCase();
  const adminClient = getSupabaseAdmin();
  if (!adminClient) {
    return { success: false, error: 'Supabase is not configured, so admin grants cannot be persisted.' };
  }
  const { error } = await adminClient.from('admin_emails').delete().eq('email', normalized);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(url && anonKey && url.trim() !== '' && anonKey.trim() !== '');
}

export function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || url.trim() === '' || anonKey.trim() === '') {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(url.trim(), anonKey.trim(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseClient;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !serviceKey || url.trim() === '' || serviceKey.trim() === '') {
    return null;
  }

  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(url.trim(), serviceKey.trim(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdminClient;
}

export interface VerifiedSession {
  email: string;
  isAdmin: boolean;
}

/**
 * Verifies a bearer token against Supabase Auth and resolves the real,
 * server-checked identity behind it - used in place of trusting any
 * client-supplied identity header. Returns null for a missing, expired,
 * or otherwise invalid token, or if Supabase isn't configured.
 */
export async function verifySessionToken(token: string): Promise<VerifiedSession | null> {
  const client = getSupabase();
  if (!client || !token) return null;

  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user?.email) return null;

    const email = data.user.email.toLowerCase().trim();
    const metadata = data.user.user_metadata || {};
    let isAdmin = metadata.isAdmin === true || metadata.role === 'admin';

    // Cross-check the profiles table (service-role, bypasses RLS) in case
    // is_admin was granted/revoked there directly rather than in the JWT's
    // own metadata, which only reflects state as of sign-in.
    const adminClient = getSupabaseAdmin();
    if (adminClient) {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('is_admin, role')
        .eq('id', data.user.id)
        .maybeSingle();
      if (profile) {
        isAdmin = isAdmin || profile.is_admin === true || profile.role === 'admin';
      }
    }

    return { email, isAdmin };
  } catch {
    return null;
  }
}

export interface SupabaseAuthResult {
  success: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    isAdmin: boolean;
    department?: string;
    avatar?: string;
    tenantName?: string;
    tenantId?: string;
    scopes?: string[];
    accessToken?: string;
    provider?: string;
  };
  error?: string;
}

/**
 * Tests live connection to Supabase database and Auth.
 */
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  url: string | null;
  hasAnonKey: boolean;
  hasServiceRoleKey: boolean;
  profilesCount?: number;
  authUsersCount?: number;
  latencyMs: number;
  error?: string;
}> {
  const startTime = Date.now();
  const client = getSupabaseAdmin() || getSupabase();

  if (!client) {
    return {
      connected: false,
      url: process.env.SUPABASE_URL || null,
      hasAnonKey: Boolean(process.env.SUPABASE_ANON_KEY),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      latencyMs: 0,
      error: 'Supabase URL or API Keys are missing in .env configuration',
    };
  }

  try {
    // 1. Query profiles table
    const { data: profiles, error: profileErr } = await client
      .from('profiles')
      .select('id, email, full_name, is_admin')
      .limit(10);

    let authUsersCount = 0;
    try {
      const adminClient = getSupabaseAdmin();
      if (adminClient) {
        const { data: authUsers } = await adminClient.auth.admin.listUsers();
        if (authUsers?.users) {
          authUsersCount = authUsers.users.length;
        }
      }
    } catch {}

    const latencyMs = Date.now() - startTime;

    if (profileErr) {
      // If table query returned an error
      return {
        connected: false,
        url: process.env.SUPABASE_URL || null,
        hasAnonKey: Boolean(process.env.SUPABASE_ANON_KEY),
        hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        latencyMs,
        error: profileErr.message || 'Error querying Supabase profiles table',
      };
    }

    return {
      connected: true,
      url: process.env.SUPABASE_URL || null,
      hasAnonKey: Boolean(process.env.SUPABASE_ANON_KEY),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      profilesCount: profiles ? profiles.length : 0,
      authUsersCount,
      latencyMs,
    };
  } catch (err: any) {
    return {
      connected: false,
      url: process.env.SUPABASE_URL || null,
      hasAnonKey: Boolean(process.env.SUPABASE_ANON_KEY),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      latencyMs: Date.now() - startTime,
      error: err?.message || 'Failed to connect to Supabase database',
    };
  }
}

/**
 * Authenticates a user strictly with Supabase Auth or verified profiles table.
 */
// Test-only accounts on a reserved, non-routable domain (RFC 2606
// ".test" - can never collide with a real email), always available
// regardless of Supabase configuration, so testing this app never depends
// on Supabase setup (DEMO_LOGIN_EMAILS, profiles rows) being correct.
// Accepts any password (or none) for these exact emails. Must be disabled
// before production - see README "Before Going to Production".
const LOCAL_DEV_TEST_ACCOUNTS: Record<string, { name: string; isAdmin: boolean }> = {
  'admin@local.test': { name: 'Local Test Admin', isAdmin: true },
  'user@local.test': { name: 'Local Test User', isAdmin: false },
};

export function isLocalTestAccountEmail(email: string): boolean {
  return Boolean(LOCAL_DEV_TEST_ACCOUNTS[(email || '').trim().toLowerCase()]);
}

export async function authenticateLocalUser(
  email: string,
  password?: string
): Promise<SupabaseAuthResult> {
  const normalizedEmailForTestAccount = (email || '').trim().toLowerCase();
  const testAccount = LOCAL_DEV_TEST_ACCOUNTS[normalizedEmailForTestAccount];
  if (testAccount) {
    const normalizedEmail = normalizedEmailForTestAccount;
    return {
      success: true,
      user: {
        id: `local-dev-${normalizedEmail}`,
        name: testAccount.name,
        email: normalizedEmail,
        role: testAccount.isAdmin ? 'Administrator' : 'Staff Member',
        isAdmin: testAccount.isAdmin,
        department: 'Local Testing',
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(testAccount.name)}`,
        tenantName: 'Local Test Account',
        tenantId: 'local-dev',
        scopes: testAccount.isAdmin
          ? ['User.Read', 'Calendars.ReadWrite', 'Directory.AccessAsUser.All']
          : ['User.Read', 'Calendars.ReadWrite'],
        accessToken: issueDemoSessionToken(normalizedEmail, testAccount.isAdmin),
        provider: 'demo',
      },
    };
  }

  const client = getSupabase();
  const adminClient = getSupabaseAdmin();

  if (!client) {
    return {
      success: false,
      error: 'Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your environment.',
    };
  }

  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    return {
      success: false,
      error: 'Please enter a valid email address.',
    };
  }

  try {
    // 1. Attempt standard Supabase Auth signInWithPassword
    if (password && password.trim() !== '') {
      const { data: authData, error: authError } = await client.auth.signInWithPassword({
        email: normalizedEmail,
        password: password.trim(),
      });

      if (!authError && authData.user) {
        const sbUser = authData.user;
        const metadata = sbUser.user_metadata || {};
        const isExplicitAdmin =
          metadata.isAdmin === true ||
          metadata.role === 'admin' ||
          (await isGrantedAdminEmail(normalizedEmail));

        const name =
          metadata.name ||
          metadata.full_name ||
          normalizedEmail.split('@')[0].replace(/[._]/g, ' ') ||
          'Ayala Team Member';

        return {
          success: true,
          user: {
            id: sbUser.id,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            email: sbUser.email || normalizedEmail,
            role: metadata.role || (isExplicitAdmin ? 'Administrator' : 'Staff Member'),
            isAdmin: isExplicitAdmin,
            department: metadata.department || 'Ayala Foundation Team',
            avatar:
              metadata.avatar_url ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
            tenantName: 'Ayala Foundation Supabase Workspace',
            tenantId: 'supabase-db-auth',
            scopes: isExplicitAdmin
              ? ['User.Read', 'Calendars.ReadWrite', 'Directory.AccessAsUser.All']
              : ['User.Read', 'Calendars.ReadWrite'],
            accessToken: authData.session?.access_token || `sb_token_${Date.now()}`,
            provider: 'supabase',
          },
        };
      }

      // If user provided a password and auth failed, check if there's a profile
      if (authError && authError.message !== 'Invalid login credentials') {
        // Specific auth errors
        console.warn('Supabase auth error:', authError.message);
      }
    }

    // 2. Passwordless sign-in for explicitly-allowlisted demo accounts only.
    // This used to accept ANY email found in the profiles table with no
    // password check at all - since self-registration also creates a
    // profiles row, that meant anyone could log in as anyone just by
    // knowing their email. Now it only ever applies to emails an admin has
    // opted in via DEMO_LOGIN_EMAILS, and issues a signed, expiring,
    // independently-revocable token rather than a fake one.
    if (isDemoLoginEmail(normalizedEmail)) {
      const targetClient = adminClient || client;
      const { data: profileData, error: profileError } = await targetClient
        .from('profiles')
        .select('*')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      if (!profileError && profileData) {
        const isExplicitAdmin =
          profileData.is_admin === true ||
          profileData.role === 'admin' ||
          (await isGrantedAdminEmail(normalizedEmail));

        const name = profileData.full_name || profileData.name || normalizedEmail.split('@')[0];

        return {
          success: true,
          user: {
            id: profileData.id || `sb-usr-${Date.now()}`,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            email: profileData.email || normalizedEmail,
            role: profileData.role || (isExplicitAdmin ? 'Administrator' : 'Staff Member'),
            isAdmin: isExplicitAdmin,
            department: profileData.department || 'Ayala Foundation Team',
            avatar:
              profileData.avatar_url ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
            tenantName: 'Ayala Foundation Supabase Workspace',
            tenantId: 'supabase-db-auth',
            scopes: isExplicitAdmin
              ? ['User.Read', 'Calendars.ReadWrite', 'Directory.AccessAsUser.All']
              : ['User.Read', 'Calendars.ReadWrite'],
            accessToken: issueDemoSessionToken(normalizedEmail, isExplicitAdmin),
            provider: 'demo',
          },
        };
      }
    }

    return {
      success: false,
      error: 'Invalid credentials or user not found in Supabase Auth / database.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error occurred while communicating with Supabase.',
    };
  }
}

/**
 * Registers a new user into Supabase Auth and creates their profile.
 */
export async function registerSupabaseUser(
  email: string,
  password: string,
  fullName: string,
  department?: string
): Promise<SupabaseAuthResult> {
  const adminClient = getSupabaseAdmin();
  const client = getSupabase();

  if (!client) {
    return {
      success: false,
      error: 'Supabase client is not configured.',
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const isAdmin = await isGrantedAdminEmail(normalizedEmail);

  try {
    // 1. If admin client is available, use admin.createUser to auto-confirm email
    if (adminClient) {
      const { data: adminUser, error: adminErr } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          department: department || 'Ayala Foundation Team',
          role: isAdmin ? 'Administrator' : 'Staff Member',
          isAdmin,
        },
      });

      if (adminErr) {
        // If user already exists, update their profile
        if (adminErr.message.includes('already exists') || adminErr.message.includes('already registered')) {
          return {
            success: false,
            error: 'User already exists in Supabase. Please sign in.',
          };
        }
        return {
          success: false,
          error: adminErr.message,
        };
      }

      if (adminUser?.user) {
        // Upsert into profiles table
        await adminClient.from('profiles').upsert({
          id: adminUser.user.id,
          email: normalizedEmail,
          full_name: fullName,
          department: department || 'Ayala Foundation Team',
          role: isAdmin ? 'Administrator' : 'Staff Member',
          is_admin: isAdmin,
        });

        return {
          success: true,
          user: {
            id: adminUser.user.id,
            name: fullName,
            email: normalizedEmail,
            role: isAdmin ? 'Administrator' : 'Staff Member',
            isAdmin,
            department: department || 'Ayala Foundation Team',
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
            tenantName: 'Ayala Foundation Supabase Workspace',
            tenantId: 'supabase-db-auth',
            scopes: isAdmin
              ? ['User.Read', 'Calendars.ReadWrite', 'Directory.AccessAsUser.All']
              : ['User.Read', 'Calendars.ReadWrite'],
            accessToken: `sb_token_${Date.now()}`,
            provider: 'supabase',
          },
        };
      }
    }

    // 2. Fallback to client.auth.signUp
    const { data: signUpData, error: signUpErr } = await client.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          department: department || 'Ayala Foundation Team',
          role: isAdmin ? 'Administrator' : 'Staff Member',
          isAdmin,
        },
      },
    });

    if (signUpErr) {
      return {
        success: false,
        error: signUpErr.message,
      };
    }

    const sbUser = signUpData.user;
    if (sbUser) {
      // Upsert into profiles
      await client.from('profiles').upsert({
        id: sbUser.id,
        email: normalizedEmail,
        full_name: fullName,
        department: department || 'Ayala Foundation Team',
        role: isAdmin ? 'Administrator' : 'Staff Member',
        is_admin: isAdmin,
      });

      return {
        success: true,
        user: {
          id: sbUser.id,
          name: fullName,
          email: normalizedEmail,
          role: isAdmin ? 'Administrator' : 'Staff Member',
          isAdmin,
          department: department || 'Ayala Foundation Team',
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
          tenantName: 'Ayala Foundation Supabase Workspace',
          tenantId: 'supabase-db-auth',
          scopes: isAdmin
            ? ['User.Read', 'Calendars.ReadWrite', 'Directory.AccessAsUser.All']
            : ['User.Read', 'Calendars.ReadWrite'],
          accessToken: signUpData.session?.access_token || `sb_token_${Date.now()}`,
          provider: 'supabase',
        },
      };
    }

    return {
      success: false,
      error: 'Failed to create user in Supabase.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error creating user in Supabase.',
    };
  }
}
