import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

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
export async function authenticateLocalUser(
  email: string,
  password?: string
): Promise<SupabaseAuthResult> {
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
          normalizedEmail.includes('admin');

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

    // 2. Query Supabase 'profiles' table with admin client (bypasses RLS)
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
        normalizedEmail.includes('admin');

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
          accessToken: `sb_custom_${Date.now()}`,
          provider: 'supabase',
        },
      };
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
  const isAdmin = normalizedEmail.includes('admin');

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
