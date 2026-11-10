import type { ZodType } from 'zod';
import type { Resolver } from 'react-hook-form';

/**
 * Zod v4 compatible resolver for React Hook Form.
 *
 * @hookform/resolvers v3.x targets Zod v3 and is incompatible with Zod v4's
 * error structure (issues[] vs errors[][]) and safeParse API. This resolver
 * uses Zod v4's safeParse() and maps ZodIssue[] into React Hook Form field
 * errors without throwing uncaught exceptions.
 */
export function zodV4Resolver<T extends Record<string, unknown>>(
  schema: ZodType<T>
): Resolver<T> {
  return async (data) => {
    const result = schema.safeParse(data);

    if (result.success) {
      return { values: result.data, errors: {} };
    }

    const fieldErrors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (!fieldErrors[path]) {
        fieldErrors[path] = { type: issue.code, message: issue.message };
      }
    }

    return { values: {}, errors: fieldErrors as any };
  };
}
