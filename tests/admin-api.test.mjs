import assert from 'node:assert/strict';
import test from 'node:test';

import { readAdminResponse } from '../src/features/admin/apiResponse.ts';

process.env.VITE_SUPABASE_URL = 'https://fintrack-test.supabase.co';
process.env.SUPABASE_URL = '';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_SERVICE_KEY = '';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';
process.env.VITE_SUPABASE_ANON_KEY = '';
process.env.SUPABASE_ANON_KEY = '';

const { default: adminUsersHandler } = await import('../api/admin/users.ts');

function createResponse() {
  return {
    statusCode: 0,
    body: undefined,
    setHeader() {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('parses a successful JSON response', async () => {
  const response = new Response(JSON.stringify({ user: { id: 'user-id' } }), { status: 201 });
  assert.deepEqual(await readAdminResponse(response), { user: { id: 'user-id' } });
});

test('surfaces the API error from a JSON failure', async () => {
  const response = new Response(JSON.stringify({ error: 'Invitation failed.' }), { status: 400 });
  await assert.rejects(readAdminResponse(response), /Invitation failed\./);
});

test('reports an empty response with local API runtime guidance', async () => {
  const response = new Response('', { status: 404 });
  await assert.rejects(readAdminResponse(response), /empty response \(HTTP 404\).*vercel dev --local/);
});

test('reports Vite-served JavaScript instead of treating it as an API response', async () => {
  const response = new Response('import { createClient } from "supabase";', {
    status: 200,
    headers: { 'Content-Type': 'text/javascript' },
  });
  await assert.rejects(readAdminResponse(response), /non-JSON response \(HTTP 200\).*vercel dev --local/);
});

test('admin endpoint returns JSON for unsupported HTTP methods', async () => {
  const response = createResponse();
  await adminUsersHandler({ method: 'GET', headers: {} }, response);
  assert.equal(response.statusCode, 405);
  assert.deepEqual(response.body, { error: 'Method Not Allowed' });
});

test('admin endpoint returns JSON when authentication is missing', async () => {
  const response = createResponse();
  await adminUsersHandler({ method: 'POST', headers: {}, body: {} }, response);
  assert.equal(response.statusCode, 401);
  assert.equal(typeof response.body.error, 'string');
  assert.ok(response.body.error.length > 0);
});

test('admin endpoint sends an invitation and returns a JSON success response', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  const invitedUser = {
    id: 'invited-user-id',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'invitee@example.test',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: 'Invited Person' },
    created_at: '2026-01-01T00:00:00.000Z',
  };

  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    requests.push({ url, init });

    if (url.pathname === '/auth/v1/user') {
      return Response.json({
        id: 'admin-user-id',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'admin@example.test',
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: {},
        created_at: '2026-01-01T00:00:00.000Z',
      });
    }

    if (url.pathname === '/rest/v1/profiles') {
      return Response.json(
        { id: 'admin-user-id', role: 'admin', is_active: true },
        { headers: { 'Content-Type': 'application/vnd.pgrst.object+json' } }
      );
    }

    if (url.pathname === '/auth/v1/invite') {
      return Response.json(invitedUser);
    }

    throw new Error(`Unexpected Supabase request: ${url.pathname}`);
  };

  try {
    const response = createResponse();
    await adminUsersHandler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer test-admin-token' },
        body: { action: 'create-user', email: ' invitee@example.test ', fullName: ' Invited Person ' },
      },
      response
    );

    const authRequest = requests.find(({ url }) => url.pathname === '/auth/v1/user');
    const invitationRequest = requests.find(({ url }) => url.pathname === '/auth/v1/invite');
    assert.equal(new Headers(authRequest.init.headers).get('authorization'), 'Bearer test-admin-token');
    assert.deepEqual(JSON.parse(invitationRequest.init.body), {
      email: 'invitee@example.test',
      data: { full_name: 'Invited Person' },
    });
    assert.equal(response.statusCode, 201);
    assert.deepEqual(response.body.user, { id: 'invited-user-id', email: 'invitee@example.test' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('admin endpoint returns 403 when profile lookup query fails', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    if (url.pathname === '/auth/v1/user') {
      return Response.json({
        id: 'admin-user-id',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'admin@example.test',
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: {},
        created_at: '2026-01-01T00:00:00.000Z',
      });
    }
    if (url.pathname === '/rest/v1/profiles') {
      throw new Error('Database connection failed');
    }
    throw new Error(`Unexpected Supabase request: ${url.pathname}`);
  };

  try {
    const response = createResponse();
    await adminUsersHandler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer test-admin-token' },
        body: { action: 'change-password', targetUserId: 'target-user-id', newPassword: 'Password1' },
      },
      response
    );
    assert.equal(response.statusCode, 403);
    assert.equal(response.body.error, 'Forbidden: Unable to verify administrator profile.');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('admin endpoint returns 403 when admin profile not found', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    if (url.pathname === '/auth/v1/user') {
      return Response.json({
        id: 'admin-user-id',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'admin@example.test',
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: {},
        created_at: '2026-01-01T00:00:00.000Z',
      });
    }
    if (url.pathname === '/rest/v1/profiles') {
      return Response.json([], { headers: { 'Content-Type': 'application/json' } });
    }
    throw new Error(`Unexpected Supabase request: ${url.pathname}`);
  };

  try {
    const response = createResponse();
    await adminUsersHandler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer test-admin-token' },
        body: { action: 'change-password', targetUserId: 'target-user-id', newPassword: 'Password1' },
      },
      response
    );
    assert.equal(response.statusCode, 403);
    assert.equal(response.body.error, 'Forbidden: Admin profile not found.');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('admin endpoint returns 403 when profile role is not admin', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    if (url.pathname === '/auth/v1/user') {
      return Response.json({
        id: 'admin-user-id',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'admin@example.test',
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: {},
        created_at: '2026-01-01T00:00:00.000Z',
      });
    }
    if (url.pathname === '/rest/v1/profiles') {
      return Response.json(
        { id: 'admin-user-id', role: 'user', is_active: true },
        { headers: { 'Content-Type': 'application/vnd.pgrst.object+json' } }
      );
    }
    throw new Error(`Unexpected Supabase request: ${url.pathname}`);
  };

  try {
    const response = createResponse();
    await adminUsersHandler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer test-admin-token' },
        body: { action: 'change-password', targetUserId: 'target-user-id', newPassword: 'Password1' },
      },
      response
    );
    assert.equal(response.statusCode, 403);
    assert.equal(response.body.error, 'Forbidden: Administrator role is required.');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('admin endpoint returns 403 when profile account is deactivated', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    if (url.pathname === '/auth/v1/user') {
      return Response.json({
        id: 'admin-user-id',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'admin@example.test',
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: {},
        created_at: '2026-01-01T00:00:00.000Z',
      });
    }
    if (url.pathname === '/rest/v1/profiles') {
      return Response.json(
        { id: 'admin-user-id', role: 'admin', is_active: false },
        { headers: { 'Content-Type': 'application/vnd.pgrst.object+json' } }
      );
    }
    throw new Error(`Unexpected Supabase request: ${url.pathname}`);
  };

  try {
    const response = createResponse();
    await adminUsersHandler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer test-admin-token' },
        body: { action: 'change-password', targetUserId: 'target-user-id', newPassword: 'Password1' },
      },
      response
    );
    assert.equal(response.statusCode, 403);
    assert.equal(response.body.error, 'Forbidden: Account is deactivated.');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
