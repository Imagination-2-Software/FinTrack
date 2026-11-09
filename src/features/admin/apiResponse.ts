export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function readAdminResponse(response: Response): Promise<Record<string, unknown>> {
  const body = await response.text();
  let data: unknown;

  try {
    data = JSON.parse(body);
  } catch {
    const responseKind = body.trim() ? 'a non-JSON' : 'an empty';
    throw new Error(
      `Admin API returned ${responseKind} response (HTTP ${response.status}). ` +
      'Use "npx vercel dev --local" to run API functions locally; Vite alone serves only the frontend.'
    );
  }

  if (!isRecord(data)) {
    throw new Error(`Admin API returned an unexpected response (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(
      typeof data.error === 'string' && data.error
        ? data.error
        : `Admin API request failed with HTTP ${response.status}.`
    );
  }

  return data;
}
