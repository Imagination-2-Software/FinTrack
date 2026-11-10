import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

function resolveEnvVar(...candidates: (string | undefined)[]): string {
  for (const candidate of candidates) {
    if (candidate) {
      const trimmed = candidate.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return '';
}

const supabaseUrl = resolveEnvVar(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_URL
);
const serviceRoleKey = resolveEnvVar(
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  process.env.SUPABASE_SERVICE_KEY
);
const emailSchema = z.string().trim().email().max(255);
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
const anonKey = resolveEnvVar(
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  process.env.VITE_SUPABASE_ANON_KEY,
  process.env.SUPABASE_ANON_KEY
);

export { resolveEnvVar };

async function handleAdminRequest(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      error: 'Serverless environment is not configured with SUPABASE_SERVICE_ROLE_KEY and database URL.',
    });
  }

  // 1. Verify caller's JWT authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Bearer token is required.' });
  }

  const token = authHeader.slice(7).trim();
  const authVerificationClient = createClient(supabaseUrl, anonKey || serviceRoleKey);
  const { data: authData, error: authError } = await authVerificationClient.auth.getUser(token);

  if (authError || !authData.user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired authentication token.' });
  }

  const callerUserId = authData.user.id;

  // 2. Initialize service-role admin client
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 3. Confirm active administrator status
  const { data: callerProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, role, is_active')
    .eq('id', callerUserId)
    .maybeSingle();

  if (profileError) {
    console.error('[api/admin/users] Profile lookup failed:', {
      errorCode: profileError.code ?? null,
      message: profileError.message,
    });
    return res.status(403).json({ error: 'Forbidden: Unable to verify administrator profile.' });
  }

  if (!callerProfile) {
    return res.status(403).json({ error: 'Forbidden: Admin profile not found.' });
  }

  if (callerProfile.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Administrator role is required.' });
  }

  if (!callerProfile.is_active) {
    return res.status(403).json({ error: 'Forbidden: Account is deactivated.' });
  }

  const { action } = req.body ?? {};

  // --------------------------------------------------------------------------
  // Action: Invite User
  // Send an invitation rather than creating an unconfirmed account silently.
  // --------------------------------------------------------------------------
  if (action === 'create-user') {
    const { email, fullName } = req.body ?? {};
    const parsedEmail = emailSchema.safeParse(email);

    if (!parsedEmail.success) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    if (fullName !== undefined && (typeof fullName !== 'string' || fullName.trim().length > 60)) {
      return res.status(400).json({ error: 'Full name must be 60 characters or fewer.' });
    }

    const { data: invitedUser, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      parsedEmail.data,
      { data: { full_name: typeof fullName === 'string' ? fullName.trim() : '' } }
    );

    if (inviteError) {
      return res.status(400).json({ error: inviteError.message });
    }

    return res.status(201).json({
      message: 'Invitation email sent. The user must accept the invitation before signing in.',
      user: {
        id: invitedUser.user.id,
        email: invitedUser.user.email,
      },
    });
  }

  // --------------------------------------------------------------------------
  // Action: Change User Password
  // Server-side administrative password update
  // --------------------------------------------------------------------------
  if (action === 'change-password') {
    const { targetUserId, newPassword } = req.body ?? {};

    if (!targetUserId || typeof targetUserId !== 'string') {
      return res.status(400).json({ error: 'Target user ID is required.' });
    }

    if (
      !newPassword ||
      typeof newPassword !== 'string' ||
      newPassword.length < 8 ||
      !passwordPattern.test(newPassword)
    ) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters and include uppercase, lowercase, and a number.',
      });
    }

    const { error: updatePasswordError } = await adminClient.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
    });

    if (updatePasswordError) {
      return res.status(400).json({ error: updatePasswordError.message });
    }

    return res.status(200).json({ message: 'User password updated successfully.' });
  }

  // --------------------------------------------------------------------------
  // Action: Permanent Delete User
  // Strict guard: Block deletion if financial transaction ledger records exist
  // Prevent self-deletion
  // --------------------------------------------------------------------------
  if (action === 'delete-user') {
    const { targetUserId } = req.body ?? {};

    if (!targetUserId || typeof targetUserId !== 'string') {
      return res.status(400).json({ error: 'Target user ID is required.' });
    }

    if (targetUserId === callerUserId) {
      return res.status(400).json({ error: 'Administrators cannot permanently delete their own account.' });
    }

    // Check financial transaction ledger records
    const { count: txCount, error: txError } = await adminClient
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', targetUserId);

    if (txError) {
      return res.status(500).json({ error: 'Could not verify user transaction history.' });
    }

    if (txCount && txCount > 0) {
      return res.status(400).json({
        error:
          'Cannot delete user: This account has recorded financial transactions. Permanent deletion is blocked to preserve immutable audit records. Deactivate the account instead.',
      });
    }

    const { count: performedCount, error: performedError } = await adminClient
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('performed_by', targetUserId);

    if (performedError) {
      return res.status(500).json({ error: 'Could not verify transaction audit history.' });
    }

    if (performedCount && performedCount > 0) {
      return res.status(409).json({
        error:
          'Cannot delete user: This account is recorded as the actor on transaction audit entries. Deactivate the account instead.',
      });
    }

    // Check existing investments
    const { count: invCount, error: invError } = await adminClient
      .from('investments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', targetUserId);

    if (invError) {
      return res.status(500).json({ error: 'Could not verify user investment records.' });
    }

    if (invCount && invCount > 0) {
      return res.status(400).json({
        error:
          'Cannot delete user: Active investment records exist for this user. Remove all holdings before permanent deletion.',
      });
    }

    // Delete user via Supabase Auth Admin API (cascades to profile)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);

    if (deleteError) {
      const code = 'code' in deleteError && typeof deleteError.code === 'string' ? deleteError.code : '';
      const isForeignKeyViolation = code === '23503';
      return res.status(isForeignKeyViolation ? 409 : 400).json({
        error: isForeignKeyViolation
          ? 'Cannot delete user: Their identity is still referenced by transaction audit history.'
          : deleteError.message,
      });
    }

    return res.status(200).json({ message: 'User account permanently deleted.' });
  }

  return res.status(400).json({ error: `Unsupported action '${action}'.` });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    return await handleAdminRequest(req, res);
  } catch (error) {
    console.error('[api/admin/users] Request failed:', error);
    return res.status(500).json({
      error: error instanceof Error && error.message ? error.message : 'Unexpected server error.',
    });
  }
}
